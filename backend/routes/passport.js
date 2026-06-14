const express = require('express');
const requireAuth = require('../middleware/auth');
const PassportEntry = require('../models/PassportEntry');
const Photo = require('../models/Photo');
const { addLedgerEntry } = require('../services/stardustService');
const { parseObservedAt, verifyObservation } = require('../services/observationVerification');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    const entries = await PassportEntry.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({
        entries: entries.map(entry => ({
            id: entry._id.toString(),
            type: entry.type,
            title: entry.title,
            notes: entry.notes,
            verified: entry.verified,
            stardustAwarded: entry.stardustAwarded,
            locationName: entry.locationName,
            location: entry.location || { lat: null, lng: null },
            observedAt: entry.observedAt,
            observedAtLabel: entry.observedAtLabel,
            proofPhotoId: entry.proofPhotoId ? entry.proofPhotoId.toString() : null,
            verificationSummary: entry.verificationSummary || '',
            verificationTier: entry.verificationTier || 'unverified',
            verificationScore: Number(entry.verificationScore || 0),
            verificationChecks: Array.isArray(entry.verificationChecks) ? entry.verificationChecks : [],
            createdAt: entry.createdAt,
        })),
    });
});

router.post('/', requireAuth, async (req, res) => {
    const { type, title, notes, locationName, observedAtLabel, proofPhotoId } = req.body;
    const latitude = req.body.latitude === '' || req.body.latitude === null || req.body.latitude === undefined
        ? null
        : Number(req.body.latitude);
    const longitude = req.body.longitude === '' || req.body.longitude === null || req.body.longitude === undefined
        ? null
        : Number(req.body.longitude);
    const observedAt = parseObservedAt(req.body.observedAt);
    if (!type || !title) {
        return res.status(400).json({ message: 'type and title are required' });
    }

    if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
        return res.status(400).json({ message: 'latitude and longitude must be valid numbers when provided' });
    }

    let proofPhoto = null;
    if (proofPhotoId) {
        proofPhoto = await Photo.findOne({ _id: proofPhotoId, authorUserId: req.user._id }).lean();
        if (!proofPhoto) {
            return res.status(404).json({ message: 'Proof photo not found in your gallery' });
        }
    }

    const verification = await verifyObservation({
        type,
        title,
        notes,
        observedAt,
        lat: latitude,
        lng: longitude,
        proofPhoto,
    });

    const entry = await PassportEntry.create({
        userId: req.user._id,
        type,
        title,
        notes: notes || '',
        locationName: locationName || 'SkyFolk field log',
        location: {
            lat: latitude,
            lng: longitude,
        },
        observedAt,
        observedAtLabel: observedAtLabel || 'Tonight',
        proofPhotoId: proofPhoto ? proofPhoto._id : null,
        verified: verification.verified,
        stardustAwarded: verification.stardustAwarded,
        verificationSummary: verification.verificationSummary,
        verificationTier: verification.verificationTier,
        verificationScore: verification.verificationScore,
        verificationChecks: verification.checks,
    });

    if (entry.stardustAwarded > 0) {
        await addLedgerEntry(req.user, entry.stardustAwarded, 'Cosmic Passport observation', 'passport', entry._id.toString(), {
            verificationScore: verification.verificationScore,
        });
    }

    res.status(201).json({
        entry: {
            id: entry._id.toString(),
            type: entry.type,
            title: entry.title,
            verified: entry.verified,
            stardustAwarded: entry.stardustAwarded,
            verificationSummary: entry.verificationSummary,
            verificationTier: entry.verificationTier,
            verificationScore: entry.verificationScore,
        },
        balance: req.user.stardustBalance,
        checks: verification.checks,
    });
});

module.exports = router;
