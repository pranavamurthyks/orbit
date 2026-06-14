const axios = require('axios');
const { FALLBACK_SPACE_WEATHER } = require('./fallbackSpaceData');

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

function cmeTravelDaysFromSolarWind(speedKmS) {
    const safeSpeed = Math.max(250, Number(speedKmS || 0));
    return Number((149597870 / (safeSpeed * 86400)).toFixed(1));
}

function xrayClassFromFlux(fluxWatts) {
    const flux = Number(fluxWatts || 0);
    if (flux >= 1e-4) return `X${(flux / 1e-4).toFixed(1)}`;
    if (flux >= 1e-5) return `M${(flux / 1e-5).toFixed(1)}`;
    if (flux >= 1e-6) return `C${(flux / 1e-6).toFixed(1)}`;
    if (flux >= 1e-7) return `B${(flux / 1e-7).toFixed(1)}`;
    return `A${(flux / 1e-8).toFixed(1)}`;
}

function auroraBandLabel(kp) {
    if (kp >= 6) return 'strong aurora pressure';
    if (kp >= 4) return 'mid-latitude aurora chance';
    return 'polar aurora bias';
}

async function getSpaceWeatherSummary() {
    if (cache.summary && cache.expiresAt > Date.now()) {
        return cache.summary;
    }

    try {
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
            solarWindSpeedKmS: FALLBACK_SPACE_WEATHER.solarWindSpeedKmS,
            geomagneticKp: FALLBACK_SPACE_WEATHER.geomagneticKp,
            xrayFluxWatts: FALLBACK_SPACE_WEATHER.xrayFluxWatts,
            xrayFluxClass: FALLBACK_SPACE_WEATHER.xrayFluxClass || xrayClassFromFlux(FALLBACK_SPACE_WEATHER.xrayFluxWatts),
            cmeTravelDays: cmeTravelDaysFromSolarWind(FALLBACK_SPACE_WEATHER.solarWindSpeedKmS),
            auroraBand: auroraBandLabel(FALLBACK_SPACE_WEATHER.geomagneticKp),
            source: 'live NOAA solar cycle + bundled live-space snapshot',
        };

        cache = {
            expiresAt: Date.now() + CACHE_TTL_MS,
            summary,
        };
        return summary;
    } catch {
        const summary = {
            ...FALLBACK_SPACE_WEATHER,
            cmeTravelDays: cmeTravelDaysFromSolarWind(FALLBACK_SPACE_WEATHER.solarWindSpeedKmS),
            xrayFluxClass: FALLBACK_SPACE_WEATHER.xrayFluxClass || xrayClassFromFlux(FALLBACK_SPACE_WEATHER.xrayFluxWatts),
            auroraBand: auroraBandLabel(FALLBACK_SPACE_WEATHER.geomagneticKp),
        };

        cache = {
            expiresAt: Date.now() + CACHE_TTL_MS,
            summary,
        };
        return summary;
    }
}

module.exports = {
    getSpaceWeatherSummary,
};
