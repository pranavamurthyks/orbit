const express = require('express');
const User = require('../models/User');
const { createAccessToken, publicUser } = require('../utils/auth');
const { requestOtp, verifyOtp, assertPhone } = require('../services/otpService');
const senderAdmin = require('../services/whatsappSenderAdmin');

const router = express.Router();

function handleError(error, res) {
    res.status(error.status || 500).json({
        message: error.message || 'Request failed',
        details: error.details,
    });
}

router.post('/request', async (req, res) => {
    try {
        const message = await requestOtp({
            senderPhone: req.body.sender_phone,
            phone: req.body.phone,
        });
        res.json({ message });
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/resend', async (req, res) => {
    try {
        const message = await requestOtp({
            senderPhone: req.body.sender_phone,
            phone: req.body.phone,
        });
        res.json({ message });
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/verify', async (req, res) => {
    try {
        const result = await verifyOtp({
            phone: req.body.phone,
            otp: req.body.otp,
        });
        res.json(result);
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/login', async (req, res) => {
    try {
        const result = await verifyOtp({
            phone: req.body.phone,
            otp: req.body.otp,
        });

        if (!result.verified) {
            return res.status(401).json({ message: result.message });
        }

        let user = await User.findOne({ phone: req.body.phone });
        if (!user) {
            const safePhone = req.body.phone.replace(/^\+/, '');
            user = await User.create({
                username: `phone_${safePhone}`,
                phone: req.body.phone,
                displayName: `Orbit ${safePhone.slice(-4)}`,
            });
        }

        res.json({
            accessToken: createAccessToken(user),
            tokenType: 'bearer',
            user: publicUser(user),
        });
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/senders', async (req, res) => {
    try {
        assertPhone(req.body.sender_phone, 'sender_phone');
        res.json(await senderAdmin.setSender(req.body.sender_phone));
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/senders', async (req, res) => {
    try {
        res.json({ senders: await senderAdmin.listSenders() });
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/senders/:senderId/status', async (req, res) => {
    try {
        res.json(await senderAdmin.getSenderStatus(req.params.senderId));
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/senders/:senderId/qr', async (req, res) => {
    try {
        res.json(await senderAdmin.getSenderQr(req.params.senderId));
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/senders/:senderId/qr.svg', async (req, res) => {
    try {
        const svg = await senderAdmin.qrSvg(req.params.senderId);
        res.type('image/svg+xml').send(svg);
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/senders/:senderId/qr-page', (req, res) => {
    res.type('html').send(`
        <!doctype html>
        <html>
            <head>
                <title>Orbit WhatsApp Sender QR</title>
                <style>
                    body {
                        font-family: system-ui, sans-serif;
                        display: grid;
                        place-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #f7fafc;
                    }
                    main { text-align: center; padding: 24px; }
                    img {
                        width: min(80vw, 420px);
                        height: auto;
                        background: white;
                        padding: 16px;
                        border: 1px solid #d7dee8;
                    }
                </style>
            </head>
            <body>
                <main>
                    <h1>Scan WhatsApp QR</h1>
                    <p>WhatsApp -> Linked Devices -> Link a Device</p>
                    <img src="/api/otp/senders/${req.params.senderId}/qr.svg" alt="WhatsApp QR code" />
                </main>
            </body>
        </html>
    `);
});

router.post('/senders/:senderId/logout', async (req, res) => {
    try {
        const data = await senderAdmin.logoutSender(req.params.senderId);
        res.json({
            loggedOut: Boolean(data.loggedOut),
            senderId: data.senderId || req.params.senderId,
        });
    } catch (error) {
        handleError(error, res);
    }
});

module.exports = router;
