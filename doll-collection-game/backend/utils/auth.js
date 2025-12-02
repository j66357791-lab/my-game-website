const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// 生成JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: '7d' } // 7天过期
    );
};

// 验证token
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// 生成刷新token
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '30d' } // 30天过期
    );
};

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken
};
