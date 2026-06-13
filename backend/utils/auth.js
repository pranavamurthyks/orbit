const jwt = require('jsonwebtoken');

function createAccessToken(user) {
    return jwt.sign(
        {
            sub: user._id.toString(),
            username: user.username,
        },
        process.env.JWT_SECRET || 'dev-only-change-this-secret',
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        }
    );
}

function publicUser(user) {
    return {
        id: user._id.toString(),
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        displayName: user.displayName,
        stardustBalance: user.stardustBalance,
    };
}

module.exports = {
    createAccessToken,
    publicUser,
};
