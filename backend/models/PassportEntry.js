const mongoose = require('mongoose');

const passportEntrySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            trim: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        notes: {
            type: String,
            default: '',
            trim: true,
        },
        proofPhotoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Photo',
            default: null,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        stardustAwarded: {
            type: Number,
            default: 0,
        },
        locationName: {
            type: String,
            default: '',
            trim: true,
        },
        location: {
            lat: {
                type: Number,
                default: null,
            },
            lng: {
                type: Number,
                default: null,
            },
        },
        observedAt: {
            type: Date,
            default: null,
        },
        observedAtLabel: {
            type: String,
            default: 'Tonight',
            trim: true,
        },
        verificationSummary: {
            type: String,
            default: '',
            trim: true,
        },
        verificationTier: {
            type: String,
            default: 'unverified',
            trim: true,
        },
        verificationScore: {
            type: Number,
            default: 0,
        },
        verificationChecks: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('PassportEntry', passportEntrySchema);
