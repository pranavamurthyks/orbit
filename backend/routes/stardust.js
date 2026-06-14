const express = require('express');
const requireAuth = require('../middleware/auth');
const StardustLedger = require('../models/StardustLedger');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
    const ledger = await StardustLedger.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

    res.json({
        balance: req.user.stardustBalance,
        reputationScore: req.user.reputationScore,
        ledger: ledger.map(entry => ({
            id: entry._id.toString(),
            amount: entry.amount,
            reason: entry.reason,
            refType: entry.refType,
            refId: entry.refId,
            createdAt: entry.createdAt,
        })),
    });
});

module.exports = router;
