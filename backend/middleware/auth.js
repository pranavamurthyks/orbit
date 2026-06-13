const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Missing bearer token' });
    }

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET || 'dev-only-change-this-secret'
        );

        const user = await User.findById(payload.sub);
        if (!user) {
            return res.status(401).json({ message: 'Invalid bearer token' });
        }

        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid bearer token' });
    }
}

module.exports = requireAuth;
