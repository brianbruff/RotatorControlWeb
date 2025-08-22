const express = require('express');
const basicAuth = require('express-basic-auth');
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

app.use(cors());
app.use(express.json());

const authUsers = {};
authUsers[process.env.AUTH_USERNAME || 'admin'] = process.env.AUTH_PASSWORD || 'password';

app.use(basicAuth({
    users: authUsers,
    challenge: true,
    realm: 'RotCtl Web Interface'
}));

app.use(express.static('public'));

function connectToRotctld() {
    if (rotctldClient) {
        rotctldClient.destroy();
    }

    rotctldClient = new net.Socket();
    
    rotctldClient.connect(ROTCTLD_PORT, ROTCTLD_HOST, () => {
        console.log(`Connected to rotctld at ${ROTCTLD_HOST}:${ROTCTLD_PORT}`);
        rotorStatus = 'connected';
        clearTimeout(connectionRetryTimeout);
        getPosition();
    });

    rotctldClient.on('data', (data) => {
        const response = data.toString().trim();
        console.log('Rotctld response:', response);
        
        const lines = response.split('\n');
        lines.forEach(line => {
            if (line.includes('RPRT')) return;
            
            const values = line.trim().split(/\s+/);
            if (values.length >= 1 && !isNaN(values[0])) {
                currentAzimuth = parseFloat(values[0]);
            }
        });
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
    if (rotorStatus === 'connected') {
        sendCommand('p').catch(console.error);
    }
}

setInterval(getPosition, 2000);

app.get('/api/status', (req, res) => {
    res.json({
        status: rotorStatus,
        currentAzimuth: currentAzimuth,
        targetAzimuth: targetAzimuth,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/azimuth', async (req, res) => {
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

app.post('/api/stop', async (req, res) => {
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