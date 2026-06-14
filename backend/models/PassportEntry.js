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
        verified: {
            type: Boolean,
            default: true,
        },
        stardustAwarded: {
            type: Number,
            default: 15,
        },
        locationName: {
            type: String,
            default: '',
            trim: true,
        },
        observedAtLabel: {
            type: String,
            default: 'Tonight',
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('PassportEntry', passportEntrySchema);
