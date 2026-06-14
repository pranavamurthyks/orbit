const express = require('express');
const Session = require('../models/Session');
const requireAuth = require('../middleware/auth');
const { ensureDemoContent } = require('../services/demoContent');
const { addLedgerEntry } = require('../services/stardustService');

const router = express.Router();

function initialsFor(name) {
    return String(name || 'SkyFolk Guest')
        .split(/\s+/)
        .map(part => part[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'SF';
}

function publicSession(session) {
    return {
        id: session._id.toString(),
        hostUserId: session.hostUserId ? session.hostUserId.toString() : null,
        hostName: session.hostName,
        status: session.status,
        title: session.title,
        place: session.place,
        time: session.timeLabel,
        seats: session.seatsLabel,
        cost: session.cost,
        fundingEnabled: Boolean(session.fundingPool?.enabled),
        fundingType: session.fundingPool?.type || '',
        fundingGoal: session.fundingPool?.goal || 0,
        fundingRaised: session.fundingPool?.raised || 0,
        fundingCurrency: session.fundingPool?.currency || 'INR',
        spendSummary: session.fundingPool?.spendSummary || '',
        desc: session.description,
        location: session.location,
        skyContext: session.skyContext,
        participants: session.participants.map(item => ({
            name: item.name,
            initials: item.initials,
            bringing: item.bringing,
        })),
    };
}

router.get('/', async (req, res) => {
    await ensureDemoContent();
    const sessions = await Session.find().sort({ createdAt: -1 }).lean();
    res.json({ sessions: sessions.map(publicSession) });
});

router.post('/', requireAuth, async (req, res) => {
    const { title, description, date, time, capacity, location, funding } = req.body;

    const session = await Session.create({
        hostUserId: req.user._id,
        hostName: req.user.displayName,
        title: title || 'Untitled skywatch',
        description: description || 'New SkyFolk community session.',
        place: location?.name || 'Location pending',
        timeLabel: date && time ? `${date}, ${time}` : 'Time pending',
        seatsLabel: capacity ? `${capacity} spots` : 'Open spots',
        capacity: capacity ? Number(capacity) : null,
        cost: 25,
        location: {
            name: location?.name || '',
            description: location?.description || '',
            lat: location?.lat ?? null,
            lng: location?.lng ?? null,
        },
        fundingPool: {
            enabled: Boolean(funding?.enabled),
            type: funding?.type || '',
            goal: Number(funding?.goal || 500),
            raised: 0,
            currency: 'INR',
        },
        participants: [
            {
                userId: req.user._id,
                name: req.user.displayName,
                initials: initialsFor(req.user.displayName),
                bringing: 'Host kit',
            },
        ],
    });

    res.status(201).json({ session: publicSession(session) });
});

router.post('/:sessionId/join', requireAuth, async (req, res) => {
    const { bringing, contributionAmount, contributionMethod } = req.body;
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (!bringing) {
        return res.status(400).json({ message: 'bringing is required' });
    }

    if (session.status === 'cancelled') {
        return res.status(409).json({ message: 'This session was cancelled' });
    }

    const alreadyJoined = session.participants.some(item => item.userId && item.userId.toString() === req.user._id.toString());
    if (alreadyJoined) {
        return res.status(409).json({ message: 'You already joined this session' });
    }

    await addLedgerEntry(req.user, -session.cost, 'Joined a community session', 'session', session._id.toString());

    const contribution = Math.max(0, Math.floor(Number(contributionAmount || 0)));
    session.participants.push({
        userId: req.user._id,
        name: req.user.displayName,
        initials: initialsFor(req.user.displayName),
        bringing,
        contributionAmount: contribution,
        contributionMethod: contributionMethod || '',
    });

    session.fundingPool.raised += contribution;
    await session.save();

    res.json({
        session: publicSession(session),
        balance: req.user.stardustBalance,
    });
});

router.post('/:sessionId/spend-summary', requireAuth, async (req, res) => {
    const { summary } = req.body;
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.hostUserId || session.hostUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the host can post a spend summary' });
    }

    session.fundingPool.spendSummary = String(summary || '').trim();
    await session.save();

    res.json({ session: publicSession(session) });
});

router.post('/:sessionId/cancel', requireAuth, async (req, res) => {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.hostUserId || session.hostUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the host can cancel this session' });
    }

    session.status = 'cancelled';
    session.fundingPool.spendSummary = session.fundingPool.raised > 0
        ? `Funding pool cancelled. Refund workflow should return ${session.fundingPool.raised} ${session.fundingPool.currency || 'INR'} to contributors.`
        : 'Session cancelled before any funding contributions were collected.';
    await session.save();

    res.json({ session: publicSession(session) });
});

module.exports = router;
