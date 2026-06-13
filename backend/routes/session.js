const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');

// Fetch all stargazing sessions
router.get('/', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ dateTime: 1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create a new stargazing session
router.post('/create', async (req, res) => {
    try {
        const { username, title, description, dateTime, locationName, coordinates, capacity, fundingTarget } = req.body;
        if (!username || !title || !dateTime || !locationName || !coordinates || !coordinates.lat || !coordinates.lng || !capacity) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const session = new Session({
            hostId: user._id,
            hostUsername: user.username,
            title,
            description,
            dateTime: new Date(dateTime),
            locationName,
            coordinates: {
                lat: Number(coordinates.lat),
                lng: Number(coordinates.lng)
            },
            capacity: Number(capacity),
            attendees: [user.username], // host automatically attends
            fundingPool: {
                target: Number(fundingTarget) || 0,
                current: 0,
                contributions: []
            }
        });

        await session.save();
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// RSVP to a stargazing session
router.post('/rsvp', async (req, res) => {
    try {
        const { username, sessionId } = req.body;
        if (!username || !sessionId) {
            return res.status(400).json({ message: 'Username and sessionId are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        if (session.attendees.includes(username)) {
            return res.status(400).json({ message: 'You have already RSVP\'ed to this session' });
        }

        if (session.attendees.length >= session.capacity) {
            return res.status(400).json({ message: 'Session has reached maximum capacity' });
        }

        session.attendees.push(username);
        await session.save();

        res.json({ message: 'RSVP successful!', session });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add equipment to a session checklist
router.post('/equipment', async (req, res) => {
    try {
        const { username, sessionId, item } = req.body;
        if (!username || !sessionId || !item) {
            return res.status(400).json({ message: 'Missing equipment details' });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Add equipment item
        session.equipmentList.push({ username, item });
        await session.save();

        res.json({ message: 'Equipment added to list!', session });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Contribute mockup funding to session pool
router.post('/fund', async (req, res) => {
    try {
        const { username, sessionId, amount } = req.body;
        if (!username || !sessionId || !amount || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Valid payment details required' });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const contributionAmt = Number(amount);
        session.fundingPool.current += contributionAmt;
        session.fundingPool.contributions.push({
            username,
            amount: contributionAmt
        });

        await session.save();
        res.json({ 
            message: `Successfully contributed INR ${contributionAmt} via UPI/Razorpay (Simulation)`, 
            session 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
