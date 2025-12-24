// backend/middleware/auth.js - 完整修复版本
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose'); 

const protect = async (req, res, next) => {
    let token;

    // 🔧 修复：检查数据库连接状态
    if (mongoose.connection.readyState !== 1) {
        console.error('❌ 数据库未连接');
        return res.status(500).json({ 
            success: false, 
            message: '数据库连接失败' 
        });
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            if (!token) {
                console.error('❌ token为空');
                return res.status(401).json({ 
                    success: false, 
                    message: '未授权，token为空' 
                });
            }
            
            // 🔧 关键修复：统一JWT secret和payload字段
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            
            console.log('🔐 JWT验证成功:', decoded);
            console.log('🔐 decoded.userId:', decoded.userId);
            
            // 🔧 关键修复：使用正确的字段名
            req.user = await User.findById(decoded.userId).select('-password');
            
            if (!req.user) {
                console.error('❌ 用户不存在:', decoded.userId);
                return res.status(401).json({ 
                    success: false, 
                    message: '用户不存在' 
                });
            }
            
            // 🔧 新增：检查用户状态
            if (req.user.disabled) {
                console.error('❌ 用户已被禁用:', req.user.username);
                return res.status(401).json({ 
                    success: false, 
                    message: '用户已被禁用' 
                });
            }
            
            console.log('✅ 认证成功，用户:', req.user.username);
            console.log('✅ 用户ID:', req.user._id);
            next();
        } catch (error) {
            console.error('❌ JWT验证失败:', error.message);
            console.error('❌ 错误详情:', error);
            
            // 🔧 修复：更详细的错误处理
            let errorMessage = '未授权，token无效';
            if (error.name === 'TokenExpiredError') {
                errorMessage = 'token已过期，请重新登录';
            } else if (error.name === 'JsonWebTokenError') {
                errorMessage = 'token格式错误';
            }
            
            return res.status(401).json({ 
                success: false, 
                message: errorMessage 
            });
        }
    }

    if (!token) {
        console.error('❌ 未提供token');
        return res.status(401).json({ 
            success: false, 
            message: '未授权，没有token' 
        });
    }
};

module.exports = { protect, admin };