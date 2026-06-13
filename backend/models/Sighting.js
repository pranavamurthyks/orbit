const mongoose = require('mongoose');

const sightingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['ISS', 'METEOR', 'PLANET', 'MOON', 'AURORA', 'OTHER'],
        required: true
    },
    description: {
        type: String
    },
    date: {
        type: Date,
        default: Date.now
    },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    constellationPoint: {
        x: { type: Number, required: true },
        y: { type: Number, required: true }
    },
    stardustEarned: {
        type: Number,
        default: 50
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Sighting', sightingSchema);
