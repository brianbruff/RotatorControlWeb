# RotCtl Web Interface

A web-based control interface for remote antenna rotor control via rotctld daemon, featuring an interactive 3D globe visualization.

## Features

- 3D interactive globe with beam heading visualization from IO52RN (Limerick, Ireland)
- Click on globe to set antenna azimuth
- Real-time rotor position tracking
- Manual azimuth control with input field
- Quick bearing buttons (N/E/S/W)
- Emergency stop function
- Basic authentication for security
- Automatic reconnection to rotctld

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- rotctld running on your network (default: 192.168.100.3:4533)

## Installation

1. Clone or download this repository:
```bash
git clone <repository-url>
cd rotctl-web
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The server is configured to connect to rotctld at:
- Host: `192.168.100.3`
- Port: `4533`

To change these settings, edit `server.js`:
```javascript
const ROTCTLD_HOST = '192.168.100.3';
const ROTCTLD_PORT = 4533;
```

## Authentication

Default credentials:
- Username: `admin`
- Password: `Butt!Lifters`

To change credentials, edit the basicAuth configuration in `server.js`.

## Running the Application

1. Start the server:
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Enter the authentication credentials when prompted.

## Usage

### Globe Controls
- **Click on globe**: Set antenna azimuth to clicked location
- **Scroll**: Zoom in/out
- **Drag**: Rotate globe view

### Manual Controls
- **Azimuth Input**: Enter precise azimuth value (0-360°)
- **Quick Bearings**: Click N/E/S/W buttons for cardinal directions
- **Emergency Stop**: Click red stop button or press ESC key

### Keyboard Shortcuts
- `ESC`: Emergency stop
- `Ctrl+S`: Emergency stop
- `Enter`: Submit manual azimuth (when input focused)

## Rotctld Commands Used

- `p`: Get current rotor position
- `P <azimuth> 0`: Set rotor position
- `S`: Stop rotor movement

## Status Indicators

- **Green (pulsing)**: Connected to rotctld
- **Red**: Disconnected from rotctld
- **Yellow (blinking)**: Connection error

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### Cannot connect to rotctld
- Verify rotctld is running on the specified host
- Check network connectivity
- Ensure firewall allows connection on port 4533

### Authentication fails
- Verify username and password
- Clear browser cache/cookies
- Try incognito/private browsing mode

### Globe not displaying
- Ensure JavaScript is enabled
- Check browser console for errors
- Try refreshing the page

## Technologies Used

- **Backend**: Node.js, Express
- **3D Globe**: Globe.GL (Three.js based)
- **UI Framework**: Tailwind CSS
- **Icons**: Font Awesome
- **Geospatial**: Turf.js

## License

MIT

## Support

For issues or questions, please check the rotctld documentation or ham radio forums for assistance with rotor control setup.