const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥（生产环境应该使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024';

// 认证中间件
const auth = async (req, res, next) => {
    try {
        // 从请求头获取token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: '访问令牌缺失' });
        }

        // 验证token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // ✅ 使用id而不是userId
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: '用户不存在' });
        }

        if (!user.active) {
            return res.status(401).json({ message: '账户已被禁用' });
        }

        // 将用户信息添加到请求对象
        req.user = user;
        next();
    } catch (error) {
        console.error('认证错误:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: '无效的token' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'token已过期' });
        }
        
        res.status(500).json({ message: '服务器错误' });
    }
};

// 管理员认证中间件
const adminAuth = async (req, res, next) => {
    try {
        // 先通过普通认证
        await auth(req, res, () => {
            // 检查是否为管理员
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: '需要管理员权限' });
            }
            next();
        });
    } catch (error) {
        console.error('管理员认证错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 可选认证中间件（不强制要求登录）
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            // ✅ 使用id而不是userId
            const user = await User.findById(decoded.id).select('-password');
            
            if (user && user.active) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // 可选认证失败时不返回错误，继续执行
        next();
    }
};

module.exports = {
    auth,
    adminAuth,
    optionalAuth,
    JWT_SECRET
};
