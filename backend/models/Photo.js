const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        authorName: {
            type: String,
            required: true,
            trim: true,
        },
        authorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        description: {
            type: String,
            default: '',
            trim: true,
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
        cameraLabel: {
            type: String,
            default: '',
            trim: true,
        },
        challengeTag: {
            type: String,
            default: '',
            trim: true,
        },
        imageUrl: {
            type: String,
            required: true,
            trim: true,
        },
        fullImageUrl: {
            type: String,
            default: null,
            trim: true,
        },
        sourceType: {
            type: String,
            default: 'community',
            trim: true,
        },
        capturedAtLabel: {
            type: String,
            default: 'Today',
            trim: true,
        },
        capturedAt: {
            type: Date,
            default: null,
        },
        darkSkyScore: {
            type: Number,
            default: 0,
        },
        verificationHints: {
            type: [String],
            default: [],
        },
        stardustTotal: {
            type: Number,
            default: 0,
        },
        giftCount: {
            type: Number,
            default: 0,
        },
        featured: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Photo', photoSchema);
