const express = require('express');
const axios = require('axios');

const router = express.Router();

function moonPhaseLabel(date = new Date()) {
    const synodicMonth = 29.53058867;
    const knownNewMoon = new Date('2024-01-11T11:57:00Z');
    const days = (date - knownNewMoon) / 86400000;
    const phase = ((days % synodicMonth) + synodicMonth) % synodicMonth;

    if (phase < 1.8) return 'New Moon';
    if (phase < 7.4) return 'Waxing Crescent';
    if (phase < 9.2) return 'First Quarter';
    if (phase < 14.8) return 'Waxing Gibbous';
    if (phase < 16.6) return 'Full Moon';
    if (phase < 22.1) return 'Waning Gibbous';
    if (phase < 23.9) return 'Last Quarter';
    return 'Waning Crescent';
}

function skyVisibilityLabel(hour) {
    if (hour >= 5 && hour < 7) return 'Pre-dawn planets and ISS passes are the best targets right now.';
    if (hour >= 18 && hour < 21) return 'Early evening skywatching window is open for bright planets and the ISS.';
    if (hour >= 21 || hour < 2) return 'Dark-sky observing conditions are active for deep sky objects.';
    return 'Daylight mode. Use this time to plan tonight\'s session and track solar activity.';
}

router.get('/overview', async (req, res) => {
    const lat = Number(req.query.lat || 12.9716);
    const lng = Number(req.query.lng || 77.5946);
    const now = new Date();

    let iss = null;
    try {
        const response = await axios.get('http://api.open-notify.org/iss-now.json');
        iss = response.data;
    } catch {
        iss = {
            message: 'fallback',
            timestamp: Math.floor(Date.now() / 1000),
            iss_position: { latitude: '0.0000', longitude: '0.0000' },
        };
    }

    const nextPassMinutes = 18 + Math.round(Math.abs(lat + lng) % 27);
    const watchPartyCount = 120 + Math.round(Math.abs(lat * 5 + lng) % 180);
    const issSpeedKmS = 7.66;
    const relativisticOffsetMicroseconds = ((Date.now() / 1000) * 0.000011).toFixed(6);

    res.json({
        location: {
            lat,
            lng,
            label: `SkyFolk observer at ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
        },
        sky: {
            visibility: skyVisibilityLabel(now.getHours()),
            moonPhase: moonPhaseLabel(now),
            sunStatus: now.getHours() >= 6 && now.getHours() < 18 ? 'Sun above horizon' : 'Sun below horizon',
            orbitUnit: '1 ISS orbit = 92.7 minutes',
        },
        iss: {
            ...iss,
            nextVisiblePassMinutes: nextPassMinutes,
            watchPartyCount,
            raceWidget: {
                speedKmS: issSpeedKmS,
                distanceInOneMinuteKm: Math.round(issSpeedKmS * 60),
                equivalent: 'About Bengaluru to Mysuru in one minute of orbital travel.',
            },
            relativisticOffsetMicroseconds,
        },
        converter: {
            screenTimeMinutes: 180,
            equivalentIssOrbits: Number((180 / 92.7).toFixed(2)),
            lightToMoonTrips: 870,
        },
    });
});

module.exports = router;
