const FALLBACK_ISS_TLE = {
    name: 'ISS (ZARYA)',
    line1: '1 25544U 98067A   24153.51782528  .00016717  00000+0  30232-3 0  9993',
    line2: '2 25544  51.6393 168.8820 0004455 165.4337 307.9336 15.50085152454604',
    snapshotTag: '2024-06-01T12:25:40Z',
};

const FALLBACK_SPACE_WEATHER = {
    latestSunspotNumber: 101.4,
    latestF107: 156.8,
    solarCycle: 'rising cycle',
    trend: [112.5, 78.2, 85.9, 79.3, 101.4],
    latestTag: '2026-05',
    solarWindSpeedKmS: 468,
    geomagneticKp: 4.3,
    xrayFluxWatts: 2.8e-6,
    xrayFluxClass: 'C2.8',
    snapshotTag: '2026-06-13T18:00:00Z',
    source: 'bundled fallback snapshot',
};

module.exports = {
    FALLBACK_ISS_TLE,
    FALLBACK_SPACE_WEATHER,
};
