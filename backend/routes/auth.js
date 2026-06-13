const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const { createAccessToken, publicUser } = require('../utils/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;

        if (!username || !email || !password || !displayName) {
            return res.status(400).json({ message: 'username, email, password, and displayName are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'password must be at least 8 characters' });
        }

        const existing = await User.findOne({
            $or: [{ username }, { email: email.toLowerCase() }],
        });

        if (existing) {
            return res.status(409).json({ message: 'Email or username already exists' });
        }

        const user = await User.create({
            username,
            email: email.toLowerCase(),
            displayName,
            passwordHash: await bcrypt.hash(password, 12),
        });

        res.status(201).json({
            accessToken: createAccessToken(user),
            tokenType: 'bearer',
            user: publicUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to register user' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: (email || '').toLowerCase() });

        if (!user || !user.passwordHash || !(await bcrypt.compare(password || '', user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            accessToken: createAccessToken(user),
            tokenType: 'bearer',
            user: publicUser(user),
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to login' });
    }
});

router.get('/me', requireAuth, (req, res) => {
    res.json(publicUser(req.user));
});

module.exports = router;
