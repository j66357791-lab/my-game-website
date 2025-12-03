const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// 生成JWT token - 修复参数接收
const generateToken = (userId, username, role) => {
    return jwt.sign(
        { 
            id: userId,           // ✅ 使用id而不是userId
            username: username,
            role: role
        },
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
        { 
            id: userId,           // ✅ 使用id而不是userId
            type: 'refresh' 
        },
        JWT_SECRET,
        { expiresIn: '30d' } // 30天过期
    );
};

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken
};
