const express = require('express');
const session = require('express-session');
const net = require('net');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const ROTCTLD_HOST = process.env.ROTCTLD_HOST || '192.168.100.3';
const ROTCTLD_PORT = parseInt(process.env.ROTCTLD_PORT) || 4533;

let rotctldClient = null;
let currentAzimuth = 0;
let targetAzimuth = 0;
let rotorStatus = 'disconnected';
let connectionRetryTimeout = null;
let sseClients = [];

app.use(cors());
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'rotctl-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Authentication credentials
const authUsers = {};
authUsers[process.env.AUTH_USERNAME || 'admin'] = process.env.AUTH_PASSWORD || 'password';

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    }
    res.status(401).json({ error: 'Authentication required' });
}

// Serve static files
app.use(express.static('public'));

// Broadcast updates to all SSE clients
function broadcastUpdate() {
    sseClients = sseClients.filter(client => {
        try {
            const isAuthenticated = client.session && client.session.authenticated;
            const data = {
                status: rotorStatus,
                currentAzimuth: currentAzimuth,
                targetAzimuth: targetAzimuth,
                timestamp: new Date().toISOString(),
                authenticated: isAuthenticated,
                connectionDetails: isAuthenticated ? `Rotctld active at ${ROTCTLD_HOST}:${ROTCTLD_PORT}` : 'Connected to backend'
            };
            
            const message = `data: ${JSON.stringify(data)}\n\n`;
            client.res.write(message);
            return true;
        } catch (err) {
            return false;
        }
    });
}

function connectToRotctld() {
    if (rotctldClient) {
        rotctldClient.destroy();
    }

    rotctldClient = new net.Socket();
    
    rotctldClient.connect(ROTCTLD_PORT, ROTCTLD_HOST, () => {
        console.log(`Connected to rotctld at ${ROTCTLD_HOST}:${ROTCTLD_PORT}`);
        rotorStatus = 'connected';
        clearTimeout(connectionRetryTimeout);
        // Delay initial position request to ensure connection is stable
        setTimeout(() => {
            console.log('Requesting initial position...');
            getPosition();
        }, 500);
    });

    rotctldClient.on('data', (data) => {
        const response = data.toString().trim();
        console.log('Rotctld response:', response);
        
        const lines = response.split('\n');
        
        // Only process the first line (azimuth), ignore elevation
        if (lines.length > 0) {
            const line = lines[0];
            
            // Skip error reporting lines
            if (line.includes('RPRT')) return;
            
            // Parse azimuth value
            const values = line.trim().split(/\s+/);
            if (values.length >= 1 && !isNaN(values[0])) {
                let newAzimuth = parseFloat(values[0]);
                // Handle negative azimuth values (convert to 0-360 range)
                if (newAzimuth < 0) {
                    newAzimuth = 360 + newAzimuth;
                }
                currentAzimuth = newAzimuth;
                console.log(`Current azimuth updated: ${currentAzimuth}°`);
                
                // If we haven't set a target yet, set it to current position
                if (targetAzimuth === 0 && currentAzimuth !== 0) {
                    targetAzimuth = currentAzimuth;
                }
                
                // Broadcast the update to all SSE clients
                broadcastUpdate();
            }
        }
    });

    rotctldClient.on('error', (err) => {
        console.error('Rotctld connection error:', err);
        rotorStatus = 'error';
    });

    rotctldClient.on('close', () => {
        console.log('Rotctld connection closed');
        rotorStatus = 'disconnected';
        
        connectionRetryTimeout = setTimeout(() => {
            console.log('Attempting to reconnect to rotctld...');
            connectToRotctld();
        }, 5000);
    });
}

function sendCommand(command) {
    return new Promise((resolve, reject) => {
        if (!rotctldClient || rotorStatus !== 'connected') {
            reject(new Error('Not connected to rotctld'));
            return;
        }

        rotctldClient.write(command + '\n', (err) => {
            if (err) {
                reject(err);
            } else {
                setTimeout(() => resolve(), 100);
            }
        });
    });
}

function getPosition() {
    if (rotorStatus === 'connected' && rotctldClient) {
        sendCommand('p')
            .then(() => {
                console.log('Position request sent');
            })
            .catch(err => {
                console.error('Failed to get position:', err);
            });
    }
}

// Start polling for position updates
setInterval(getPosition, 2000);

// Server-Sent Events endpoint for real-time updates
app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    const isAuthenticated = req.session && req.session.authenticated;
    
    // Send initial data
    const initialData = {
        status: rotorStatus,
        currentAzimuth: currentAzimuth,
        targetAzimuth: targetAzimuth,
        timestamp: new Date().toISOString(),
        authenticated: isAuthenticated,
        connectionDetails: isAuthenticated ? `Rotctld active at ${ROTCTLD_HOST}:${ROTCTLD_PORT}` : 'Connected to backend'
    };
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);
    
    // Add client to list with session info
    sseClients.push({ res, session: req.session });
    
    // Remove client on disconnect
    req.on('close', () => {
        sseClients = sseClients.filter(client => client.res !== res);
    });
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (authUsers[username] && authUsers[username] === password) {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true, username });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true });
    });
});

// Check authentication status
app.get('/api/auth-status', (req, res) => {
    res.json({
        authenticated: req.session && req.session.authenticated,
        username: req.session ? req.session.username : null
    });
});

app.get('/api/status', (req, res) => {
    const isAuthenticated = req.session && req.session.authenticated;
    
    res.json({
        status: rotorStatus,
        currentAzimuth: currentAzimuth,
        targetAzimuth: targetAzimuth,
        timestamp: new Date().toISOString(),
        authenticated: isAuthenticated,
        // Hide IP address from non-authenticated users
        connectionDetails: isAuthenticated ? `Rotctld active at ${ROTCTLD_HOST}:${ROTCTLD_PORT}` : 'Connected to backend'
    });
});

app.post('/api/azimuth', requireAuth, async (req, res) => {
    const { azimuth } = req.body;
    
    if (azimuth === undefined || azimuth < 0 || azimuth > 360) {
        return res.status(400).json({ error: 'Invalid azimuth value' });
    }

    targetAzimuth = azimuth;

    try {
        await sendCommand(`P ${azimuth} 0`);
        res.json({ 
            success: true, 
            azimuth: azimuth,
            message: `Setting azimuth to ${azimuth}°` 
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to send command', 
            details: error.message 
        });
    }
});

app.post('/api/stop', requireAuth, async (req, res) => {
    try {
        await sendCommand('S');
        res.json({ 
            success: true, 
            message: 'Stop command sent' 
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to send stop command', 
            details: error.message 
        });
    }
});

app.get('/api/position', async (req, res) => {
    try {
        await sendCommand('p');
        setTimeout(() => {
            res.json({ 
                azimuth: currentAzimuth,
                elevation: 0 
            });
        }, 200);
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to get position', 
            details: error.message 
        });
    }
});

connectToRotctld();

app.listen(PORT, () => {
    console.log(`RotCtl Web Interface running on http://localhost:${PORT}`);
    console.log(`Connecting to rotctld at ${ROTCTLD_HOST}:${ROTCTLD_PORT}`);
});