const express = require('express');
const Session = require('../models/Session');
const { getSkyOverview } = require('../services/skyService');
const { countWatchPartyParticipants } = require('../services/sessionTiming');

const router = express.Router();

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

        const passTime = overview.iss.visiblePassConfirmed && overview.iss.nextVisiblePassAt
            ? new Date(overview.iss.nextVisiblePassAt)
            : null;
        const watchPartyCount = countWatchPartyParticipants({
            sessions,
            observerLat: lat,
            observerLng: lng,
            passTime,
        });

        overview.iss.watchPartyCount = watchPartyCount;
        res.json(overview);
    } catch (error) {
        res.status(502).json({ message: error.message || 'Unable to load live sky data' });
    }
});

module.exports = router;
