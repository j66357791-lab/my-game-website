// backend/middleware/auth.js - 修复JWT payload字段
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // 🔧 关键修复：统一JWT secret和payload字段
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            
            console.log('🔐 JWT验证成功:', decoded);
            console.log('🔐 decoded.userId:', decoded.userId);
            
            // 🔧 关键修复：使用正确的字段名
            req.user = await User.findById(decoded.userId).select('-password');
            
            if (!req.user) {
                console.error('❌ 用户不存在:', decoded.userId);
                return res.status(401).json({ message: '用户不存在' });
            }
            
            // 🔧 确保控制器能正确获取用户ID
            req.user.id = decoded.userId;
            
            console.log('✅ 认证成功，用户:', req.user.username);
            next();
        } catch (error) {
            console.error('❌ JWT验证失败:', error.message);
            console.error('❌ 错误详情:', error);
            return res.status(401).json({ message: '未授权，token无效' });
        }
    }

    if (!token) {
        console.error('❌ 未提供token');
        return res.status(401).json({ message: '未授权，没有token' });
    }
};

module.exports = { protect };
