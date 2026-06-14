const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function loadUserFromHeader(req) {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) return null;

    const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev-only-change-this-secret'
    );

    return User.findById(payload.sub);
}

async function requireAuth(req, res, next) {
    try {
        const user = await loadUserFromHeader(req);

        if (!user) {
            return res.status(401).json({ message: 'Invalid bearer token' });
        }

        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid bearer token' });
    }
}

async function optionalAuth(req, res, next) {
    try {
        const user = await loadUserFromHeader(req);
        req.user = user || null;
    } catch (error) {
        req.user = null;
    }

    return next();
}

module.exports = requireAuth;
module.exports.optionalAuth = optionalAuth;
