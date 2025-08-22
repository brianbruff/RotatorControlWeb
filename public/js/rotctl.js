let eventSource;
let currentStatus = {
    status: 'disconnected',
    currentAzimuth: 0,
    targetAzimuth: 0
};
let isAuthenticated = false;

async function fetchStatus() {
    try {
        const response = await fetch('/api/status', {
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const data = await response.json();
        updateStatusDisplay(data);
        currentStatus = data;
        
        updateCompass(data.currentAzimuth);
        
        // Update beam visualization if it exists
        if (typeof updateBeamVisualization === 'function') {
            updateBeamVisualization(data.currentAzimuth);
        }
        
    } catch (error) {
        console.error('Status fetch error:', error);
        updateStatusDisplay({
            status: 'error',
            currentAzimuth: currentStatus.currentAzimuth,
            targetAzimuth: currentStatus.targetAzimuth
        });
    }
}

function updateStatusDisplay(status) {
    const statusLed = document.getElementById('statusLed');
    const connectionStatus = document.getElementById('connectionStatus');
    const statusDetails = document.getElementById('statusDetails');
    const currentAzimuth = document.getElementById('currentAzimuth');
    const targetAzimuth = document.getElementById('targetAzimuth');
    
    statusLed.className = 'status-led ' + status.status;
    
    // Update authentication status if provided
    if (status.authenticated !== undefined) {
        isAuthenticated = status.authenticated;
        updateAuthUI(isAuthenticated);
    }
    
    switch(status.status) {
        case 'connected':
            connectionStatus.textContent = 'Connected';
            // Show connection details based on authentication
            statusDetails.textContent = status.connectionDetails || 
                (isAuthenticated ? 'Rotctld active at 192.168.100.3:4533' : 'Connected to backend');
            break;
        case 'disconnected':
            connectionStatus.textContent = 'Disconnected';
            statusDetails.textContent = 'Attempting to connect...';
            break;
        case 'error':
            connectionStatus.textContent = 'Connection Error';
            statusDetails.textContent = 'Check rotctld daemon';
            break;
    }
    
    currentAzimuth.textContent = Math.round(status.currentAzimuth) + '°';
    targetAzimuth.textContent = Math.round(status.targetAzimuth) + '°';
    
    // Update mobile azimuth display
    const mobileAzimuth = document.getElementById('mobileAzimuth');
    const mobileStatusLed = document.getElementById('mobileStatusLed');
    if (mobileAzimuth) {
        mobileAzimuth.textContent = Math.round(status.currentAzimuth) + '°';
    }
    if (mobileStatusLed) {
        mobileStatusLed.className = 'status-led ' + status.status;
    }
}

function updateCompass(azimuth) {
    const compassArrow = document.getElementById('compassArrow');
    const compassDegrees = document.getElementById('compassDegrees');
    
    compassArrow.style.transform = `rotate(${azimuth}deg)`;
    compassDegrees.textContent = Math.round(azimuth) + '°';
}

async function setAzimuth(azimuth) {
    try {
        const response = await fetch('/api/azimuth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ azimuth: azimuth })
        });
        
        if (!response.ok) throw new Error('Failed to set azimuth');
        
        const data = await response.json();
        console.log('Azimuth set:', data);
        
        document.getElementById('targetAzimuth').textContent = azimuth + '°';
        
        showNotification(`Setting azimuth to ${azimuth}°`, 'success');
        
    } catch (error) {
        console.error('Set azimuth error:', error);
        showNotification('Failed to set azimuth', 'error');
    }
}

async function stopRotor() {
    try {
        const response = await fetch('/api/stop', {
            method: 'POST',
            credentials: 'same-origin'
        });
        
        if (!response.ok) throw new Error('Failed to stop rotor');
        
        const data = await response.json();
        console.log('Stop command sent:', data);
        
        showNotification('Emergency stop activated', 'warning');
        
    } catch (error) {
        console.error('Stop rotor error:', error);
        showNotification('Failed to send stop command', 'error');
    }
}

function updateAuthUI(authenticated) {
    const authButton = document.getElementById('authButton');
    const authStatus = document.getElementById('authStatus');
    const authUsername = document.getElementById('authUsername');
    const manualAzimuth = document.getElementById('manualAzimuth');
    const setAzimuthBtn = document.getElementById('setAzimuthBtn');
    const stopBtn = document.getElementById('stopBtn');
    const quickBearingBtns = document.querySelectorAll('.quick-bearing');
    
    if (authenticated) {
        authButton.textContent = 'Logout';
        authButton.onclick = logout;
        authStatus.style.display = 'block';
        
        // Enable controls
        manualAzimuth.disabled = false;
        setAzimuthBtn.disabled = false;
        stopBtn.disabled = false;
        quickBearingBtns.forEach(btn => btn.disabled = false);
    } else {
        authButton.textContent = 'Login';
        authButton.onclick = () => window.location.href = '/login.html';
        authStatus.style.display = 'none';
        
        // Disable controls
        manualAzimuth.disabled = true;
        setAzimuthBtn.disabled = true;
        stopBtn.disabled = true;
        quickBearingBtns.forEach(btn => btn.disabled = true);
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth-status', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        isAuthenticated = data.authenticated;
        if (data.username) {
            document.getElementById('authUsername').textContent = `Logged in as ${data.username}`;
        }
        updateAuthUI(isAuthenticated);
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });
        if (response.ok) {
            isAuthenticated = false;
            updateAuthUI(false);
            showNotification('Logged out successfully', 'info');
            
            // Close SSE connection to prevent authentication state from being overridden
            if (eventSource) {
                eventSource.close();
            }
            
            // Reinitialize SSE after a short delay to get fresh auth state
            setTimeout(() => {
                initializeSSE();
            }, 1000);
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse`;
    
    switch(type) {
        case 'success':
            notification.className += ' bg-green-600';
            break;
        case 'error':
            notification.className += ' bg-red-600';
            break;
        case 'warning':
            notification.className += ' bg-yellow-600';
            break;
        default:
            notification.className += ' bg-blue-600';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const manualAzimuthInput = document.getElementById('manualAzimuth');
    const setAzimuthBtn = document.getElementById('setAzimuthBtn');
    const stopBtn = document.getElementById('stopBtn');
    const quickBearingBtns = document.querySelectorAll('.quick-bearing');
    
    // Check authentication status on load
    checkAuthStatus();
    
    setAzimuthBtn.addEventListener('click', () => {
        if (!isAuthenticated) {
            showNotification('Please login to control the rotator', 'warning');
            return;
        }
        const azimuth = parseFloat(manualAzimuthInput.value);
        if (!isNaN(azimuth) && azimuth >= 0 && azimuth <= 360) {
            setAzimuth(azimuth);
            updateBeamVisualization(azimuth);
        } else {
            showNotification('Please enter a valid azimuth (0-360)', 'error');
        }
    });
    
    manualAzimuthInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && isAuthenticated) {
            setAzimuthBtn.click();
        }
    });
    
    stopBtn.addEventListener('click', () => {
        if (!isAuthenticated) {
            showNotification('Please login to control the rotator', 'warning');
            return;
        }
        stopRotor();
    });
    
    quickBearingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isAuthenticated) {
                showNotification('Please login to control the rotator', 'warning');
                return;
            }
            const azimuth = parseInt(btn.dataset.azimuth);
            setAzimuth(azimuth);
            updateBeamVisualization(azimuth);
            manualAzimuthInput.value = azimuth;
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Escape' || (e.ctrlKey && e.key === 's')) && isAuthenticated) {
            e.preventDefault();
            stopRotor();
        }
    });
    
    // Initialize Server-Sent Events for real-time updates
    console.log('Initializing SSE connection...');
    initializeSSE();
    
    // Also fetch initial status as backup
    fetchStatus();
});

function initializeSSE() {
    // Close existing connection if any
    if (eventSource) {
        eventSource.close();
    }
    
    // Create new EventSource connection
    eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('SSE update received:', data);
            
            updateStatusDisplay(data);
            currentStatus = data;
            updateCompass(data.currentAzimuth);
            
            // Update beam visualization if it exists
            if (typeof updateBeamVisualization === 'function') {
                updateBeamVisualization(data.currentAzimuth);
            }
        } catch (error) {
            console.error('SSE data parse error:', error);
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        updateStatusDisplay({
            status: 'error',
            currentAzimuth: currentStatus.currentAzimuth,
            targetAzimuth: currentStatus.targetAzimuth
        });
        
        // Reconnect after 5 seconds
        setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            initializeSSE();
        }, 5000);
    };
    
    eventSource.onopen = () => {
        console.log('SSE connection established');
    };
}

window.addEventListener('beforeunload', () => {
    if (eventSource) {
        eventSource.close();
    }
});