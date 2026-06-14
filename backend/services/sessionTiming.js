const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function distanceKm(lat1, lng1, lat2, lng2) {
    const DEG = Math.PI / 180;
    const R = 6371;
    const dLat = (lat2 - lat1) * DEG;
    const dLng = (lng2 - lng1) * DEG;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseClockTime(value) {
    const label = String(value || '').trim();
    if (!label) {
        return null;
    }

    const amPmMatch = label.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (amPmMatch) {
        let hours = Number(amPmMatch[1]) % 12;
        const minutes = Number(amPmMatch[2] || 0);
        if (amPmMatch[3].toUpperCase() === 'PM') {
            hours += 12;
        }
        return { hours, minutes };
    }

    const twentyFourHourMatch = label.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        return {
            hours: Number(twentyFourHourMatch[1]),
            minutes: Number(twentyFourHourMatch[2]),
        };
    }

    return null;
}

function buildSessionStart(dateValue, timeValue) {
    const day = new Date(`${String(dateValue || '').trim()}T00:00:00`);
    const clock = parseClockTime(timeValue);
    if (Number.isNaN(day.getTime()) || !clock) {
        return null;
    }

    day.setHours(clock.hours, clock.minutes, 0, 0);
    return day;
}

function nextOccurrenceOfWeekday(dayIndex, clock, now) {
    const start = new Date(now);
    start.setHours(clock.hours, clock.minutes, 0, 0);

    const daysAhead = (dayIndex - start.getDay() + 7) % 7;
    start.setDate(start.getDate() + daysAhead);

    if (daysAhead === 0 && start.getTime() <= now.getTime()) {
        start.setDate(start.getDate() + 7);
    }

    return start;
}

function inferSessionStart(timeLabel, now = new Date()) {
    const label = String(timeLabel || '').trim();
    if (!label) {
        return null;
    }

    const weekdayMatch = label.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*,\s*(.+)$/i);
    if (weekdayMatch) {
        const weekdayIndex = WEEKDAYS.findIndex((item) => item.toLowerCase() === weekdayMatch[1].toLowerCase());
        const clock = parseClockTime(weekdayMatch[2]);
        if (weekdayIndex >= 0 && clock) {
            return nextOccurrenceOfWeekday(weekdayIndex, clock, now);
        }
    }

    const relativeMatch = label.match(/^(Tonight|Today|Tomorrow)\s*,\s*(.+)$/i);
    if (relativeMatch) {
        const clock = parseClockTime(relativeMatch[2]);
        if (!clock) {
            return null;
        }

        const start = new Date(now);
        start.setHours(clock.hours, clock.minutes, 0, 0);
        const token = relativeMatch[1].toLowerCase();

        if (token === 'tomorrow') {
            start.setDate(start.getDate() + 1);
            return start;
        }

        if (start.getTime() <= now.getTime()) {
            start.setDate(start.getDate() + 1);
        }
        return start;
    }

    const parsed = new Date(label);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveSessionStart(session, now = new Date()) {
    if (session?.startsAt) {
        const parsed = new Date(session.startsAt);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return inferSessionStart(session?.timeLabel, now);
}

function countWatchPartyParticipants({
    sessions,
    observerLat,
    observerLng,
    passTime,
    radiusKm = 250,
    windowMinutes = 90,
    now = new Date(),
}) {
    if (!(passTime instanceof Date) || Number.isNaN(passTime.getTime())) {
        return 0;
    }

    const windowMs = windowMinutes * 60000;

    return (Array.isArray(sessions) ? sessions : []).reduce((sum, session) => {
        if (session?.status && session.status !== 'scheduled') {
            return sum;
        }

        if (typeof session.location?.lat !== 'number' || typeof session.location?.lng !== 'number') {
            return sum;
        }

        if (distanceKm(observerLat, observerLng, session.location.lat, session.location.lng) > radiusKm) {
            return sum;
        }

        const sessionStart = resolveSessionStart(session, now);
        if (!sessionStart || Math.abs(sessionStart.getTime() - passTime.getTime()) > windowMs) {
            return sum;
        }

        return sum + (Array.isArray(session.participants) ? session.participants.length : 0);
    }, 0);
}

module.exports = {
    buildSessionStart,
    countWatchPartyParticipants,
    inferSessionStart,
    resolveSessionStart,
};
