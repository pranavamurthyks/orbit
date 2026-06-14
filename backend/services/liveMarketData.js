const axios = require('axios');

const EXOPLANET_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+disc_year,count(*)+as+c+from+ps+where+disc_year+is+not+null+group+by+disc_year+order+by+disc_year+desc&format=json';
const SOLAR_CYCLE_URL = 'https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json';
const FIREBALL_URL = 'https://ssd-api.jpl.nasa.gov/fireball.api?limit=500&date-min=2021-01-01';

async function fetchExoplanetMarket() {
    const response = await axios.get(EXOPLANET_URL, { timeout: 12000 });
    const rows = Array.isArray(response.data) ? response.data : [];
    const recent = rows.slice(0, 5).reverse();
    return {
        key: 'exoplanets',
        title: 'Confirmed exoplanet discoveries',
        buckets: ['cooler year', 'on-trend year', 'breakthrough spike'],
        trend: recent.map(row => Number(row.c || 0)),
        blurb: 'NASA Exoplanet Archive discovery counts by year reward players who understand survey cadence.',
        unit: 'discoveries',
        stepYears: 1,
    };
}

async function fetchSolarMarket() {
    const response = await axios.get(SOLAR_CYCLE_URL, { timeout: 12000 });
    const rows = Array.isArray(response.data) ? response.data : [];
    const recent = rows
        .filter(row => Number(row.ssn) >= 0)
        .slice(-5);

    return {
        key: 'solar',
        title: 'Monthly sunspot number',
        buckets: ['quiet sun', 'on-cycle', 'stormy jump'],
        trend: recent.map(row => Number(row.ssn || 0)),
        blurb: 'NOAA solar-cycle observations make the current phase of the Sun directly relevant to the market.',
        unit: 'sunspots',
        stepYears: 1 / 12,
    };
}

async function fetchFireballMarket() {
    const response = await axios.get(FIREBALL_URL, { timeout: 12000 });
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const currentYear = new Date().getUTCFullYear();
    const years = Array.from({ length: 5 }, (_, index) => currentYear - 4 + index);
    const counts = new Map(years.map(year => [year, 0]));

    rows.forEach((row) => {
        const year = Number(String(row[0] || '').slice(0, 4));
        if (counts.has(year)) {
            counts.set(year, counts.get(year) + 1);
        }
    });

    return {
        key: 'fireballs',
        title: 'NASA-recorded fireball events',
        buckets: ['quiet streak', 'steady cadence', 'surge year'],
        trend: years.map(year => counts.get(year) || 0),
        blurb: 'NASA JPL fireball detections show how atmospheric entry events cluster from year to year.',
        unit: 'events',
        stepYears: 1,
    };
}

async function fetchLiveMarketDefinitions() {
    const [fireballs, exoplanets, solar] = await Promise.all([
        fetchFireballMarket(),
        fetchExoplanetMarket(),
        fetchSolarMarket(),
    ]);

    return [fireballs, exoplanets, solar];
}

module.exports = {
    fetchLiveMarketDefinitions,
};
