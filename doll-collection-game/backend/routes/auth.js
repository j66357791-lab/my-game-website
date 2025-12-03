const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/auth');
const bcrypt = require('bcryptjs');

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码均为必填项' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        const validPassword = await user.comparePassword(password);
        if (!validPassword) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        if (!user.active) {
            return res.status(400).json({ message: '账户已被禁用' });
        }

        // 生成token
        const token = generateToken(user._id, user.username, user.role);
        const refreshToken = generateRefreshToken(user._id);

        res.json({
            message: '登录成功',
            token,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                points: user.points,
                role: user.role
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 修复：添加 /validate 路由（重要！）
router.post('/validate', async (req, res) => {
    try {
        const { token } = req.body;
        const { verifyToken } = require('../utils/auth');
        
        if (!token) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Token缺失' 
            });
        }
        
        const decoded = verifyToken(token);
        // ✅ 使用id而不是userId
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || !user.active) {
            return res.status(401).json({ 
                valid: false, 
                message: '无效的token或用户不存在' 
            });
        }

        res.json({
            valid: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                points: user.points,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Token验证错误:', error);
        res.status(401).json({ 
            valid: false, 
            message: 'Token验证失败' 
        });
    }
});

// 保留原有的 /verify 路由（兼容性）
router.post('/verify', async (req, res) => {
    return router.handle(req, res);
});

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ message: '用户名、密码和邮箱均为必填项' });
        }

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({
                message: '用户名或邮箱已存在'
            });
        }

        // 创建新用户
        const user = new User({
            username,
            email,
            password,
            points: 0, // 注册时不赠送积分
            role: 'user',
            active: true
        });

        await user.save();

        // 生成token
        const token = generateToken(user._id, user.username, user.role);
        const refreshToken = generateRefreshToken(user._id);

        res.status(201).json({
            message: '注册成功',
            token,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                points: user.points,
                role: user.role
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;
