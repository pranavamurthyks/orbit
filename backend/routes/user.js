const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register or log in a user
router.post('/register', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        let user = await User.findOne({ username: username.trim() });
        if (!user) {
            user = new User({
                username: username.trim(),
                stardustBalance: 500,
                ledger: [{
                    type: 'EARN',
                    amount: 500,
                    description: 'Cosmic welcome bonus!'
                }]
            });
            await user.save();
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user profile
router.get('/profile/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Daily engagement streak check-in
router.post('/streak', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const now = new Date();
        const lastActive = new Date(user.lastActive);
        
        // Helper to get start of day in UTC
        const getStartOfDayUTC = (date) => {
            const d = new Date(date);
            d.setUTCHours(0, 0, 0, 0);
            return d;
        };

        const startNow = getStartOfDayUTC(now);
        const startLast = getStartOfDayUTC(lastActive);
        const diffMs = startNow - startLast;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let reward = 50;
        let streakMessage = '';

        if (diffDays === 0) {
            // Already claimed today
            return res.status(400).json({ 
                message: 'Daily streak already claimed for today!',
                stardustBalance: user.stardustBalance,
                dailyStreak: user.dailyStreak
            });
        } else if (diffDays === 1) {
            // Streak continued on consecutive day
            user.dailyStreak += 1;
            // Reward increases with streak up to 150 stardust
            reward = Math.min(50 + (user.dailyStreak * 10), 150);
            streakMessage = `Streak day ${user.dailyStreak}! Earned ${reward} Stardust.`;
        } else {
            // Streak broken (missed a day), reset
            user.dailyStreak = 1;
            reward = 50;
            streakMessage = 'Streak reset to 1 day. Earned 50 Stardust.';
        }

        user.stardustBalance += reward;
        user.ledger.push({
            type: 'EARN',
            amount: reward,
            description: streakMessage
        });
        user.lastActive = now;

        await user.save();
        res.json({
            message: streakMessage,
            stardustBalance: user.stardustBalance,
            dailyStreak: user.dailyStreak,
            ledger: user.ledger
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
