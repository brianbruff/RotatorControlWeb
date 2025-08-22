let statusInterval;
let currentStatus = {
    status: 'disconnected',
    currentAzimuth: 0,
    targetAzimuth: 0
};

async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const data = await response.json();
        updateStatusDisplay(data);
        currentStatus = data;
        
        updateCompass(data.currentAzimuth);
        
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
    
    switch(status.status) {
        case 'connected':
            connectionStatus.textContent = 'Connected';
            statusDetails.textContent = 'Rotctld active at 192.168.100.3:4533';
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
            method: 'POST'
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
    
    setAzimuthBtn.addEventListener('click', () => {
        const azimuth = parseFloat(manualAzimuthInput.value);
        if (!isNaN(azimuth) && azimuth >= 0 && azimuth <= 360) {
            setAzimuth(azimuth);
            updateBeamVisualization(azimuth);
        } else {
            showNotification('Please enter a valid azimuth (0-360)', 'error');
        }
    });
    
    manualAzimuthInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setAzimuthBtn.click();
        }
    });
    
    stopBtn.addEventListener('click', () => {
        stopRotor();
    });
    
    quickBearingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const azimuth = parseInt(btn.dataset.azimuth);
            setAzimuth(azimuth);
            updateBeamVisualization(azimuth);
            manualAzimuthInput.value = azimuth;
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || (e.ctrlKey && e.key === 's')) {
            e.preventDefault();
            stopRotor();
        }
    });
    
    fetchStatus();
    statusInterval = setInterval(fetchStatus, 2000);
});

window.addEventListener('beforeunload', () => {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
});