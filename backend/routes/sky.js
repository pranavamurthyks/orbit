const express = require('express');
const Session = require('../models/Session');
const { getSkyOverview } = require('../services/skyService');

const router = express.Router();

function distanceKm(lat1, lng1, lat2, lng2) {
    const DEG = Math.PI / 180;
    const R = 6371;
    const dLat = (lat2 - lat1) * DEG;
    const dLng = (lng2 - lng1) * DEG;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get('/overview', async (req, res) => {
    const lat = Number(req.query.lat || 12.9716);
    const lng = Number(req.query.lng || 77.5946);
    const screenTimeMinutes = Number(req.query.screenTimeMinutes || 180);

    try {
        const overview = await getSkyOverview(lat, lng, screenTimeMinutes);
        const sessions = await Session.find({
            status: 'scheduled',
            'location.lat': { $ne: null },
            'location.lng': { $ne: null },
        }).lean();

        const watchPartyCount = sessions.reduce((sum, session) => {
            if (typeof session.location?.lat !== 'number' || typeof session.location?.lng !== 'number') {
                return sum;
            }
            if (distanceKm(lat, lng, session.location.lat, session.location.lng) > 250) {
                return sum;
            }
            return sum + (Array.isArray(session.participants) ? session.participants.length : 0);
        }, 0);

        overview.iss.watchPartyCount = watchPartyCount;
        res.json(overview);
    } catch (error) {
        res.status(502).json({ message: error.message || 'Unable to load live sky data' });
    }
});

module.exports = router;
