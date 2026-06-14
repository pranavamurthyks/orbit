function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-IN');
}

function formatSignedMicroseconds(value) {
    const amount = Number(value || 0);
    const sign = amount > 0 ? '+' : '';
    return `${sign}${formatNumber(amount.toFixed(0))} µs`;
}

function buildMissions({ sky, spaceWeather, watchPartyCount }) {
    const moonAltitude = Number(sky?.sky?.moonPosition?.altitudeDeg || 0);
    const moonDistanceKm = Number(sky?.sky?.moonPosition?.distanceKm || 0);
    const issSpeedKmH = Number(sky?.iss?.speedKmH || 0);
    const nextPass = Number(sky?.iss?.nextVisiblePassMinutes || 0);
    const peakElevation = Number(sky?.iss?.nextVisiblePassPeakElevationDeg || 0);
    const driftMicroseconds = Number(sky?.iss?.relativisticOffsetMicroseconds || 0);

    return [
        {
            id: 'saturn',
            icon: '🪐',
            accent: '#D8B26B',
            name: 'Saturn Ring Plane',
            desc: 'Float through the ring plane to study particle structure and shadow bands.',
            mode: 'Desktop + VR',
            status: 'physics',
            tieIn: 'Use it as a calm warm-up before heavier relativity scenes.',
            metricValue: '273,000 km ring span',
            metricDetail: 'Saturn’s main rings stretch roughly 273,000 km across while staying startlingly thin.',
            sourceLabel: 'Cassini + NASA ring geometry',
        },
        {
            id: 'moon',
            icon: '🌕',
            accent: '#C9CDD3',
            name: 'Apollo 11 Surface Walk',
            desc: 'Stand at Tranquility Base and look back toward Earth from the lunar surface.',
            mode: 'Desktop + VR',
            status: 'live',
            tieIn: 'Pairs with Cosmic Passport lunar logging and moon-phase awareness.',
            metricValue: `${sky.sky.moonPhase} • ${moonAltitude.toFixed(1)}°`,
            metricDetail: `The Moon is ${formatNumber(moonDistanceKm)} km away for this observer baseline right now.`,
            sourceLabel: 'Live SunCalc observer geometry',
        },
        {
            id: 'blackhole',
            icon: '🌑',
            accent: '#FF6600',
            name: 'Black Hole Lensing',
            desc: 'See the event horizon, warped accretion disk, and relativistic jets.',
            mode: '360 mode',
            status: 'physics',
            tieIn: 'Direct physics link to the time-dilation trading game.',
            metricValue: '42 µas shadow',
            metricDetail: 'The M87* photon ring spans about 42 microarcseconds, making lensing the star of the scene.',
            sourceLabel: 'Event Horizon Telescope results',
        },
        {
            id: 'pulsar',
            icon: '💫',
            accent: '#88CCFF',
            name: 'Millisecond Pulsar',
            desc: 'Watch lighthouse beams sweep across the sky around a spinning neutron star.',
            mode: 'Desktop + VR',
            status: 'physics',
            tieIn: 'Explains why neutron-star gravity wells matter in the game routes.',
            metricValue: '716 spins/s',
            metricDetail: 'PSR J1748-2446ad rotates once every 1.40 ms, still the fastest confirmed neutron-star spinner.',
            sourceLabel: 'ATNF pulsar catalog',
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
            metricValue: `${formatNumber(issSpeedKmH)} km/h`,
            metricDetail: sky.iss.visibleNow
                ? `The station is currently sunlit and above the horizon for this observer.`
                : nextPass
                    ? `${watchPartyCount} nearby watchers are aligned with a pass in about ${nextPass} minutes at roughly ${peakElevation.toFixed(0)}° peak elevation.`
                    : 'No bright pass is confirmed in the next 24 hours for this observer baseline.',
            sourceLabel: sky.iss.dataSource,
        },
        {
            id: 'solarsystem',
            icon: '🌌',
            accent: '#FDB813',
            name: 'Solar System Flythrough',
            desc: 'Use a scaled orbital model to give players context for distance and pacing.',
            mode: 'Desktop + VR',
            status: 'physics',
            tieIn: 'Good primer before trend-market forecasting and orbital infrastructure charts.',
            metricValue: '8 planets • 4.1 h light time',
            metricDetail: 'Sunlight reaches Earth in 8.3 minutes but takes a little over 4 hours to reach Neptune.',
            sourceLabel: 'IAU solar-system constants',
        },
        {
            id: 'supernova',
            icon: '✨',
            accent: '#FF8F7A',
            name: 'Supernova Timeline',
            desc: 'Scrub through a stellar explosion as the shock front expands into the surrounding medium.',
            mode: 'Desktop + VR',
            status: 'physics',
            tieIn: 'Turns astronomy literacy into an inspectable visual moment, not just a stat line.',
            metricValue: '10,000 km/s ejecta',
            metricDetail: 'Core-collapse supernova debris typically leaves the star at several thousand to about ten thousand km/s.',
            sourceLabel: 'Observed Type II supernova physics',
        },
        {
            id: 'cme',
            icon: '☀️',
            accent: '#F0A060',
            name: 'Solar Flare and CME Corridor',
            desc: 'Track a coronal mass ejection leaving the Sun and moving toward Earth.',
            mode: 'Desktop + VR',
            status: 'live',
            tieIn: 'Connects space-weather volatility to solar trend markets and ISS operations.',
            metricValue: `${spaceWeather.cmeTravelDays} d transit • Kp ${spaceWeather.geomagneticKp.toFixed(1)}`,
            metricDetail: `Solar wind is running near ${formatNumber(spaceWeather.solarWindSpeedKmS)} km/s with ${spaceWeather.xrayFluxClass} flare-band conditions.`,
            sourceLabel: spaceWeather.source,
        },
    ];
}

function buildHighlights({ sky, spaceWeather, watchPartyCount }) {
    const nextVisiblePassMinutes = Number(sky?.iss?.nextVisiblePassMinutes || 0);
    const driftMicroseconds = Number(sky?.iss?.relativisticOffsetMicroseconds || 0);

    return [
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
            label: 'Relativity drift',
            value: formatSignedMicroseconds(driftMicroseconds),
            detail: 'Astronauts and clocks in low orbit really do diverge from Earth time, and the trading game ties into that same effect.',
        },
    ];
}

module.exports = {
    buildHighlights,
    buildMissions,
};
