// backend/middleware/auth.js - 修复版本
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            
            // 🔧 关键修复：确保 req.user.id 结构一致
            req.user = await User.findById(decoded.id).select('-password');
            req.user.id = decoded.id; // 🔧 确保有 id 字段
            
            next();
        } catch (error) {
            return res.status(401).json({ message: '未授权，token无效' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: '未授权，没有token' });
    }
};

module.exports = { protect };
