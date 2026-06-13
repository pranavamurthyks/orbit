const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['EARN', 'SPEND', 'GIFT', 'TRADE_STAKE', 'TRADE_PAYOUT'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    stardustBalance: {
        type: Number,
        default: 500
    },
    driftScore: {
        type: Number,
        default: 0
    },
    dailyStreak: {
        type: Number,
        default: 1
    },
    lastActive: {
        type: Date,
        default: () => new Date(0)
    },
    ledger: [ledgerEntrySchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
