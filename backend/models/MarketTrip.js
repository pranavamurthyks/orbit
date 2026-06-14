const mongoose = require('mongoose');

const marketPredictionSchema = new mongoose.Schema(
    {
        marketKey: {
            type: String,
            required: true,
            trim: true,
        },
        pick: {
            type: Number,
            required: true,
        },
        stake: {
            type: Number,
            required: true,
            min: 0,
        },
        payout: {
            type: Number,
            default: 0,
        },
        won: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const marketTripSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        mode: {
            type: String,
            required: true,
            trim: true,
        },
        shipDays: {
            type: Number,
            required: true,
        },
        homeYears: {
            type: Number,
            required: true,
        },
        dilationFactor: {
            type: Number,
            required: true,
        },
        predictions: {
            type: [marketPredictionSchema],
            default: [],
        },
        totalStake: {
            type: Number,
            required: true,
        },
        totalPayout: {
            type: Number,
            default: 0,
        },
        driftScore: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('MarketTrip', marketTripSchema);
