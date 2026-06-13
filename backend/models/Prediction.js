const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tripType: {
        type: String,
        enum: ['SPECIAL_RELATIVITY', 'GENERAL_RELATIVITY'],
        required: true
    },
    tripParameters: {
        speed: { type: Number }, // speed as % of c (0-1) for SR
        distance: { type: Number } // distance from massive object in multiples of Schwarzschild radius for GR
    },
    shipTimeSeconds: {
        type: Number,
        required: true
    },
    homeTimeSeconds: {
        type: Number,
        required: true
    },
    targetMetric: {
        type: String,
        enum: ['SATELLITE_COUNT', 'SOLAR_CYCLE_ACTIVITY', 'EXOPLANET_DISCOVERIES'],
        required: true
    },
    predictionValue: {
        type: String,
        enum: ['UP', 'DOWN', 'STABLE'],
        required: true
    },
    stardustStake: {
        type: Number,
        required: true
    },
    oddsAtStake: {
        type: Number,
        required: true
    },
    resolved: {
        type: Boolean,
        default: false
    },
    won: {
        type: Boolean
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Prediction', predictionSchema);
