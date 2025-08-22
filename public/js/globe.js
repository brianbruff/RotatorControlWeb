const LIMERICK_LAT = 52.6667;
const LIMERICK_LON = -8.6333;
const GRID_SQUARE = "IO52RN";

let globe;
let currentBeamAzimuth = 0;
let beamPaths = [];

function initGlobe() {
    const globeContainer = document.getElementById('globeViz');
    
    globe = Globe()
        (globeContainer)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .showAtmosphere(true)
        .atmosphereColor('rgba(63, 101, 251, 0.5)')
        .atmosphereAltitude(0.25)
        .pointOfView({ lat: LIMERICK_LAT, lng: LIMERICK_LON, altitude: 2.5 })
        .enablePointerInteraction(true);

    const markerData = [{
        lat: LIMERICK_LAT,
        lng: LIMERICK_LON,
        label: 'IO52RN',
        color: '#fbbf24', // Yellow to match theme
        size: 0.05  // Even smaller dot - 50% of previous size
    }];
    
    globe
        .pointsData(markerData)
        .pointLat('lat')
        .pointLng('lng')
        .pointColor('color')
        .pointAltitude(0.01)
        .pointRadius('size')
        .pointResolution(12) // Lower resolution for smaller size
        .pointLabel(d => `<div style="text-align: center; padding: 5px; background: rgba(0, 0, 0, 0.8); border-radius: 3px;">
            <div style="font-weight: bold;">${d.label}</div>
            <div style="font-size: 0.8em;">Limerick, Ireland</div>
            <div style="font-size: 0.7em; color: #9ca3af;">Antenna Tower</div>
        </div>`);

    const globeMaterial = globe.globeMaterial();
    globeMaterial.opacity = 0.95;

    // Only enable click-to-set on desktop (not mobile)
    if (window.innerWidth > 768) {
        globe.onGlobeClick((coords) => {
            if (coords && coords.lat !== undefined && coords.lng !== undefined) {
                const azimuth = calculateAzimuth(LIMERICK_LAT, LIMERICK_LON, coords.lat, coords.lng);
                setAzimuth(azimuth);
                updateBeamVisualization(azimuth);
            }
        });
    }

    window.addEventListener('resize', () => {
        const width = globeContainer.offsetWidth;
        const height = globeContainer.offsetHeight;
        globe.width(width).height(height);
    });

    updateBeamVisualization(0);
}

function calculateAzimuth(lat1, lon1, lat2, lon2) {
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;
    
    const dLon = (lon2 - lon1) * toRad;
    const lat1Rad = lat1 * toRad;
    const lat2Rad = lat2 * toRad;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let azimuth = Math.atan2(y, x) * toDeg;
    
    azimuth = (azimuth + 360) % 360;
    
    return Math.round(azimuth);
}

function getDestinationPoint(lat, lon, azimuth, distance = 10000) {
    const R = 6371;
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;
    
    const lat1Rad = lat * toRad;
    const lon1Rad = lon * toRad;
    const azimuthRad = azimuth * toRad;
    const angularDistance = distance / R;
    
    const lat2Rad = Math.asin(
        Math.sin(lat1Rad) * Math.cos(angularDistance) +
        Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(azimuthRad)
    );
    
    const lon2Rad = lon1Rad + Math.atan2(
        Math.sin(azimuthRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
        Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );
    
    return {
        lat: lat2Rad * toDeg,
        lng: ((lon2Rad * toDeg + 540) % 360) - 180
    };
}

function updateBeamVisualization(azimuth) {
    currentBeamAzimuth = azimuth;
    
    // Create paths data - collection of points along the beam path
    const pathsData = [];
    
    // Beam parameters - starts at 1 degree, widens to 20 degrees over distance
    const numSegments = 50; // More segments for smoother path
    const maxDistance = 18000; // km - nearly halfway around Earth
    
    // Create left and right edge paths
    for (let edge of ['left', 'right']) {
        const pathPoints = [];
        
        for (let i = 0; i <= numSegments; i++) {
            const distance = (maxDistance / numSegments) * i;
            // Beam width increases progressively with distance
            const beamWidth = 1 + (19 * (i / numSegments)); // 1 to 20 degrees
            
            const edgeAzimuth = edge === 'left' 
                ? (azimuth - beamWidth/2 + 360) % 360
                : (azimuth + beamWidth/2) % 360;
            
            const point = getDestinationPoint(LIMERICK_LAT, LIMERICK_LON, edgeAzimuth, distance);
            pathPoints.push([point.lat, point.lng, 0.01]); // Small altitude for visibility
        }
        
        pathsData.push({
            path: pathPoints,
            color: 'rgba(251, 191, 36, 0.35)', // More visible yellow for edges
            stroke: 1.0
        });
    }
    
    // Add center line for reference
    const centerPath = [];
    for (let i = 0; i <= numSegments; i++) {
        const distance = (maxDistance / numSegments) * i;
        const point = getDestinationPoint(LIMERICK_LAT, LIMERICK_LON, azimuth, distance);
        centerPath.push([point.lat, point.lng, 0.015]);
    }
    
    pathsData.push({
        path: centerPath,
        color: 'rgba(251, 191, 36, 0.45)', // More visible center line
        stroke: 0.8
    });
    
    // Update globe with paths
    globe
        .pathsData(pathsData)
        .pathPoints('path')
        .pathColor('color')
        .pathStroke('stroke')
        .pathDashLength(0.01)
        .pathDashGap(0)
        .pathDashAnimateTime(0);

    // Remove the pulsing ring animation - no longer needed
    globe.ringsData([]);
}

document.addEventListener('DOMContentLoaded', () => {
    initGlobe();
});