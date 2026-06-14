function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function mean(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundMarketValue(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.abs(value) >= 100 ? Math.round(value) : Number(value.toFixed(1));
}

function stepYearsFor(market) {
    if (Number(market?.stepYears) > 0) {
        return Number(market.stepYears);
    }
    return market?.key === 'solar' ? 1 / 12 : 1;
}

function recentDiffs(values) {
    const diffs = [];
    for (let index = 1; index < values.length; index += 1) {
        diffs.push(values[index] - values[index - 1]);
    }
    return diffs.slice(-3);
}

function annualizedTrend(values, stepYears) {
    const diffs = recentDiffs(values);
    if (!diffs.length || stepYears <= 0) return 0;
    return mean(diffs) / stepYears;
}

function annualizedVolatility(values, stepYears) {
    if (values.length < 2 || stepYears <= 0) return 0.04;

    const pctDiffs = [];
    for (let index = 1; index < values.length; index += 1) {
        const previous = Math.max(1, Math.abs(values[index - 1]));
        pctDiffs.push(Math.abs((values[index] - values[index - 1]) / previous) / stepYears);
    }

    const recent = pctDiffs.slice(-3);
    return mean(recent);
}

function classifyBucket(changePct, bandPct) {
    if (changePct < -bandPct) return 0;
    if (changePct > bandPct) return 2;
    return 1;
}

function buildResolutionSummary(market, homeYears, annualTrend, changePct, resolvedBucket) {
    const direction = annualTrend > 0
        ? 'uptrend'
        : annualTrend < 0
            ? 'downtrend'
            : 'flat trend';
    const bucketLabel = resolvedBucket === 0
        ? 'below recent trend'
        : resolvedBucket === 2
            ? 'above recent trend'
            : 'close to recent trend';
    const signedChange = `${changePct >= 0 ? '+' : ''}${(changePct * 100).toFixed(1)}%`;

    return `${market.title} resolved ${bucketLabel} after ${Number(homeYears || 0).toFixed(2)} home years, following a recent ${direction} of ${roundMarketValue(annualTrend)} ${market.unit || 'units'} per year (${signedChange} from launch).`;
}

function resolvePrediction({ market, prediction, sharedPools, homeYears }) {
    const values = (Array.isArray(market?.trend) ? market.trend : [])
        .map(value => Number(value))
        .filter(Number.isFinite);
    const baselineValue = values.length ? values[values.length - 1] : 0;
    const stepYears = stepYearsFor(market);
    const safeHomeYears = clamp(Number(homeYears || 0), 0, 6);
    const trendPerYear = annualizedTrend(values, stepYears);
    const volatility = annualizedVolatility(values, stepYears);
    const damping = 1 - Math.min(0.28, safeHomeYears * 0.04);
    const actualValue = Math.max(0, baselineValue + (trendPerYear * safeHomeYears * damping));
    const changePct = baselineValue > 0 ? (actualValue - baselineValue) / baselineValue : 0;
    const resolutionBandPct = clamp(
        Math.max(0.04, volatility * Math.sqrt(Math.max(stepYears, safeHomeYears || stepYears)) * 0.75),
        0.04,
        0.2
    );
    const resolvedBucket = classifyBucket(changePct, resolutionBandPct);
    const totalPool = sharedPools.reduce((sum, value) => sum + value, 0);
    const winningPool = sharedPools[resolvedBucket] || 0;
    const multiplier = Math.min(4.2, Math.max(1.15, totalPool / Math.max(1, winningPool)));
    const won = Number(prediction.pick) === resolvedBucket;
    const payout = won ? Math.round(Number(prediction.stake || 0) * multiplier) : 0;

    return {
        marketKey: market.key,
        pick: Number(prediction.pick),
        resolvedBucket,
        stake: Number(prediction.stake || 0),
        payout,
        won,
        actualValue: roundMarketValue(actualValue),
        baselineValue: roundMarketValue(baselineValue),
        changePct: Number((changePct * 100).toFixed(1)),
        resolutionBandPct: Number((resolutionBandPct * 100).toFixed(1)),
        resolutionSummary: buildResolutionSummary(market, safeHomeYears, trendPerYear, changePct, resolvedBucket),
    };
}

module.exports = {
    resolvePrediction,
};
