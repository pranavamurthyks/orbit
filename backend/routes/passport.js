const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Sighting = require('../models/Sighting');

// Log a sky sighting (earns Stardust)
router.post('/log', async (req, res) => {
    try {
        const { username, title, type, description, coordinates } = req.body;
        if (!username || !title || !type || !coordinates || !coordinates.lat || !coordinates.lng) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate a coordinates projection to draw the constellation map (values between 10 and 90 to prevent drawing off-canvas)
        // We will project lat/lng but add some jitter based on the description length so multiple logs in the same location form separate stars
        const lat = Number(coordinates.lat);
        const lng = Number(coordinates.lng);
        
        let x = ((lng + 180) / 360) * 80 + 10; // 10 to 90 range
        let y = ((lat + 90) / 180) * 80 + 10;  // 10 to 90 range
        
        // Jitter to prevent overlapping stars
        const descLength = description ? description.length : 1;
        x += (Math.sin(descLength) * 4);
        y += (Math.cos(descLength) * 4);

        // Clamp to 10 - 90
        x = Math.max(10, Math.min(90, x));
        y = Math.max(10, Math.min(90, y));

        const reward = 100;

        const sighting = new Sighting({
            userId: user._id,
            title,
            type,
            description,
            coordinates: { lat, lng },
            constellationPoint: { x, y },
            stardustEarned: reward
        });

        await sighting.save();

        user.stardustBalance += reward;
        user.ledger.push({
            type: 'EARN',
            amount: reward,
            description: `Logged Sighting: ${type} - ${title}`
        });
        await user.save();

        res.json({
            message: `Successfully logged sighting! Earned ${reward} Stardust.`,
            sighting,
            stardustBalance: user.stardustBalance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Fetch user's constellation map
router.get('/constellation/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const sightings = await Sighting.find({ userId: user._id }).sort({ date: 1 });
        res.json(sightings);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
