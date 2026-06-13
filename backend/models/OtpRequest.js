const mongoose = require('mongoose');

const otpRequestSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        otpHash: {
            type: String,
            required: true,
        },
        salt: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
        lastSentAt: {
            type: Date,
            required: true,
        },
        verifyAttempts: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('OtpRequest', otpRequestSchema);
