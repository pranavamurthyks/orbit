const SunCalc = require('suncalc');
const { getIssObservationAt } = require('./skyService');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function deg(radians) {
    return radians * 180 / Math.PI;
}

function distanceKm(lat1, lng1, lat2, lng2) {
    const DEG = Math.PI / 180;
    const R = 6371;
    const dLat = (lat2 - lat1) * DEG;
    const dLng = (lng2 - lng1) * DEG;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseObservedAt(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function computeSkyContext(date, lat, lng) {
    const sun = SunCalc.getPosition(date, lat, lng);
    const moon = SunCalc.getMoonPosition(date, lat, lng);
    return {
        sunAltitudeDeg: deg(sun.altitude),
        moonAltitudeDeg: deg(moon.altitude),
    };
}

function describeLocation(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return 'No precise location was attached.';
    return `Location was provided at ${lat.toFixed(2)}, ${lng.toFixed(2)}.`;
}

function computeDarkSkyScore({ capturedAt, lat, lng }) {
    if (!(capturedAt instanceof Date) || Number.isNaN(capturedAt.getTime())) return 0;
    if (typeof lat !== 'number' || typeof lng !== 'number') return 0;

    const { sunAltitudeDeg, moonAltitudeDeg } = computeSkyContext(capturedAt, lat, lng);
    const solarComponent = clamp((-sunAltitudeDeg - 2) / 16, 0, 1);
    const lunarPenalty = moonAltitudeDeg > 0 ? clamp(moonAltitudeDeg / 45, 0, 0.45) : 0;
    return Math.round(clamp((solarComponent - lunarPenalty) * 100, 0, 100));
}

async function buildPhotoVerificationHints({ category, capturedAt, lat, lng }) {
    const hints = [];
    if (!(capturedAt instanceof Date) || Number.isNaN(capturedAt.getTime())) {
        return { darkSkyScore: 0, verificationHints: hints };
    }

    const darkSkyScore = computeDarkSkyScore({ capturedAt, lat, lng });
    if (darkSkyScore >= 60) hints.push('dark-sky');

    if (typeof lat === 'number' && typeof lng === 'number') {
        const iss = await getIssObservationAt(capturedAt, lat, lng).catch(() => null);
        if (iss && iss.elevationDeg >= 10 && iss.sunlit) {
            hints.push('iss-pass');
        }

        const { moonAltitudeDeg } = computeSkyContext(capturedAt, lat, lng);
        if (moonAltitudeDeg >= 5) {
            hints.push('moon-visible');
        }
    }

    if (category === 'aurora') hints.push('aurora-photo');

    return {
        darkSkyScore,
        verificationHints: hints,
    };
}

async function verifyObservation({ type, title, notes, observedAt, lat, lng, proofPhoto }) {
    const checks = [];
    let score = 0;

    checks.push(describeLocation(lat, lng));
    if (observedAt) {
        checks.push(`Observed time recorded as ${observedAt.toISOString()}.`);
        score += 0.15;
    } else {
        checks.push('No machine-readable observation time was provided.');
    }

    const hasCoords = typeof lat === 'number' && typeof lng === 'number';
    if (hasCoords) {
        score += 0.15;
    }

    let skyContext = null;
    if (observedAt && hasCoords) {
        skyContext = computeSkyContext(observedAt, lat, lng);
        checks.push(`Sun altitude ${skyContext.sunAltitudeDeg.toFixed(1)}°, Moon altitude ${skyContext.moonAltitudeDeg.toFixed(1)}°.`);
    }

    if (proofPhoto) {
        score += 0.2;
        checks.push(`Photo proof attached: ${proofPhoto.title}.`);

        if (proofPhoto.capturedAt && observedAt) {
            const diffMinutes = Math.abs(new Date(proofPhoto.capturedAt).getTime() - observedAt.getTime()) / 60000;
            if (diffMinutes <= 180) {
                score += 0.18;
                checks.push(`Photo timestamp matched within ${Math.round(diffMinutes)} minutes.`);
            } else {
                checks.push(`Photo timestamp differed by about ${Math.round(diffMinutes)} minutes.`);
            }
        }

        if (
            hasCoords &&
            typeof proofPhoto.location?.lat === 'number' &&
            typeof proofPhoto.location?.lng === 'number'
        ) {
            const gapKm = distanceKm(lat, lng, proofPhoto.location.lat, proofPhoto.location.lng);
            if (gapKm <= 25) {
                score += 0.18;
                checks.push(`Photo coordinates matched within ${gapKm.toFixed(1)} km.`);
            } else {
                checks.push(`Photo coordinates were ${gapKm.toFixed(1)} km away from the claimed spot.`);
            }
        }
    }

    if (observedAt && hasCoords) {
        if (type === 'iss_pass') {
            const iss = await getIssObservationAt(observedAt, lat, lng).catch(() => null);
            if (iss && iss.elevationDeg >= 10 && iss.sunlit && skyContext.sunAltitudeDeg <= -4) {
                score += 0.5;
                checks.push(`ISS geometry matched: elevation ${iss.elevationDeg.toFixed(1)}°, azimuth ${iss.azimuthDeg.toFixed(1)}°.`);
            } else {
                checks.push('ISS geometry did not line up with a bright visible pass at the claimed time and location.');
            }
        } else if (type === 'moon') {
            if (skyContext.moonAltitudeDeg >= 5) {
                score += 0.45;
                checks.push('Moon was above the horizon at the claimed moment.');
            } else {
                checks.push('Moon was not above the horizon at the claimed moment.');
            }
        } else if (type === 'milky_way') {
            if (skyContext.sunAltitudeDeg <= -12 && skyContext.moonAltitudeDeg <= 5) {
                score += 0.45;
                checks.push('The sky was dark enough for a Milky Way observation.');
            } else {
                checks.push('The sky conditions were too bright for a strong Milky Way verification.');
            }
        } else if (type === 'meteor') {
            if (skyContext.sunAltitudeDeg <= -6) {
                score += 0.3;
                checks.push('The sky was dark enough for meteor watching.');
            } else {
                checks.push('The claimed meteor time was not dark enough for a confident verification.');
            }
        } else if (type === 'planet') {
            if (skyContext.sunAltitudeDeg <= -2) {
                score += 0.28;
                checks.push('The sky was dark enough for a bright-planet observation.');
            } else {
                checks.push('The sky was still too bright for a confident bright-planet verification.');
            }
        } else if (type === 'aurora') {
            if (skyContext.sunAltitudeDeg <= -6 && Math.abs(lat) >= 40) {
                score += 0.32;
                checks.push('Latitude and darkness were consistent with a plausible aurora sighting.');
            } else {
                checks.push('Latitude or sky brightness did not support a strong aurora verification.');
            }
        }
    }

    if (proofPhoto?.verificationHints?.includes('iss-pass') && type === 'iss_pass') {
        score += 0.18;
        checks.push('The linked photo was tagged as matching an ISS pass window.');
    }
    if (proofPhoto?.verificationHints?.includes('moon-visible') && type === 'moon') {
        score += 0.12;
        checks.push('The linked photo metadata also matched a moon-above-horizon capture.');
    }
    if (proofPhoto?.darkSkyScore >= 60 && ['milky_way', 'meteor', 'aurora'].includes(type)) {
        score += 0.12;
        checks.push(`The linked photo carried a dark-sky score of ${proofPhoto.darkSkyScore}.`);
    }

    const normalizedScore = clamp(score, 0, 1);
    const verified = normalizedScore >= 0.7;
    const stardustAwarded = verified
        ? (proofPhoto ? 30 : 20) + (type === 'iss_pass' ? 5 : 0)
        : 0;

    return {
        verified,
        stardustAwarded,
        verificationScore: Number(normalizedScore.toFixed(2)),
        verificationSummary: verified
            ? `Verified with a confidence score of ${Math.round(normalizedScore * 100)}%.`
            : `Stored as unverified. Add a photo proof, exact time, and coordinates to earn Stardust.`,
        checks,
    };
}

module.exports = {
    parseObservedAt,
    computeDarkSkyScore,
    buildPhotoVerificationHints,
    verifyObservation,
};
