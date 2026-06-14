const QRCode = require('qrcode');

const DIGITAL_METHODS = new Set(['UPI', 'Razorpay', 'Bank transfer']);
const SUPPORTED_METHODS = new Set(['UPI', 'Razorpay', 'Bank transfer', 'Cash at meetup']);

function trim(value) {
    return String(value || '').trim();
}

function isProbablyUrl(value) {
    return /^https?:\/\//i.test(trim(value));
}

function isValidUpiHandle(value) {
    return /^[\w.+-]{2,256}@[A-Za-z][\w.-]{1,63}$/.test(trim(value));
}

function normalizedMethod(value) {
    const method = trim(value);
    return SUPPORTED_METHODS.has(method) ? method : '';
}

function referenceRequired(method) {
    return DIGITAL_METHODS.has(method);
}

function buildPaymentNote(session) {
    return `${session?.title || 'SkyFolk session'} funding contribution`;
}

function paymentSummary({ session, method, handle, instructions, currency, amount }) {
    const lines = [
        `${session?.title || 'Session'} funding pool`,
        `Method: ${method || 'Manual payment'}`,
    ];

    if (handle) lines.push(`Handle/link: ${handle}`);
    if (amount > 0) lines.push(`Suggested amount: ${amount} ${currency}`);
    if (instructions) lines.push(`Instructions: ${instructions}`);
    if (referenceRequired(method)) lines.push('Keep your transaction reference to record and confirm the contribution.');
    return lines.join('\n');
}

function actionUrlFor({ session, method, handle, currency, amount }) {
    if (isProbablyUrl(handle)) {
        return handle;
    }

    if (method === 'UPI' && isValidUpiHandle(handle)) {
        const params = new URLSearchParams({
            pa: handle,
            pn: trim(session?.hostName) || 'SkyFolk host',
            cu: currency,
            tn: buildPaymentNote(session),
        });
        if (amount > 0) {
            params.set('am', String(amount));
        }
        return `upi://pay?${params.toString()}`;
    }

    return '';
}

async function qrCodeDataUrlFor(value) {
    if (!value) {
        return '';
    }

    try {
        return await QRCode.toDataURL(value, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 320,
        });
    } catch {
        return '';
    }
}

function validateFundingSetup(funding) {
    if (!funding?.enabled) {
        return { enabled: false };
    }

    const method = normalizedMethod(funding.paymentMethod);
    const handle = trim(funding.paymentHandle);
    const instructions = trim(funding.paymentInstructions);

    if (!method) {
        throw new Error('Choose a supported funding payment method');
    }

    if (method === 'UPI' && !isValidUpiHandle(handle) && !isProbablyUrl(handle)) {
        throw new Error('UPI funding requires a valid UPI handle or payment link');
    }

    if (method === 'Razorpay' && !isProbablyUrl(handle)) {
        throw new Error('Razorpay funding requires a hosted payment link');
    }

    if (method === 'Bank transfer' && !handle) {
        throw new Error('Bank-transfer funding requires account or payment details');
    }

    return {
        enabled: true,
        type: trim(funding.type),
        goal: Number(funding.goal || 0),
        paymentMethod: method,
        paymentHandle: handle,
        paymentInstructions: instructions,
    };
}

function normalizeContributionReference(reference) {
    return trim(reference).toLowerCase();
}

function resolveContributionMethod(session, requestedMethod) {
    const configured = normalizedMethod(session?.fundingPool?.paymentMethod);
    const requested = normalizedMethod(requestedMethod);

    if (configured) {
        if (requested && requested !== configured) {
            throw new Error(`Use the host's configured payment method: ${configured}`);
        }
        return configured;
    }

    return requested;
}

function validateContributionInput({ session, amount, method, reference }) {
    const normalizedAmount = Math.max(0, Math.floor(Number(amount || 0)));
    const resolvedMethod = resolveContributionMethod(session, method);
    const trimmedReference = trim(reference);

    if (normalizedAmount < 1) {
        throw new Error('amount must be at least 1');
    }

    if (referenceRequired(resolvedMethod) && trimmedReference.length < 4) {
        throw new Error(`A payment reference is required for ${resolvedMethod} contributions`);
    }

    const duplicateReference = trimmedReference && session.fundingPool?.contributions?.some((item) => (
        normalizeContributionReference(item.reference) === normalizeContributionReference(trimmedReference)
    ));
    if (duplicateReference) {
        throw new Error('That payment reference is already recorded for this session');
    }

    return {
        amount: normalizedAmount,
        method: resolvedMethod,
        reference: trimmedReference,
        status: resolvedMethod === 'Cash at meetup'
            ? 'pledged'
            : referenceRequired(resolvedMethod)
                ? 'proof-submitted'
                : 'recorded',
    };
}

async function buildSessionPaymentArtifact(session, requestedAmount) {
    const method = normalizedMethod(session?.fundingPool?.paymentMethod);
    const handle = trim(session?.fundingPool?.paymentHandle);
    const instructions = trim(session?.fundingPool?.paymentInstructions);
    const currency = trim(session?.fundingPool?.currency || 'INR') || 'INR';
    const amount = Math.max(0, Math.floor(Number(requestedAmount || 0)));
    const actionUrl = actionUrlFor({
        session,
        method,
        handle,
        currency,
        amount,
    });

    return {
        method,
        handle,
        currency,
        amount,
        summary: paymentSummary({ session, method, handle, instructions, currency, amount }),
        instructions,
        actionUrl,
        actionLabel: actionUrl
            ? method === 'UPI'
                ? 'Open UPI app'
                : method === 'Razorpay'
                    ? 'Open Razorpay link'
                    : 'Open payment link'
            : '',
        qrCodeDataUrl: await qrCodeDataUrlFor(actionUrl),
        referenceRequired: referenceRequired(method),
    };
}

module.exports = {
    buildSessionPaymentArtifact,
    validateFundingSetup,
    validateContributionInput,
};
