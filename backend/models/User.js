const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
        },
        passwordHash: {
            type: String,
        },
        stardustBalance: {
            type: Number,
            default: 100,
        },
        reputationScore: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
