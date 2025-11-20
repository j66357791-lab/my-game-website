const express = require('express');
const router = express.Router();
const FeedLimiter = require('../utils/feed-limiter');
const Chicken = require('../models/Chicken');
const Family = require('../models/Family');
const FamilyTransaction = require('../models/FamilyTransaction');

// 中间件：验证JWT令牌
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '访问令牌缺失' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024';
        const decoded = jwt.verify(token, JWT_SECRET);
        const User = require('../models/User');
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: '用户不存在' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: '无效的访问令牌' });
    }
};

// 检查用户是否可以喂养小鸡
router.get('/can-feed/:chickenId', authenticateToken, async (req, res) => {
    try {
        const { chickenId } = req.params;
        
        const result = await FeedLimiter.canFeed(req.user._id, chickenId);
        
        res.json({
            success: true,
            canFeed: result.canFeed,
            reason: result.reason,
            remainingFeeds: result.remainingFeeds,
            nextFeedTime: result.nextFeedTime
        });
    } catch (error) {
        console.error('检查喂养权限错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 获取用户喂养统计
router.get('/user-stats/:userId?', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const targetUserId = userId || req.user._id;
        
        // 只能查看自己的统计，除非是管理员
        if (targetUserId !== req.user._id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '只能查看自己的喂养统计' });
        }
        
        const stats = await FeedLimiter.getUserFeedStats(targetUserId);
        
        res.json({
            success: true,
            userId: targetUserId,
            stats: stats
        });
    } catch (error) {
        console.error('获取用户喂养统计错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 获取小鸡喂养统计
router.get('/chicken-stats/:chickenId', authenticateToken, async (req, res) => {
    try {
        const { chickenId } = req.params;
        
        // 检查用户是否有权限查看这只小鸡
        const chicken = await Chicken.findById(chickenId);
        if (!chicken) {
            return res.status(404).json({ message: '小鸡不存在' });
        }
        
        const family = await Family.findOne({
            _id: chicken.familyId,
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(403).json({ message: '您没有权限查看这只小鸡的统计' });
        }
        
        const stats = await FeedLimiter.getChickenFeedStats(chickenId);
        
        res.json({
            success: true,
            chickenId: chickenId,
            chickenName: chicken.name,
            stats: stats
        });
    } catch (error) {
        console.error('获取小鸡喂养统计错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 获取家庭喂养统计
router.get('/family-stats/:familyId', authenticateToken, async (req, res) => {
    try {
        const { familyId } = req.params;
        
        // 检查用户是否是家庭成员
        const family = await Family.findOne({
            _id: familyId,
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(404).json({ message: '家庭不存在或您不是成员' });
        }
        
        // 获取家庭所有小鸡
        const chickens = await Chicken.find({ familyId: familyId });
        const chickenIds = chickens.map(c => c._id);
        
        // 获取每只小鸡的喂养统计
        const chickenStats = [];
        for (const chickenId of chickenIds) {
            const stats = await FeedLimiter.getChickenFeedStats(chickenId);
            chickenStats.push({
                chickenId: chickenId,
                stats: stats
            });
        }
        
        // 获取家庭成员的喂养统计
        const memberIds = [
            family.ownerId,
            ...family.members.map(m => m.userId)
        ];
        
        const memberStats = [];
        for (const userId of memberIds) {
            const stats = await FeedLimiter.getUserFeedStats(userId);
            memberStats.push({
                userId: userId,
                stats: stats
            });
        }
        
        res.json({
            success: true,
            familyId: familyId,
            familyName: family.name,
            chickenStats: chickenStats,
            memberStats: memberStats
        });
    } catch (error) {
        console.error('获取家庭喂养统计错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 重置每日喂养限制（管理员功能）
router.post('/reset-daily-limit/:chickenId?', authenticateToken, async (req, res) => {
    try {
        // 只有管理员可以重置
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '需要管理员权限' });
        }
        
        const { chickenId, userId } = req.params;
        
        let result;
        if (chickenId) {
            // 重置特定小鸡的喂养限制
            result = await FeedLimiter.resetDailyFeedLimit(chickenId);
        } else if (userId) {
            // 重置特定用户的所有喂养限制
            const chickens = await Chicken.find({ ownerId: userId });
            const results = [];
            
            for (const chicken of chickens) {
                const resetResult = await FeedLimiter.resetDailyFeedLimit(chicken._id);
                results.push(resetResult);
            }
            
            result = {
                success: true,
                message: `重置用户${userId}的所有喂养限制成功`,
                results: results
            };
        } else {
            return res.status(400).json({ message: '请提供chickenId或userId参数' });
        }
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('重置每日喂养限制错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 获取喂养限制配置
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const config = {
            defaultDailyLimit: 1,
            maxDailyLimit: 5,
            feedCooldownHours: 24,
            specialUserLimits: {
                admin: 10,
                vip: 3
            }
        };
        
        res.json({
            success: true,
            config: config
        });
    } catch (error) {
        console.error('获取喂养限制配置错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

module.exports = router;
