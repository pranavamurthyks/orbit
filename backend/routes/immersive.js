const express = require('express');
const axios = require('axios');

const router = express.Router();

function skyVisibilityLabel(hour) {
    if (hour >= 5 && hour < 7) return 'Pre-dawn planets and ISS passes are the best targets right now.';
    if (hour >= 18 && hour < 21) return 'Early evening skywatching window is open for bright planets and the ISS.';
    if (hour >= 21 || hour < 2) return 'Dark-sky observing conditions are active for deep sky objects.';
    return 'Daylight mode. Use this time to plan tonight\'s session and track solar activity.';
}

function solarCycleLabel(dayOfYear) {
    const phase = (Math.sin((dayOfYear / 365) * Math.PI * 2) + 1) / 2;
    if (phase > 0.72) return 'stormy peak';
    if (phase > 0.42) return 'rising cycle';
    return 'quiet arc';
}

router.get('/overview', async (req, res) => {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    let issPosition = null;

    try {
        const response = await axios.get('http://api.open-notify.org/iss-now.json');
        issPosition = response.data;
    } catch {
        issPosition = {
            message: 'fallback',
            timestamp: Math.floor(Date.now() / 1000),
            iss_position: { latitude: '0.0000', longitude: '0.0000' },
        };
    }

    const nextVisiblePassMinutes = 19 + (dayOfYear % 26);
    const watchPartyCount = 180 + (dayOfYear % 140);
    const cmeTravelDays = Number((1.8 + ((dayOfYear % 9) * 0.22)).toFixed(1));
    const supernovaStageHours = 6 + (dayOfYear % 18);
    const gravitationalWaveSeconds = 0.24 + ((dayOfYear % 11) * 0.03);
    const solarCycle = solarCycleLabel(dayOfYear);
    const relativisticOffsetMicroseconds = ((Date.now() / 1000) * 0.000011).toFixed(6);

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
            cmeTravelDays,
            supernovaStageHours,
            gravitationalWaveSeconds: Number(gravitationalWaveSeconds.toFixed(2)),
            solarCycle,
            skyVisibility: skyVisibilityLabel(now.getHours()),
            orbitUnit: '1 ISS orbit = 92.7 minutes',
        },
        highlights: [
            {
                label: 'Shared watch party',
                value: `${watchPartyCount} nearby`,
                detail: `The next bright ISS-style shared moment is in about ${nextVisiblePassMinutes} minutes.`,
            },
            {
                label: 'Solar weather',
                value: `${cmeTravelDays} day transit`,
                detail: `Current space-weather framing is ${solarCycle}, useful for CME and solar-cycle demos.`,
            },
            {
                label: 'Relativity tie-in',
                value: `${relativisticOffsetMicroseconds} µs`,
                detail: 'Astronaut clocks really do diverge. That grounding should carry through the immersive stack.',
            },
        ],
        iss: issPosition,
    });
});

module.exports = router;
