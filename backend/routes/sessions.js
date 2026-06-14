const express = require('express');
const Session = require('../models/Session');
const requireAuth = require('../middleware/auth');
const { ensureDemoContent } = require('../services/demoContent');
const { buildSessionStart } = require('../services/sessionTiming');
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
        startsAt: session.startsAt,
        seats: session.seatsLabel,
        cost: session.cost,
        fundingEnabled: Boolean(session.fundingPool?.enabled),
        fundingType: session.fundingPool?.type || '',
        fundingGoal: session.fundingPool?.goal || 0,
        fundingRaised: session.fundingPool?.raised || 0,
        fundingCurrency: session.fundingPool?.currency || 'INR',
        fundingPaymentMethod: session.fundingPool?.paymentMethod || '',
        fundingPaymentHandle: session.fundingPool?.paymentHandle || '',
        fundingPaymentInstructions: session.fundingPool?.paymentInstructions || '',
        spendSummary: session.fundingPool?.spendSummary || '',
        fundingContributions: Array.isArray(session.fundingPool?.contributions)
            ? session.fundingPool.contributions.map(item => ({
                id: item._id.toString(),
                userId: item.userId ? item.userId.toString() : null,
                name: item.name,
                amount: item.amount,
                method: item.method,
                reference: item.reference,
                status: item.status,
                refundStatus: item.refundStatus,
                note: item.note,
                createdAt: item.createdAt,
            }))
            : [],
        fundingSpendItems: Array.isArray(session.fundingPool?.spendItems)
            ? session.fundingPool.spendItems.map(item => ({
                id: item._id.toString(),
                label: item.label,
                amount: item.amount,
                note: item.note,
                createdAt: item.createdAt,
            }))
            : [],
        desc: session.description,
        location: session.location,
        skyContext: session.skyContext,
        participants: Array.isArray(session.participants) ? session.participants.map(item => ({
    name: item.name,
    initials: item.initials,
    bringing: item.bringing,
})) : [],
    };
}

router.get('/', async (req, res) => {
    await ensureDemoContent();
    const sessions = await Session.find().sort({ createdAt: -1 }).lean();
    res.json({ sessions: sessions.map(publicSession) });
});

router.post('/', requireAuth, async (req, res) => {
    const { title, description, date, time, capacity, location, funding } = req.body;
    const startsAt = buildSessionStart(date, time);

    const session = await Session.create({
        hostUserId: req.user._id,
        hostName: req.user.displayName,
        title: title || 'Untitled skywatch',
        description: description || 'New SkyFolk community session.',
        place: location?.name || 'Location pending',
        timeLabel: date && time ? `${date}, ${time}` : 'Time pending',
        startsAt,
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
            paymentMethod: funding?.paymentMethod || '',
            paymentHandle: funding?.paymentHandle || '',
            paymentInstructions: funding?.paymentInstructions || '',
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
    const { bringing, contributionAmount, contributionMethod, contributionReference } = req.body;
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

    if (contribution > 0 && session.fundingPool?.enabled) {
        session.fundingPool.contributions.push({
            userId: req.user._id,
            name: req.user.displayName,
            amount: contribution,
            method: contributionMethod || session.fundingPool.paymentMethod || '',
            reference: String(contributionReference || '').trim(),
            status: 'recorded',
            refundStatus: 'not-applicable',
            note: 'Contributor joined the session and recorded a funding-pool contribution.',
        });
        session.fundingPool.raised += contribution;
    }
    await session.save();

    res.json({
        session: publicSession(session),
        balance: req.user.stardustBalance,
    });
});

router.post('/:sessionId/spend-summary', requireAuth, async (req, res) => {
    const { summary, spendItems } = req.body;
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.hostUserId || session.hostUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the host can post a spend summary' });
    }

    session.fundingPool.spendSummary = String(summary || '').trim();
    session.fundingPool.spendItems = (Array.isArray(spendItems) ? spendItems : [])
        .map(item => ({
            label: String(item.label || '').trim(),
            amount: Math.max(0, Number(item.amount || 0)),
            note: String(item.note || '').trim(),
        }))
        .filter(item => item.label && item.amount > 0);
    await session.save();

    res.json({ session: publicSession(session) });
});

router.post('/:sessionId/contribute', requireAuth, async (req, res) => {
    const { amount, method, reference, note } = req.body;
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.fundingPool?.enabled) {
        return res.status(409).json({ message: 'This session does not have an active funding pool' });
    }

    if (session.status === 'cancelled') {
        return res.status(409).json({ message: 'This session was cancelled' });
    }

    const contributionAmount = Math.max(0, Math.floor(Number(amount || 0)));
    if (contributionAmount < 1) {
        return res.status(400).json({ message: 'amount must be at least 1' });
    }

    session.fundingPool.contributions.push({
        userId: req.user._id,
        name: req.user.displayName,
        amount: contributionAmount,
        method: String(method || session.fundingPool.paymentMethod || '').trim(),
        reference: String(reference || '').trim(),
        status: 'recorded',
        refundStatus: 'not-applicable',
        note: String(note || '').trim(),
    });
    session.fundingPool.raised += contributionAmount;
    await session.save();

    res.json({ session: publicSession(session) });
});

router.post('/:sessionId/contributions/:contributionId/refund', requireAuth, async (req, res) => {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.hostUserId || session.hostUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the host can update refunds' });
    }

    const contribution = session.fundingPool?.contributions?.id(req.params.contributionId);
    if (!contribution) {
        return res.status(404).json({ message: 'Contribution not found' });
    }

    contribution.refundStatus = String(req.body.refundStatus || 'refunded').trim();
    contribution.note = String(req.body.note || contribution.note || '').trim();
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
    if (Array.isArray(session.fundingPool?.contributions)) {
        session.fundingPool.contributions.forEach((item) => {
            if (item.amount > 0) {
                item.refundStatus = 'pending';
                item.note = item.note || 'Refund should be issued because the session was cancelled.';
            }
        });
    }
    const refundNote = session.fundingPool.raised > 0
        ? `Refund workflow should return ${session.fundingPool.raised} ${session.fundingPool.currency || 'INR'} to contributors.`
        : 'Session cancelled before any funding contributions were collected.';
    const existingSummary = String(session.fundingPool.spendSummary || '').trim();
    session.fundingPool.spendSummary = existingSummary
        ? `${existingSummary}\n\nCancellation note: ${refundNote}`
        : `Funding pool cancelled. ${refundNote}`;
    await session.save();

    res.json({ session: publicSession(session) });
});

module.exports = router;
