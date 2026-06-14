const express = require('express');
const requireAuth = require('../middleware/auth');
const PassportEntry = require('../models/PassportEntry');
const { addLedgerEntry } = require('../services/stardustService');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    const entries = await PassportEntry.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({
        entries: entries.map(entry => ({
            id: entry._id.toString(),
            type: entry.type,
            title: entry.title,
            notes: entry.notes,
            verified: entry.verified,
            stardustAwarded: entry.stardustAwarded,
            locationName: entry.locationName,
            observedAtLabel: entry.observedAtLabel,
            createdAt: entry.createdAt,
        })),
    });
});

router.post('/', requireAuth, async (req, res) => {
    const { type, title, notes, locationName, observedAtLabel } = req.body;
    if (!type || !title) {
        return res.status(400).json({ message: 'type and title are required' });
    }

    const entry = await PassportEntry.create({
        userId: req.user._id,
        type,
        title,
        notes: notes || '',
        locationName: locationName || 'SkyFolk field log',
        observedAtLabel: observedAtLabel || 'Tonight',
        stardustAwarded: 15,
    });

    await addLedgerEntry(req.user, entry.stardustAwarded, 'Cosmic Passport observation', 'passport', entry._id.toString());

    res.status(201).json({
        entry: {
            id: entry._id.toString(),
            type: entry.type,
            title: entry.title,
            verified: entry.verified,
            stardustAwarded: entry.stardustAwarded,
        },
        balance: req.user.stardustBalance,
    });
});

module.exports = router;
