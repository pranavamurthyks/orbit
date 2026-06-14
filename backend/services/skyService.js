const axios = require('axios');
const SunCalc = require('suncalc');
const satellite = require('satellite.js');

const ISS_CATNR = 25544;
const TLE_URL = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${ISS_CATNR}&FORMAT=TLE`;
const TLE_TTL_MS = 6 * 60 * 60 * 1000;
const MIN_VISIBLE_ELEVATION_DEG = 10;

let tleCache = {
    expiresAt: 0,
    name: 'ISS (ZARYA)',
    satrec: null,
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function kmPerHour(vector) {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2) * 3600;
}

function toCompassDegrees(radians) {
    return ((satellite.radiansToDegrees(radians) + 180) % 360 + 360) % 360;
}

function toObserver(lat, lng) {
    return {
        latitude: satellite.degreesToRadians(lat),
        longitude: satellite.degreesToRadians(lng),
        height: 0.2,
    };
}

function moonPhaseLabel(phase) {
    if (phase < 0.03 || phase > 0.97) return 'New Moon';
    if (phase < 0.22) return 'Waxing Crescent';
    if (phase < 0.28) return 'First Quarter';
    if (phase < 0.47) return 'Waxing Gibbous';
    if (phase < 0.53) return 'Full Moon';
    if (phase < 0.72) return 'Waning Gibbous';
    if (phase < 0.78) return 'Last Quarter';
    return 'Waning Crescent';
}

function skyVisibilityLabel(sunAltitudeDeg, moonAltitudeDeg) {
    if (sunAltitudeDeg > -2) {
        return 'Daylight mode. Use this time to plan tonight\'s session and track solar activity.';
    }
    if (sunAltitudeDeg > -6) {
        return 'Civil twilight is active. Bright planets and early ISS passes are the best targets.';
    }
    if (sunAltitudeDeg > -12) {
        return moonAltitudeDeg > 0
            ? 'Nautical twilight is active. The Moon is up, so bright targets will stand out best.'
            : 'Nautical twilight is active. Early deep-sky targets are starting to emerge.';
    }
    return moonAltitudeDeg > 0
        ? 'Dark-sky observing conditions are active, though moonlight will wash out the faintest objects.'
        : 'Dark-sky observing conditions are active for deep-sky objects.';
}

async function getIssSatrec() {
    if (tleCache.satrec && tleCache.expiresAt > Date.now()) {
        return tleCache;
    }

    const response = await axios.get(TLE_URL, { timeout: 8000 });
    const lines = String(response.data || '')
        .trim()
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    if (lines.length < 3) {
        throw new Error('Unable to parse ISS TLE');
    }

    const [name, line1, line2] = lines;
    tleCache = {
        expiresAt: Date.now() + TLE_TTL_MS,
        name,
        satrec: satellite.twoline2satrec(line1, line2),
    };
    return tleCache;
}

function getIssSnapshot(satrec, date, lat, lng) {
    const propagated = satellite.propagate(satrec, date);
    if (!propagated.position || !propagated.velocity) {
        return null;
    }

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(propagated.position, gmst);
    const ecf = satellite.eciToEcf(propagated.position, gmst);
    const lookAngles = satellite.ecfToLookAngles(toObserver(lat, lng), ecf);
    const sun = satellite.sunPos(satellite.jday(date));
    const shadowFraction = satellite.shadowFraction(sun.rsun, propagated.position);

    return {
        latitude: satellite.degreesLat(geodetic.latitude),
        longitude: satellite.degreesLong(geodetic.longitude),
        altitudeKm: Number(geodetic.height.toFixed(1)),
        speedKmS: Number((kmPerHour(propagated.velocity) / 3600).toFixed(2)),
        speedKmH: Math.round(kmPerHour(propagated.velocity)),
        azimuthDeg: Number(toCompassDegrees(lookAngles.azimuth).toFixed(1)),
        elevationDeg: Number(satellite.radiansToDegrees(lookAngles.elevation).toFixed(1)),
        sunlit: shadowFraction < 0.01,
    };
}

function isVisiblePass(snapshot, date, lat, lng) {
    if (!snapshot) return false;
    if (snapshot.elevationDeg < MIN_VISIBLE_ELEVATION_DEG) return false;
    if (!snapshot.sunlit) return false;

    const sunPosition = SunCalc.getPosition(date, lat, lng);
    const sunAltitudeDeg = satellite.radiansToDegrees(sunPosition.altitude);
    return sunAltitudeDeg <= -6;
}

function buildRaceWidget(speedKmS) {
    const distanceInOneMinuteKm = Math.round(speedKmS * 60);
    return {
        speedKmS,
        distanceInOneMinuteKm,
        equivalent: `About ${distanceInOneMinuteKm.toLocaleString('en-IN')} km of orbital travel every minute.`,
    };
}

async function findNextPass(lat, lng, now = new Date()) {
    const { satrec } = await getIssSatrec();

    let fallbackMinutes = null;
    for (let minute = 1; minute <= 24 * 60; minute += 1) {
        const date = new Date(now.getTime() + minute * 60000);
        const snapshot = getIssSnapshot(satrec, date, lat, lng);
        if (!snapshot) continue;

        if (fallbackMinutes === null && snapshot.elevationDeg >= MIN_VISIBLE_ELEVATION_DEG) {
            fallbackMinutes = minute;
        }

        if (isVisiblePass(snapshot, date, lat, lng)) {
            return {
                minutesUntil: minute,
                snapshot,
                visible: true,
            };
        }
    }

    return {
        minutesUntil: fallbackMinutes,
        snapshot: null,
        visible: false,
    };
}

async function getSkyOverview(lat, lng, screenTimeMinutes = 180) {
    const now = new Date();
    const { name, satrec } = await getIssSatrec();
    const currentIss = getIssSnapshot(satrec, now, lat, lng);
    if (!currentIss) {
        throw new Error('Unable to compute ISS position');
    }

    const nextPass = await findNextPass(lat, lng, now);
    const sunPosition = SunCalc.getPosition(now, lat, lng);
    const moonPosition = SunCalc.getMoonPosition(now, lat, lng);
    const moonIllumination = SunCalc.getMoonIllumination(now);
    const sunAltitudeDeg = satellite.radiansToDegrees(sunPosition.altitude);
    const moonAltitudeDeg = satellite.radiansToDegrees(moonPosition.altitude);
    const minutes = clamp(Math.round(Number(screenTimeMinutes) || 0), 0, 24 * 60);

    return {
        location: {
            lat,
            lng,
            label: `SkyFolk observer at ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
        },
        sky: {
            visibility: skyVisibilityLabel(sunAltitudeDeg, moonAltitudeDeg),
            moonPhase: moonPhaseLabel(moonIllumination.phase),
            sunStatus: sunAltitudeDeg >= 0 ? 'Sun above horizon' : `Sun ${Math.abs(sunAltitudeDeg).toFixed(1)}° below horizon`,
            orbitUnit: '1 ISS orbit = 92.7 minutes',
            sunPosition: {
                altitudeDeg: Number(sunAltitudeDeg.toFixed(1)),
                azimuthDeg: Number(toCompassDegrees(sunPosition.azimuth).toFixed(1)),
            },
            moonPosition: {
                altitudeDeg: Number(moonAltitudeDeg.toFixed(1)),
                azimuthDeg: Number(toCompassDegrees(moonPosition.azimuth).toFixed(1)),
                distanceKm: Math.round(moonPosition.distance),
            },
        },
        iss: {
            message: 'success',
            name,
            timestamp: Math.floor(now.getTime() / 1000),
            iss_position: {
                latitude: currentIss.latitude.toFixed(4),
                longitude: currentIss.longitude.toFixed(4),
            },
            altitudeKm: currentIss.altitudeKm,
            elevationDeg: currentIss.elevationDeg,
            azimuthDeg: currentIss.azimuthDeg,
            nextVisiblePassMinutes: nextPass.minutesUntil,
            visiblePassConfirmed: nextPass.visible,
            raceWidget: buildRaceWidget(currentIss.speedKmS),
            relativisticOffsetMicroseconds: ((Date.now() / 1000) * 0.000011).toFixed(6),
            speedKmH: currentIss.speedKmH,
        },
        converter: {
            screenTimeMinutes: minutes,
            equivalentIssOrbits: Number((minutes / 92.7).toFixed(2)),
            lightToMoonTrips: Math.round(minutes * 4.83),
        },
    };
}

module.exports = {
    getSkyOverview,
};
