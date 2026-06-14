const express = require('express');
const Photo = require('../models/Photo');
const PhotoGift = require('../models/PhotoGift');
const requireAuth = require('../middleware/auth');
const { ensureDemoContent } = require('../services/demoContent');
const { addLedgerEntry } = require('../services/stardustService');
const { parseObservedAt, buildPhotoVerificationHints } = require('../services/observationVerification');

const router = express.Router();
const DEFAULT_SPOTS = [
    {
        name: 'Hanle, Ladakh',
        submissions: 12,
        stardust: 860,
        avgDarkSky: 91,
        lat: 32.7795,
        lng: 78.9644,
        topCategory: 'galaxy',
        proofSubmissions: 8,
        communitySubmissions: 12,
        recentSubmissions: 3,
        confidence: 'high',
        lastCaptureLabel: 'Recent community night',
    },
    {
        name: 'Coorg Ridge',
        submissions: 8,
        stardust: 510,
        avgDarkSky: 76,
        lat: 12.4244,
        lng: 75.7382,
        topCategory: 'moon',
        proofSubmissions: 5,
        communitySubmissions: 8,
        recentSubmissions: 2,
        confidence: 'medium',
        lastCaptureLabel: 'Recent community night',
    },
    {
        name: 'Jaisalmer Dunes',
        submissions: 6,
        stardust: 390,
        avgDarkSky: 82,
        lat: 26.9157,
        lng: 70.9083,
        topCategory: 'milky-way',
        proofSubmissions: 4,
        communitySubmissions: 6,
        recentSubmissions: 1,
        confidence: 'medium',
        lastCaptureLabel: 'Recent community night',
    },
];

function initialsFor(name) {
    return String(name || 'SkyFolk Guest')
        .split(/\s+/)
        .map(part => part[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'SF';
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

function publicPhoto(photo) {
    return {
        id: photo._id.toString(),
        title: photo.title,
        category: photo.category,
        author: photo.authorName,
        initials: initialsFor(photo.authorName),
        stardust: photo.stardustTotal,
        communityFavorite: photo.stardustTotal >= 300,
        desc: photo.description,
        locationName: photo.locationName || '',
        cameraLabel: photo.cameraLabel || '',
        challengeTag: photo.challengeTag || '',
        date: photo.capturedAtLabel,
        capturedAt: photo.capturedAt,
        imgUrl: photo.imageUrl,
        fullUrl: photo.fullImageUrl || photo.imageUrl,
        given: false,
        sourceType: photo.sourceType,
        featured: photo.featured,
        location: photo.location || { lat: null, lng: null },
        darkSkyScore: Number(photo.darkSkyScore || 0),
        verificationHints: Array.isArray(photo.verificationHints) ? photo.verificationHints : [],
    };
}

function buildWeeklyChallenge() {
    const day = new Date().getDay();
    const challenges = [
        { title: 'Moonrise framing', tag: 'moonrise-week', prompt: 'Frame the Moon low on the horizon with buildings, trees, or ridgelines.' },
        { title: 'ISS motion streak', tag: 'iss-pass-week', prompt: 'Catch an ISS pass or bright satellite arc and log the location with your shot.' },
        { title: 'Aurora color hunt', tag: 'aurora-week', prompt: 'Upload dramatic green, red, or magenta sky color from a real atmospheric event.' },
        { title: 'Planet pairing', tag: 'planet-week', prompt: 'Photograph a bright planet with foreground context that helps beginners identify it.' },
    ];
    return challenges[day % challenges.length];
}

function buildDarkSkySpots(photos) {
    const geoClusters = [];
    const namedCounts = new Map();
    const recentCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;

    photos.forEach(photo => {
        const lat = typeof photo.location?.lat === 'number' ? photo.location.lat : null;
        const lng = typeof photo.location?.lng === 'number' ? photo.location.lng : null;
        const locationName = String(photo.locationName || '').trim();
        const stardust = Number(photo.stardustTotal || 0);
        const darkSkyScore = Number(photo.darkSkyScore || 0);
        const category = String(photo.category || '').trim();
        const capturedAt = photo.capturedAt ? new Date(photo.capturedAt) : null;
        const capturedAtMs = capturedAt && !Number.isNaN(capturedAt.getTime())
            ? capturedAt.getTime()
            : (photo.createdAt ? new Date(photo.createdAt).getTime() : 0);
        const hasProof = Boolean(
            capturedAtMs &&
            lat !== null &&
            lng !== null &&
            darkSkyScore > 0
        );
        const isRecent = capturedAtMs >= recentCutoff;
        const sourceType = String(photo.sourceType || '').trim();

        if (lat !== null && lng !== null) {
            let cluster = geoClusters.find(item => distanceKm(lat, lng, item.lat, item.lng) <= 75);
            if (!cluster) {
                cluster = {
                    lat,
                    lng,
                    submissions: 0,
                    stardust: 0,
                    darkSkyTotal: 0,
                    nameCounts: new Map(),
                    categoryCounts: new Map(),
                    proofSubmissions: 0,
                    communitySubmissions: 0,
                    recentSubmissions: 0,
                    lastCaptureMs: 0,
                };
                geoClusters.push(cluster);
            }

            cluster.lat = (cluster.lat * cluster.submissions + lat) / (cluster.submissions + 1);
            cluster.lng = (cluster.lng * cluster.submissions + lng) / (cluster.submissions + 1);
            cluster.submissions += 1;
            cluster.stardust += stardust;
            cluster.darkSkyTotal += darkSkyScore;
            if (locationName) {
                cluster.nameCounts.set(locationName, (cluster.nameCounts.get(locationName) || 0) + 1);
            }
            if (category) {
                cluster.categoryCounts.set(category, (cluster.categoryCounts.get(category) || 0) + 1);
            }
            if (hasProof) {
                cluster.proofSubmissions += 1;
            }
            if (sourceType === 'community') {
                cluster.communitySubmissions += 1;
            }
            if (isRecent) {
                cluster.recentSubmissions += 1;
            }
            cluster.lastCaptureMs = Math.max(cluster.lastCaptureMs, capturedAtMs || 0);
            return;
        }

        if (!locationName) return;
        const existing = namedCounts.get(locationName) || {
            name: locationName,
            submissions: 0,
            stardust: 0,
            darkSkyTotal: 0,
            proofSubmissions: 0,
            communitySubmissions: 0,
            recentSubmissions: 0,
            lastCaptureMs: 0,
        };
        existing.submissions += 1;
        existing.stardust += stardust;
        existing.darkSkyTotal += darkSkyScore;
        if (capturedAtMs && darkSkyScore > 0) {
            existing.proofSubmissions += 1;
        }
        if (sourceType === 'community') {
            existing.communitySubmissions += 1;
        }
        if (isRecent) {
            existing.recentSubmissions += 1;
        }
        existing.lastCaptureMs = Math.max(existing.lastCaptureMs, capturedAtMs || 0);
        namedCounts.set(locationName, existing);
    });

    function confidenceFor(spot) {
        if (spot.submissions >= 4 && spot.proofSubmissions >= 2) return 'high';
        if (spot.submissions >= 2 || spot.proofSubmissions >= 1) return 'medium';
        return 'emerging';
    }

    const geoRanked = geoClusters.map((spot) => {
        const topName = Array.from(spot.nameCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topCategory = Array.from(spot.categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        return {
            name: topName || `${spot.lat.toFixed(2)}, ${spot.lng.toFixed(2)}`,
            submissions: spot.submissions,
            stardust: spot.stardust,
            avgDarkSky: Math.round(spot.darkSkyTotal / Math.max(1, spot.submissions)),
            lat: Number(spot.lat.toFixed(4)),
            lng: Number(spot.lng.toFixed(4)),
            topCategory,
            proofSubmissions: spot.proofSubmissions,
            communitySubmissions: spot.communitySubmissions,
            recentSubmissions: spot.recentSubmissions,
            confidence: confidenceFor(spot),
            lastCaptureLabel: spot.lastCaptureMs
                ? new Date(spot.lastCaptureMs).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                : '',
        };
    });

    const namedRanked = Array.from(namedCounts.values())
        .map(spot => ({
            name: spot.name,
            submissions: spot.submissions,
            stardust: spot.stardust,
            avgDarkSky: Math.round(spot.darkSkyTotal / Math.max(1, spot.submissions)),
            lat: null,
            lng: null,
            topCategory: '',
            proofSubmissions: spot.proofSubmissions,
            communitySubmissions: spot.communitySubmissions,
            recentSubmissions: spot.recentSubmissions,
            confidence: confidenceFor(spot),
            lastCaptureLabel: spot.lastCaptureMs
                ? new Date(spot.lastCaptureMs).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                : '',
        }));

    const ranked = [...geoRanked, ...namedRanked]
        .sort((a, b) => b.avgDarkSky - a.avgDarkSky || b.stardust - a.stardust || b.submissions - a.submissions);

    if (!ranked.some(spot => spot.avgDarkSky > 0)) {
        return DEFAULT_SPOTS;
    }

    return ranked.length ? ranked : DEFAULT_SPOTS;
}

router.get('/', async (req, res) => {
    await ensureDemoContent();
    const photos = await Photo.find().sort({ featured: -1, createdAt: -1 }).lean();
    const weeklyChallenge = buildWeeklyChallenge();
    const communityFavoriteCount = photos.filter(photo => Number(photo.stardustTotal || 0) >= 300).length;

    res.json({
        photos: photos.map(publicPhoto),
        weeklyChallenge,
        darkSkySpots: buildDarkSkySpots(photos),
        communityFavoriteCount,
    });
});

router.get('/mine', requireAuth, async (req, res) => {
    const photos = await Photo.find({ authorUserId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({
        photos: photos.map(publicPhoto),
    });
});

router.post('/', requireAuth, async (req, res) => {
    const { title, category, description, imageUrl, locationName, cameraLabel, challengeTag } = req.body;
    const latitude = req.body.latitude === '' || req.body.latitude === null || req.body.latitude === undefined
        ? null
        : Number(req.body.latitude);
    const longitude = req.body.longitude === '' || req.body.longitude === null || req.body.longitude === undefined
        ? null
        : Number(req.body.longitude);
    const capturedAt = parseObservedAt(req.body.capturedAt);

    if (!title || !category || !imageUrl) {
        return res.status(400).json({ message: 'title, category, and imageUrl are required' });
    }

    if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
        return res.status(400).json({ message: 'latitude and longitude must be valid numbers when provided' });
    }

    const { darkSkyScore, verificationHints } = await buildPhotoVerificationHints({
        category,
        capturedAt,
        lat: latitude,
        lng: longitude,
        challengeTag,
    });

    const capturedAtLabel = capturedAt
        ? capturedAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Today';

    const photo = await Photo.create({
        title,
        category,
        authorName: req.user.displayName,
        authorUserId: req.user._id,
        description: description || 'Uploaded by the SkyFolk community.',
        locationName: locationName || 'SkyFolk field log',
        location: {
            lat: latitude,
            lng: longitude,
        },
        cameraLabel: cameraLabel || '',
        challengeTag: challengeTag || '',
        imageUrl,
        fullImageUrl: imageUrl,
        sourceType: 'community',
        capturedAtLabel,
        capturedAt,
        darkSkyScore,
        verificationHints,
    });

    await addLedgerEntry(req.user, 25, 'Photo upload reward', 'photo', photo._id.toString());

    res.status(201).json({
        photo: publicPhoto(photo),
        balance: req.user.stardustBalance,
    });
});

router.post('/:photoId/gift', requireAuth, async (req, res) => {
    const amount = Math.floor(Number(req.body.amount || 0));
    if (!Number.isFinite(amount) || amount < 1) {
        return res.status(400).json({ message: 'amount must be at least 1' });
    }

    const photo = await Photo.findById(req.params.photoId);
    if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
    }

    const existingGift = await PhotoGift.findOne({ photoId: photo._id, fromUserId: req.user._id });
    if (existingGift) {
        return res.status(409).json({ message: 'You already gifted this photo' });
    }

    await addLedgerEntry(req.user, -amount, 'Gifted stardust to a photo', 'photo', photo._id.toString());

    photo.stardustTotal += amount;
    photo.giftCount += 1;
    await photo.save();
    await PhotoGift.create({ photoId: photo._id, fromUserId: req.user._id, amount });

    res.json({
        photo: publicPhoto(photo),
        balance: req.user.stardustBalance,
    });
});

module.exports = router;
