const mongoose = require('mongoose');

const stardustLedgerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        refType: {
            type: String,
            default: 'system',
            trim: true,
        },
        refId: {
            type: String,
            default: null,
            trim: true,
        },
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('StardustLedger', stardustLedgerSchema);
