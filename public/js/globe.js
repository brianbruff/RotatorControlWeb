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
        size: 0.5
    }];
    
    globe
        .pointsData(markerData)
        .pointLat('lat')
        .pointLng('lng')
        .pointColor('color')
        .pointAltitude(0.01)
        .pointRadius('size')
        .pointLabel(d => `<div style="text-align: center; padding: 5px; background: rgba(0, 0, 0, 0.8); border-radius: 3px;">
            <div style="font-weight: bold;">${d.label}</div>
            <div style="font-size: 0.8em;">Limerick, Ireland</div>
            <div style="font-size: 0.7em; color: #9ca3af;">QTH Location</div>
        </div>`);

    const globeMaterial = globe.globeMaterial();
    globeMaterial.opacity = 0.95;

    globe.onGlobeClick((coords) => {
        if (coords && coords.lat !== undefined && coords.lng !== undefined) {
            const azimuth = calculateAzimuth(LIMERICK_LAT, LIMERICK_LON, coords.lat, coords.lng);
            setAzimuth(azimuth);
            updateBeamVisualization(azimuth);
        }
    });

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
    
    // Reduce distance for narrower beam (2000km instead of 5000km)
    const destination = getDestinationPoint(LIMERICK_LAT, LIMERICK_LON, azimuth, 2000);
    
    const pathData = [{
        startLat: LIMERICK_LAT,
        startLng: LIMERICK_LON,
        endLat: destination.lat,
        endLng: destination.lng,
        color: ['#fbbf24', '#fde047'], // Yellow gradient
        stroke: 1.5, // Thinner stroke
        altitude: 0.05, // Lower altitude for less curve
        animateTime: 2000
    }];
    
    globe
        .arcsData(pathData)
        .arcStartLat('startLat')
        .arcStartLng('startLng')
        .arcEndLat('endLat')
        .arcEndLng('endLng')
        .arcColor('color')
        .arcStroke('stroke')
        .arcAltitudeAutoScale(0.3)
        .arcDashLength(0.5)
        .arcDashGap(0.2)
        .arcDashAnimateTime('animateTime');

    const ringData = [{
        lat: LIMERICK_LAT,
        lng: LIMERICK_LON,
        maxR: 3, // Smaller ring
        propagationSpeed: 2,
        repeatPeriod: 2000,
        color: 'rgba(251, 191, 36, 0.6)' // Yellow to match beam
    }];
    
    globe
        .ringsData(ringData)
        .ringLat('lat')
        .ringLng('lng')
        .ringMaxRadius('maxR')
        .ringPropagationSpeed('propagationSpeed')
        .ringRepeatPeriod('repeatPeriod')
        .ringColor('color');
}

document.addEventListener('DOMContentLoaded', () => {
    initGlobe();
});