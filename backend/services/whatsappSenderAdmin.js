const axios = require('axios');
const QRCode = require('qrcode');

function senderConfig() {
    return {
        baseUrl: process.env.WHATSAPP_SENDER_URL || 'http://127.0.0.1:3001',
        apiKey: process.env.WHATSAPP_SENDER_API_KEY || 'local-dev-key',
        timeout: Number(process.env.WHATSAPP_SENDER_TIMEOUT_MS || 10000),
    };
}

function normalizeStatus(data) {
    const ready = Boolean(data.ready);
    const authenticated = Boolean(data.authenticated);
    const requiresQr = Boolean(data.hasQr && data.qr);
    const clientState = data.clientState || 'unknown';

    return {
        sender_id: String(data.senderId || data.sender_id || ''),
        sender_phone: String(data.senderPhone || data.sender_phone || ''),
        authenticated,
        ready,
        requires_qr: requiresQr,
        client_state: clientState,
        message: buildMessage({ ready, authenticated, requiresQr, clientState, lastError: data.lastError }),
        qr: data.qr || null,
        last_error: data.lastError || null,
        last_qr_at: data.lastQrAt || null,
        ready_at: data.readyAt || null,
        disconnected_at: data.disconnectedAt || null,
    };
}

function buildMessage({ ready, authenticated, requiresQr, clientState, lastError }) {
    if (ready) return 'sender is authenticated and ready';
    if (requiresQr) return 'scan the QR code and poll sender status';
    if (authenticated) return 'sender is authenticated, waiting for ready';
    if (lastError) return `sender is not ready: ${lastError}`;
    if (clientState === 'initializing') return 'sender session is initializing, poll sender status';
    return 'sender is not ready';
}

async function senderRequest(method, path, body) {
    const { baseUrl, apiKey, timeout } = senderConfig();

    try {
        const response = await axios.request({
            method,
            url: `${baseUrl.replace(/\/$/, '')}${path}`,
            data: body,
            timeout,
            headers: {
                'X-SENDER-API-KEY': apiKey,
            },
        });

        return response.data;
    } catch (error) {
        const wrapped = new Error(error.response?.data?.message || error.message);
        wrapped.status = error.response?.status || 503;
        wrapped.details = error.response?.data;
        throw wrapped;
    }
}

async function setSender(senderPhone) {
    const status = normalizeStatus(await senderRequest('POST', '/senders', { sender_phone: senderPhone }));

    if (!status.ready) {
        const qrStatus = await getSenderQr(status.sender_id);
        if (qrStatus.qr) return qrStatus;
    }

    return status;
}

async function listSenders() {
    const data = await senderRequest('GET', '/senders');
    return (data.senders || []).map(normalizeStatus);
}

async function getSenderStatus(senderId) {
    return normalizeStatus(await senderRequest('GET', `/senders/${senderId}/status`));
}

async function getSenderQr(senderId) {
    const statusData = await senderRequest('GET', `/senders/${senderId}/status`);
    const qrData = await senderRequest('GET', `/senders/${senderId}/qr`);
    return normalizeStatus({
        ...statusData,
        hasQr: qrData.hasQr ?? statusData.hasQr,
        qr: qrData.qr ?? statusData.qr,
        lastQrAt: qrData.lastQrAt ?? statusData.lastQrAt,
        clientState: qrData.clientState ?? statusData.clientState,
    });
}

async function logoutSender(senderId) {
    return await senderRequest('POST', `/senders/${senderId}/logout`);
}

async function qrSvg(senderId) {
    const status = await getSenderQr(senderId);
    if (!status.qr) {
        const error = new Error('No QR code is currently available for this sender.');
        error.status = 404;
        throw error;
    }

    return await QRCode.toString(status.qr, { type: 'svg' });
}

module.exports = {
    setSender,
    listSenders,
    getSenderStatus,
    getSenderQr,
    logoutSender,
    qrSvg,
};
