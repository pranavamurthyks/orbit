const crypto = require('crypto');
const axios = require('axios');
const OtpRequest = require('../models/OtpRequest');

const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const OTP_PATTERN = /^\d{6}$/;

function assertPhone(value, fieldName) {
    if (!E164_PHONE_PATTERN.test(value || '')) {
        const error = new Error(`${fieldName} must be E.164 format, such as +919876543210`);
        error.status = 400;
        throw error;
    }
}

function assertOtp(value) {
    if (!OTP_PATTERN.test(value || '')) {
        const error = new Error('otp must be a 6-digit string');
        error.status = 400;
        throw error;
    }
}

function generateOtp() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

function hashOtp(otp, salt) {
    return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

async function sendOtp({ senderPhone, receiverPhone, otp }) {
    const senderMode = (process.env.OTP_SENDER_MODE || 'mock').trim().toLowerCase();

    if (senderMode === 'mock') {
        console.log(`[MOCK OTP] sender_phone=${senderPhone} receiver_phone=${receiverPhone} otp=${otp}`);
        return;
    }

    if (senderMode !== 'whatsapp') {
        const error = new Error("Unsupported OTP_SENDER_MODE. Expected 'mock' or 'whatsapp'.");
        error.status = 500;
        throw error;
    }

    const baseUrl = process.env.WHATSAPP_SENDER_URL || 'http://127.0.0.1:3001';
    const apiKey = process.env.WHATSAPP_SENDER_API_KEY || 'local-dev-key';
    const timeout = Number(process.env.WHATSAPP_SENDER_TIMEOUT_MS || 10000);

    try {
        await axios.post(
            `${baseUrl.replace(/\/$/, '')}/send-otp`,
            {
                sender_phone: senderPhone,
                receiver_phone: receiverPhone,
                otp,
            },
            {
                timeout,
                headers: {
                    'X-SENDER-API-KEY': apiKey,
                },
            }
        );
    } catch (error) {
        const status = error.response?.status || 503;
        const message = error.response?.data?.message || error.message || 'WhatsApp sender unavailable';
        const wrapped = new Error(message);
        wrapped.status = status;
        wrapped.details = error.response?.data;
        throw wrapped;
    }
}

async function requestOtp({ senderPhone, phone }) {
    assertPhone(senderPhone, 'sender_phone');
    assertPhone(phone, 'phone');

    const now = new Date();
    const existing = await OtpRequest.findOne({ phone });
    const cooldownSeconds = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);

    if (existing) {
        const secondsSinceLastSend = (now.getTime() - existing.lastSentAt.getTime()) / 1000;

        if (secondsSinceLastSend < cooldownSeconds) {
            const remaining = Math.ceil(cooldownSeconds - secondsSinceLastSend);
            return `please wait ${remaining} seconds before requesting another otp`;
        }
    }

    const otp = generateOtp();
    const salt = generateSalt();
    const otpHash = hashOtp(otp, salt);
    const expirySeconds = Number(process.env.OTP_EXPIRY_SECONDS || 300);
    const expiresAt = new Date(now.getTime() + expirySeconds * 1000);

    await OtpRequest.findOneAndUpdate(
        { phone },
        {
            phone,
            otpHash,
            salt,
            expiresAt,
            lastSentAt: now,
            verifyAttempts: 0,
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    try {
        await sendOtp({ senderPhone, receiverPhone: phone, otp });
    } catch (error) {
        await OtpRequest.deleteOne({ phone });
        throw error;
    }

    return 'otp sent successfully';
}

async function verifyOtp({ phone, otp }) {
    assertPhone(phone, 'phone');
    assertOtp(otp);

    const existing = await OtpRequest.findOne({ phone });
    if (!existing) {
        return { verified: false, message: 'otp not found or expired' };
    }

    if (new Date() > existing.expiresAt) {
        await OtpRequest.deleteOne({ phone });
        return { verified: false, message: 'otp expired' };
    }

    const maxAttempts = Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5);
    if (existing.verifyAttempts >= maxAttempts) {
        await OtpRequest.deleteOne({ phone });
        return { verified: false, message: 'maximum verification attempts exceeded' };
    }

    const submittedHash = hashOtp(otp, existing.salt);
    const valid = crypto.timingSafeEqual(
        Buffer.from(submittedHash),
        Buffer.from(existing.otpHash)
    );

    if (!valid) {
        await OtpRequest.updateOne({ phone }, { $inc: { verifyAttempts: 1 } });
        return { verified: false, message: 'invalid otp' };
    }

    await OtpRequest.deleteOne({ phone });
    return { verified: true, message: 'otp verified successfully' };
}

module.exports = {
    requestOtp,
    verifyOtp,
    assertPhone,
};
