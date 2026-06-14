const express = require('express');
const Photo = require('../models/Photo');
const PhotoGift = require('../models/PhotoGift');
const requireAuth = require('../middleware/auth');
const { ensureDemoContent } = require('../services/demoContent');
const { addLedgerEntry } = require('../services/stardustService');
const { parseObservedAt, buildPhotoVerificationHints } = require('../services/observationVerification');

const router = express.Router();
const DEFAULT_SPOTS = [
    { name: 'Hanle, Ladakh', submissions: 12, stardust: 860, avgDarkSky: 91 },
    { name: 'Coorg Ridge', submissions: 8, stardust: 510, avgDarkSky: 76 },
    { name: 'Jaisalmer Dunes', submissions: 6, stardust: 390, avgDarkSky: 82 },
];

function initialsFor(name) {
    return String(name || 'SkyFolk Guest')
        .split(/\s+/)
        .map(part => part[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'SF';
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
    const counts = new Map();

    photos.forEach(photo => {
        const name = String(photo.locationName || '').trim() || (
            typeof photo.location?.lat === 'number' && typeof photo.location?.lng === 'number'
                ? `${photo.location.lat.toFixed(2)}, ${photo.location.lng.toFixed(2)}`
                : ''
        );
        if (!name) return;
        const existing = counts.get(name) || { name, submissions: 0, stardust: 0, darkSkyTotal: 0 };
        existing.submissions += 1;
        existing.stardust += Number(photo.stardustTotal || 0);
        existing.darkSkyTotal += Number(photo.darkSkyScore || 0);
        counts.set(name, existing);
    });

    const ranked = Array.from(counts.values())
        .map(spot => ({
            name: spot.name,
            submissions: spot.submissions,
            stardust: spot.stardust,
            avgDarkSky: Math.round(spot.darkSkyTotal / Math.max(1, spot.submissions)),
        }))
        .sort((a, b) => b.avgDarkSky - a.avgDarkSky || b.stardust - a.stardust || b.submissions - a.submissions)
        .slice(0, 3);

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
