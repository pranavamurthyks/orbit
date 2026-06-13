const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    photographerName: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    category: {
        type: String,
        enum: ['LUNAR', 'DEEP_SPACE', 'PLANETARY', 'WIDEFIELD', 'ISS'],
        required: true
    },
    location: {
        type: String
    },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    exifData: {
        camera: { type: String, default: 'Unknown' },
        exposure: { type: String, default: 'Unknown' },
        iso: { type: Number, default: 0 },
        focalLength: { type: String, default: 'Unknown' }
    },
    darkSkyIndex: {
        type: Number,
        default: 5
    },
    stardustTips: {
        type: Number,
        default: 0
    },
    verifiedIssPass: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Photo', photoSchema);
