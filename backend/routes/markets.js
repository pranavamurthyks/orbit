const express = require('express');
const requireAuth = require('../middleware/auth');
const optionalAuth = require('../middleware/auth').optionalAuth;
const MarketTrip = require('../models/MarketTrip');
const { addLedgerEntry } = require('../services/stardustService');
const { resolvePrediction } = require('../services/marketResolution');
const {
    currentSnapshot,
    getMarketDefinitions,
    refreshMarketDefinitions,
    upsertUserStake,
    clearUserStake,
    recordSettlement,
    addSubscriber,
    removeSubscriber,
} = require('../services/marketState');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
    await refreshMarketDefinitions();
    const trips = req.user
        ? await MarketTrip.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5).lean()
        : [];
    const snapshot = currentSnapshot();

    res.json({
        markets: snapshot.markets,
        activity: snapshot.activity,
        updatedAt: snapshot.updatedAt,
        recentTrips: trips.map(item => ({
            id: item._id.toString(),
            mode: item.mode,
            shipDays: item.shipDays,
            homeYears: item.homeYears,
            totalPayout: item.totalPayout,
            driftScore: item.driftScore,
        })),
    });
});

router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    addSubscriber(res);

    const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 15000);

    req.on('close', () => {
        clearInterval(keepAlive);
        removeSubscriber(res);
    });
});

router.post('/sync', requireAuth, async (req, res) => {
    await refreshMarketDefinitions();
    const { predictions, homeYears } = req.body;
    upsertUserStake(req.user, predictions, homeYears);
    res.json(currentSnapshot());
});

router.post('/clear', requireAuth, async (req, res) => {
    clearUserStake(req.user._id.toString(), `${req.user.displayName.split(/\s+/)[0]} reset their trip board.`);
    res.json({ ok: true });
});

router.post('/trip', requireAuth, async (req, res) => {
    await refreshMarketDefinitions();
    const { mode, shipDays, homeYears, dilationFactor, predictions } = req.body;
    const normalizedPredictions = Array.isArray(predictions) ? predictions : [];
    const totalStake = normalizedPredictions.reduce((sum, item) => sum + Number(item.stake || 0), 0);
    const marketDefinitions = getMarketDefinitions();

    if (totalStake < 1) {
        return res.status(400).json({ message: 'At least one prediction stake is required' });
    }

    upsertUserStake(req.user, normalizedPredictions, homeYears);
    const snapshot = currentSnapshot();
    const marketLookup = new Map(snapshot.markets.map((market) => [market.key, market]));

    await addLedgerEntry(req.user, -totalStake, 'Started a time-dilation trading trip', 'market-trip', null);

    const resolvedPredictions = normalizedPredictions.map((item, index) => {
        const market = marketDefinitions.find(entry => entry.key === item.marketKey) || marketDefinitions[index % marketDefinitions.length];
        const shared = marketLookup.get(market.key);
        return resolvePrediction({
            market,
            prediction: item,
            sharedPools: Array.isArray(shared?.pools) ? shared.pools : market.buckets.map(() => 0),
            homeYears,
        });
    });

    const totalPayout = resolvedPredictions.reduce((sum, item) => sum + item.payout, 0);
    const driftScore = Number(homeYears || 0) - Number(shipDays || 0) / 365.25;

    const trip = await MarketTrip.create({
        userId: req.user._id,
        mode: mode || 'speed',
        shipDays: Number(shipDays || 0),
        homeYears: Number(homeYears || 0),
        dilationFactor: Number(dilationFactor || 1),
        predictions: resolvedPredictions,
        totalStake,
        totalPayout,
        driftScore,
    });

    if (totalPayout > 0) {
        await addLedgerEntry(req.user, totalPayout, 'Resolved a successful time-dilation trading trip', 'market-trip', trip._id.toString());
    }

    recordSettlement(req.user, trip, totalPayout);

    res.status(201).json({
        trip: {
            id: trip._id.toString(),
            totalStake,
            totalPayout,
            driftScore,
            predictions: resolvedPredictions,
        },
        balance: req.user.stardustBalance,
    });
});

module.exports = router;
