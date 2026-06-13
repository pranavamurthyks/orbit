const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    item: { type: String, required: true }
});

const contributionSchema = new mongoose.Schema({
    username: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hostUsername: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    dateTime: {
        type: Date,
        required: true
    },
    locationName: {
        type: String,
        required: true
    },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    capacity: {
        type: Number,
        required: true
    },
    attendees: [
        { type: String }
    ],
    equipmentList: [equipmentSchema],
    fundingPool: {
        target: { type: Number, default: 0 },
        current: { type: Number, default: 0 },
        contributions: [contributionSchema]
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
