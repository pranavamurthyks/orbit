const express = require('express');
const Session = require('../models/Session');
const { getSkyOverview } = require('../services/skyService');
const { buildHighlights, buildMissions } = require('../services/immersiveMissions');
const { countWatchPartyParticipants } = require('../services/sessionTiming');
const { getSpaceWeatherSummary } = require('../services/spaceWeatherService');

const router = express.Router();

router.get('/overview', async (req, res) => {
    try {
        const lat = Number(req.query.lat || 12.9716);
        const lng = Number(req.query.lng || 77.5946);
        const [sky, spaceWeather, sessions] = await Promise.all([
            getSkyOverview(lat, lng, 180),
            getSpaceWeatherSummary(),
            Session.find({
                status: 'scheduled',
                'location.lat': { $ne: null },
                'location.lng': { $ne: null },
            }).lean(),
        ]);
        const passTime = sky.iss.visiblePassConfirmed && sky.iss.nextVisiblePassAt
            ? new Date(sky.iss.nextVisiblePassAt)
            : null;
        const watchPartyCount = countWatchPartyParticipants({
            sessions,
            observerLat: lat,
            observerLng: lng,
            passTime,
        });
        const missions = buildMissions({
            sky,
            spaceWeather,
            watchPartyCount,
        });
        const nextVisiblePassMinutes = sky.iss.nextVisiblePassMinutes;
        const relativisticOffsetMicroseconds = sky.iss.relativisticOffsetMicroseconds;

        res.json({
            missions,
            telemetry: {
                missionsOnline: missions.length,
                nextVisiblePassMinutes,
                watchPartyCount,
                relativisticOffsetMicroseconds,
                cmeTravelDays: spaceWeather.cmeTravelDays,
                solarCycle: spaceWeather.solarCycle,
                skyVisibility: sky.sky.visibility,
                orbitUnit: sky.sky.orbitUnit,
                latestSunspotNumber: spaceWeather.latestSunspotNumber,
                latestSolarCycleTag: spaceWeather.latestTag,
                latestF107: spaceWeather.latestF107,
                solarWindSpeedKmS: spaceWeather.solarWindSpeedKmS,
                geomagneticKp: spaceWeather.geomagneticKp,
                xrayFluxClass: spaceWeather.xrayFluxClass,
                xrayFluxWatts: spaceWeather.xrayFluxWatts,
                auroraBand: spaceWeather.auroraBand,
                spaceWeatherSource: spaceWeather.source,
            },
            highlights: buildHighlights({
                sky,
                spaceWeather,
                watchPartyCount,
            }),
            iss: {
                message: sky.iss.message,
                iss_position: sky.iss.iss_position,
                timestamp: sky.iss.timestamp,
            },
        });
    } catch (error) {
        res.status(502).json({ message: error.message || 'Unable to load immersive telemetry' });
    }
});

module.exports = router;
