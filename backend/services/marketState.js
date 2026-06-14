const { fetchLiveMarketDefinitions } = require('./liveMarketData');

const DEFAULT_MARKET_DEFINITIONS = [
    {
        key: 'fireballs',
        title: 'NASA-recorded fireball events',
        buckets: ['quiet streak', 'steady cadence', 'surge year'],
        trend: [29, 34, 37, 42, 46],
        blurb: 'NASA JPL fireball detections show how atmospheric entry events cluster from year to year.',
        unit: 'events',
    },
    {
        key: 'exoplanets',
        title: 'Confirmed exoplanet discoveries',
        buckets: ['cooler year', 'on-trend year', 'breakthrough spike'],
        trend: [836, 1061, 559, 434, 352],
        blurb: 'NASA Exoplanet Archive discovery counts by year reward players who understand survey cadence.',
        unit: 'discoveries',
    },
    {
        key: 'solar',
        title: 'Monthly sunspot number',
        buckets: ['quiet sun', 'on-cycle', 'stormy jump'],
        trend: [48, 63, 81, 109, 128],
        blurb: 'NOAA solar-cycle observations make the current phase of the Sun directly relevant to the market.',
        unit: 'sunspots',
    },
];

let marketDefinitions = DEFAULT_MARKET_DEFINITIONS;
let liveDefinitionsExpiresAt = 0;

const activityFeed = [];
const activeStakes = new Map();
const subscribers = new Set();
const ACTIVE_STAKE_TTL_MS = 2 * 60 * 1000;
const LIVE_MARKET_TTL_MS = 6 * 60 * 60 * 1000;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function pruneActiveStakes() {
    const cutoff = Date.now() - ACTIVE_STAKE_TTL_MS;
    let removed = false;

    for (const [userId, entry] of activeStakes.entries()) {
        if (entry.updatedAt < cutoff) {
            activeStakes.delete(userId);
            removed = true;
        }
    }

    if (removed) {
        broadcastSnapshot();
    }
}

function shortName(name) {
    const parts = String(name || 'Pilot').trim().split(/\s+/);
    return parts[0] || 'Pilot';
}

function sentimentForPools(pools) {
    const total = pools.reduce((sum, value) => sum + value, 0);
    if (!total) return 0;

    const skew = (pools[2] - pools[0]) / total;
    return Number(clamp(skew * 0.18, -0.05, 0.05).toFixed(3));
}

function getMarketDefinitions() {
    return marketDefinitions;
}

async function refreshMarketDefinitions() {
    if (liveDefinitionsExpiresAt > Date.now()) {
        return marketDefinitions;
    }

    try {
        const nextDefinitions = await fetchLiveMarketDefinitions();
        if (Array.isArray(nextDefinitions) && nextDefinitions.length) {
            marketDefinitions = nextDefinitions;
            liveDefinitionsExpiresAt = Date.now() + LIVE_MARKET_TTL_MS;
        }
    } catch {
        liveDefinitionsExpiresAt = Date.now() + 5 * 60 * 1000;
    }

    return marketDefinitions;
}

function buildPublicMarkets() {
    pruneActiveStakes();
    const definitions = getMarketDefinitions();

    const poolMap = new Map(definitions.map((market) => [
        market.key,
        market.buckets.map((_, index) => 140 + index * 45),
    ]));

    for (const entry of activeStakes.values()) {
        entry.predictions.forEach((prediction) => {
            const pools = poolMap.get(prediction.marketKey);
            if (!pools) return;
            if (!Number.isInteger(prediction.pick) || prediction.pick < 0 || prediction.pick >= pools.length) return;
            pools[prediction.pick] += prediction.stake;
        });
    }

    return definitions.map((market) => {
        const pools = poolMap.get(market.key) || market.buckets.map(() => 0);
        return {
            key: market.key,
            title: market.title,
            buckets: market.buckets,
            data: market.trend,
            blurb: market.blurb,
            unit: market.unit || 'points',
            pools,
            sentiment: sentimentForPools(pools),
        };
    });
}

function addActivity(entry) {
    activityFeed.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        ...entry,
    });
    if (activityFeed.length > 10) {
        activityFeed.length = 10;
    }
}

function getActivityFeed() {
    return activityFeed.slice(0, 6);
}

function normalizePredictions(predictions) {
    return (Array.isArray(predictions) ? predictions : [])
        .map((item) => ({
            marketKey: item.marketKey,
            pick: Number(item.pick),
            stake: Math.max(0, Math.floor(Number(item.stake || 0))),
        }))
        .filter((item) => item.marketKey && Number.isInteger(item.pick) && item.stake > 0);
}

function upsertUserStake(user, predictions, homeYears = 0) {
    const normalized = normalizePredictions(predictions);
    const userId = user._id.toString();

    if (!normalized.length) {
        if (activeStakes.has(userId)) {
            activeStakes.delete(userId);
            addActivity({
                type: 'stake-cleared',
                text: `${shortName(user.displayName)} stepped away from the market board.`,
            });
            broadcastSnapshot();
        }
        return;
    }

    activeStakes.set(userId, {
        userId,
        userLabel: shortName(user.displayName),
        predictions: normalized,
        homeYears: Number(homeYears || 0),
        updatedAt: Date.now(),
    });

    const biggest = normalized.slice().sort((a, b) => b.stake - a.stake)[0];
    const market = getMarketDefinitions().find((item) => item.key === biggest.marketKey);
    addActivity({
        type: 'stake-sync',
        text: `${shortName(user.displayName)} shifted ${biggest.stake} ✦ toward ${market ? market.title : biggest.marketKey}.`,
    });
    broadcastSnapshot();
}

function clearUserStake(userId, reasonText = '') {
    if (!activeStakes.has(userId)) return;
    activeStakes.delete(userId);

    if (reasonText) {
        addActivity({
            type: 'stake-cleared',
            text: reasonText,
        });
    }

    broadcastSnapshot();
}

function recordSettlement(user, trip, totalPayout) {
    clearUserStake(user._id.toString());
    addActivity({
        type: 'trip-resolved',
        text: `${shortName(user.displayName)} returned after ${Number(trip.homeYears || 0).toFixed(2)} home years ${totalPayout > 0 ? `with +${totalPayout} ✦` : 'without a payout'}.`,
    });
    broadcastSnapshot();
}

function currentSnapshot() {
    return {
        markets: buildPublicMarkets(),
        activity: getActivityFeed(),
        updatedAt: new Date().toISOString(),
    };
}

function addSubscriber(res) {
    subscribers.add(res);
    res.write(`data: ${JSON.stringify(currentSnapshot())}\n\n`);
}

function removeSubscriber(res) {
    subscribers.delete(res);
}

function broadcastSnapshot() {
    const payload = `data: ${JSON.stringify(currentSnapshot())}\n\n`;
    for (const res of subscribers) {
        res.write(payload);
    }
}

module.exports = {
    DEFAULT_MARKET_DEFINITIONS,
    currentSnapshot,
    buildPublicMarkets,
    getActivityFeed,
    getMarketDefinitions,
    refreshMarketDefinitions,
    upsertUserStake,
    clearUserStake,
    recordSettlement,
    addSubscriber,
    removeSubscriber,
};
