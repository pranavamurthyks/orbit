const mongoose = require('mongoose');

const sessionParticipantSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        initials: {
            type: String,
            required: true,
            trim: true,
        },
        bringing: {
            type: String,
            required: true,
            trim: true,
        },
        contributionAmount: {
            type: Number,
            default: 0,
        },
        contributionMethod: {
            type: String,
            default: '',
            trim: true,
        },
        checkedIn: {
            type: Boolean,
            default: false,
        },
    },
    { _id: true }
);

const fundingContributionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        method: {
            type: String,
            default: '',
            trim: true,
        },
        reference: {
            type: String,
            default: '',
            trim: true,
        },
        status: {
            type: String,
            default: 'recorded',
            trim: true,
        },
        refundStatus: {
            type: String,
            default: 'not-applicable',
            trim: true,
        },
        note: {
            type: String,
            default: '',
            trim: true,
        },
    },
    { _id: true, timestamps: true }
);

const fundingSpendItemSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        note: {
            type: String,
            default: '',
            trim: true,
        },
    },
    { _id: true, timestamps: true }
);

const sessionSchema = new mongoose.Schema(
    {
        hostUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        hostName: {
            type: String,
            required: true,
            trim: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        place: {
            type: String,
            required: true,
            trim: true,
        },
        timeLabel: {
            type: String,
            required: true,
            trim: true,
        },
        startsAt: {
            type: Date,
            default: null,
        },
        seatsLabel: {
            type: String,
            required: true,
            trim: true,
        },
        capacity: {
            type: Number,
            default: null,
        },
        cost: {
            type: Number,
            default: 25,
        },
        location: {
            name: { type: String, default: '', trim: true },
            description: { type: String, default: '', trim: true },
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        fundingPool: {
            enabled: { type: Boolean, default: false },
            type: { type: String, default: '', trim: true },
            goal: { type: Number, default: 0 },
            raised: { type: Number, default: 0 },
            currency: { type: String, default: 'INR', trim: true },
            paymentMethod: { type: String, default: '', trim: true },
            paymentHandle: { type: String, default: '', trim: true },
            paymentInstructions: { type: String, default: '', trim: true },
            spendSummary: { type: String, default: '', trim: true },
            contributions: {
                type: [fundingContributionSchema],
                default: [],
            },
            spendItems: {
                type: [fundingSpendItemSchema],
                default: [],
            },
        },
        participants: {
            type: [sessionParticipantSchema],
            default: [],
        },
        skyContext: {
            eventLabel: { type: String, default: 'ISS pass + moonrise window', trim: true },
            moonPhase: { type: String, default: 'Waxing Crescent', trim: true },
            visibility: { type: String, default: 'Clear southern sky expected', trim: true },
        },
        status: {
            type: String,
            default: 'scheduled',
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
