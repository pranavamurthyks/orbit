const mongoose = require('mongoose');

const photoGiftSchema = new mongoose.Schema(
    {
        photoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Photo',
            required: true,
            index: true,
        },
        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
    },
    { timestamps: true }
);

photoGiftSchema.index({ photoId: 1, fromUserId: 1 }, { unique: true });

module.exports = mongoose.model('PhotoGift', photoGiftSchema);
