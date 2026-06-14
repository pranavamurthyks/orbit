const axios = require('axios');

const SOLAR_CYCLE_URL = 'https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cache = {
    expiresAt: 0,
    summary: null,
};

function solarCycleLabel(ssn) {
    if (ssn >= 140) return 'stormy peak';
    if (ssn >= 70) return 'rising cycle';
    return 'quiet arc';
}

async function getSpaceWeatherSummary() {
    if (cache.summary && cache.expiresAt > Date.now()) {
        return cache.summary;
    }

    const response = await axios.get(SOLAR_CYCLE_URL, { timeout: 8000 });
    const records = Array.isArray(response.data) ? response.data : [];
    const usable = records.filter((entry) => Number(entry.ssn) >= 0);
    const recent = usable.slice(-6);
    const latest = recent[recent.length - 1];

    if (!latest) {
        throw new Error('No solar-cycle data available');
    }

    const summary = {
        latestSunspotNumber: Number(latest.ssn || 0),
        latestF107: Number(latest['f10.7'] || 0),
        solarCycle: solarCycleLabel(Number(latest.ssn || 0)),
        trend: recent.map(entry => Number(entry.ssn || 0)),
        latestTag: latest['time-tag'],
    };

    cache = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        summary,
    };
    return summary;
}

module.exports = {
    getSpaceWeatherSummary,
};
