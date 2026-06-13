const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
    try {
        const response = await axios.get('http://api.open-notify.org/iss-now.json');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch ISS location' });
    }
});

// Calculate next visible pass countdown deterministically
router.get('/pass-countdown', (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ message: 'lat and lng parameters are required' });
        }

        const latitude = Number(lat);
        const longitude = Number(lng);

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ message: 'Invalid latitude or longitude coordinates' });
        }

        // ISS orbital period is ~92.7 minutes (5562 seconds)
        const ORBITAL_PERIOD_SEC = 5562;
        
        // Generate a deterministic offset (in seconds) based on location coordinate hash
        // This ensures the pass prediction is stable for a given location, but different locations get different pass times
        const hash = Math.abs(Math.floor(latitude * 314.159 + longitude * 157.079));
        
        // Mock a next pass starting somewhere in the next 12 hours
        const initialPassOffsetSec = (hash % 12) * 3600 + (hash % 60) * 60;
        
        const nowMs = Date.now();
        const nowSec = Math.floor(nowMs / 1000);
        
        // Time of the "first virtual pass" in epoch seconds
        const firstPassSec = nowSec - (nowSec % (12 * 3600)) + initialPassOffsetSec;
        
        let nextPassSec = firstPassSec;
        if (nextPassSec < nowSec) {
            // Calculate how many orbital periods have elapsed since the first pass, and add one period
            const elapsed = nowSec - nextPassSec;
            const orbits = Math.floor(elapsed / ORBITAL_PERIOD_SEC) + 1;
            nextPassSec += orbits * ORBITAL_PERIOD_SEC;
        }

        const countdownSec = nextPassSec - nowSec;
        const nextPassDate = new Date(nextPassSec * 1000);

        res.json({
            lat: latitude,
            lng: longitude,
            nextPassTimestamp: nextPassDate.toISOString(),
            countdownSeconds: countdownSec,
            durationSeconds: 240 // Average visible pass is ~4 minutes
        });

    } catch (error) {
        res.status(500).json({ message: 'Failed to compute pass countdown', error: error.message });
    }
});

module.exports = router;