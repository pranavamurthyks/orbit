const StardustLedger = require('../models/StardustLedger');

async function addLedgerEntry(user, amount, reason, refType = 'system', refId = null, meta = {}) {
    user.stardustBalance += amount;
    if (user.stardustBalance < 0) {
        throw new Error('Insufficient stardust balance');
    }

    await user.save();
    await StardustLedger.create({
        userId: user._id,
        amount,
        reason,
        refType,
        refId,
        meta,
    });

    return user.stardustBalance;
}

module.exports = {
    addLedgerEntry,
};
