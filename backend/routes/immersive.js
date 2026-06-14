const express = require('express');
const Session = require('../models/Session');
const { getSkyOverview } = require('../services/skyService');
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
        const nextVisiblePassMinutes = sky.iss.nextVisiblePassMinutes;
        const relativisticOffsetMicroseconds = sky.iss.relativisticOffsetMicroseconds;

        const missions = [
            {
                id: 'saturn',
                icon: '🪐',
                accent: '#D8B26B',
                name: 'Saturn Ring Plane',
                desc: 'Float through the ring plane to study particle structure and shadow bands.',
                mode: 'Desktop + VR',
                status: 'stable',
                tieIn: 'Use it as a calm warm-up before heavier relativity scenes.',
            },
            {
                id: 'moon',
                icon: '🌕',
                accent: '#C9CDD3',
                name: 'Apollo 11 Surface Walk',
                desc: 'Stand at Tranquility Base and look back toward Earth from the lunar surface.',
                mode: 'Desktop + VR',
                status: 'stable',
                tieIn: 'Pairs with Cosmic Passport lunar logging and moon-phase awareness.',
            },
            {
                id: 'blackhole',
                icon: '🌑',
                accent: '#FF6600',
                name: 'Black Hole Lensing',
                desc: 'See the event horizon, warped accretion disk, and relativistic jets.',
                mode: '360 mode',
                status: 'stable',
                tieIn: 'Direct physics link to the time-dilation trading game.',
            },
            {
                id: 'pulsar',
                icon: '💫',
                accent: '#88CCFF',
                name: 'Millisecond Pulsar',
                desc: 'Watch lighthouse beams sweep across the sky around a spinning neutron star.',
                mode: 'Desktop + VR',
                status: 'stable',
                tieIn: 'Explains why neutron-star gravity wells matter in the game routes.',
            },
            {
                id: 'earthiss',
                icon: '🛰️',
                accent: '#5EE6D9',
                name: 'Earth Orbit: ISS Overlook',
                desc: 'Hover above Earth and watch the ISS cut across the limb in low orbit.',
                mode: 'Phone + desktop',
                status: 'live',
                tieIn: 'Uses the same live-station framing as Your Sky Tonight and watch parties.',
            },
            {
                id: 'solarsystem',
                icon: '🌌',
                accent: '#FDB813',
                name: 'Solar System Flythrough',
                desc: 'Use a scaled orbital model to give players context for distance and pacing.',
                mode: 'Desktop + VR',
                status: 'stable',
                tieIn: 'Good primer before trend-market forecasting and orbital infrastructure charts.',
            },
            {
                id: 'supernova',
                icon: '✨',
                accent: '#FF8F7A',
                name: 'Supernova Timeline',
                desc: 'Scrub through a stellar explosion as the shock front expands into the surrounding medium.',
                mode: 'Desktop + VR',
                status: 'beta',
                tieIn: 'Turns astronomy literacy into an inspectable visual moment, not just a stat line.',
            },
            {
                id: 'cme',
                icon: '☀️',
                accent: '#F0A060',
                name: 'Solar Flare and CME Corridor',
                desc: 'Track a coronal mass ejection leaving the Sun and moving toward Earth.',
                mode: 'Desktop + VR',
                status: 'beta',
                tieIn: 'Connects space-weather volatility to solar trend markets and ISS operations.',
            },
        ];

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
            highlights: [
                {
                    label: 'Shared watch party',
                    value: watchPartyCount > 0 ? `${watchPartyCount} nearby` : 'No nearby hosts',
                    detail: nextVisiblePassMinutes
                        ? `The next bright ISS-style shared moment is in about ${nextVisiblePassMinutes} minutes.`
                        : 'No visible ISS-style pass is confirmed in the next 24 hours for this observer baseline.',
                },
                {
                    label: 'Solar weather',
                    value: `Kp ${spaceWeather.geomagneticKp.toFixed(1)} · ${spaceWeather.xrayFluxClass}`,
                    detail: `Sunspot number ${spaceWeather.latestSunspotNumber.toFixed(1)}, F10.7 ${spaceWeather.latestF107.toFixed(1)}, ${spaceWeather.auroraBand}.`,
                },
                {
                    label: 'CME corridor',
                    value: `${spaceWeather.cmeTravelDays} day transit`,
                    detail: `At about ${spaceWeather.solarWindSpeedKmS} km/s, Sun-to-Earth plasma would take roughly ${spaceWeather.cmeTravelDays} days. Source: ${spaceWeather.source}.`,
                },
            ],
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
