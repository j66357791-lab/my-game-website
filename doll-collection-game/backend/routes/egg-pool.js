const express = require('express');
const router = express.Router();
const EggPool = require('../models/EggPool');
const Family = require('../models/Family');
const User = require('../models/User');
const Egg = require('../models/Egg');
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

// 获取家庭鸡蛋积分池信息
router.get('/family/:familyId', authenticateToken, async (req, res) => {
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
        
        const eggPool = await EggPool.getOrCreatePool(familyId);
        
        res.json({ 
            success: true,
            eggPool: {
                familyId: eggPool.familyId,
                totalEggs: eggPool.totalEggs,
                totalPoints: eggPool.totalPoints,
                dailyReleaseRate: eggPool.dailyReleaseRate,
                lastReleaseDate: eggPool.lastReleaseDate,
                isActive: eggPool.isActive,
                nextReleaseTime: getNextReleaseTime(eggPool.lastReleaseDate),
                releaseHistory: eggPool.releaseHistory.slice(-10) // 最近10次释放记录
            }
        });
    } catch (error) {
        console.error('获取鸡蛋积分池错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 每日释放积分池
router.post('/daily-release/:familyId', authenticateToken, async (req, res) => {
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
        
        // 只有家庭主人可以手动释放
        if (!family.ownerId.equals(req.user._id)) {
            return res.status(403).json({ message: '只有家庭主人可以手动释放积分' });
        }
        
        const result = await EggPool.dailyRelease(familyId);
        
        if (result.released) {
            // 通过WebSocket通知家庭成员
            const io = require('../../server').io;
            io.to(`family_${familyId}`).emit('egg-pool-released', {
                familyId: familyId,
                pointsReleased: result.pointsReleased,
                pointsPerMember: result.pointsPerMember,
                message: `积分池释放成功，每位成员获得${result.pointsPerMember}积分`
            });
        }
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('每日释放积分池错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 鸡蛋兑换积分
router.post('/exchange-eggs/:familyId', authenticateToken, async (req, res) => {
    try {
        const { familyId } = req.params;
        const { eggIds, exchangeAll = false } = req.body;
        
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
        
        let eggsToExchange = [];
        
        if (exchangeAll) {
            // 兑换所有未收集的鸡蛋
            eggsToExchange = await Egg.find({
                familyId: familyId,
                collected: false
            });
        } else if (eggIds && Array.isArray(eggIds)) {
            // 兑换指定的鸡蛋
            eggsToExchange = await Egg.find({
                _id: { $in: eggIds },
                familyId: familyId,
                collected: false
            });
        } else {
            return res.status(400).json({ message: '请提供要兑换的鸡蛋ID或设置exchangeAll为true' });
        }
        
        if (eggsToExchange.length === 0) {
            return res.status(400).json({ message: '没有可兑换的鸡蛋' });
        }
        
        const totalEggs = eggsToExchange.reduce((sum, egg) => sum + egg.quantity, 0);
        const exchangeRate = 100; // 1个鸡蛋 = 100积分
        const exchangePoints = totalEggs * exchangeRate;
        
        // 添加到积分池
        await EggPool.addEggs(familyId, totalEggs);
        
        // 标记鸡蛋为已兑换
        await Egg.updateMany(
            { _id: { $in: eggsToExchange.map(e => e._id) } },
            { 
                collected: true,
                collectedBy: req.user._id,
                collectedAt: new Date()
            }
        );
        
        // 记录交易
        await FamilyTransaction.create({
            familyId: familyId,
            userId: req.user._id,
            type: 'egg_exchange',
            amount: exchangePoints,
            description: `兑换${totalEggs}个鸡蛋到积分池`
        });
        
        // 通过WebSocket通知家庭成员
        const io = require('../../server').io;
        io.to(`family_${familyId}`).emit('eggs-exchanged', {
            familyId: familyId,
            totalEggs: totalEggs,
            exchangePoints: exchangePoints,
            exchangedBy: req.user.username,
            message: `${req.user.username}兑换了${totalEggs}个鸡蛋到积分池`
        });
        
        res.json({
            success: true,
            message: `成功兑换${totalEggs}个鸡蛋到积分池`,
            totalEggs: totalEggs,
            exchangePoints: exchangePoints
        });
    } catch (error) {
        console.error('鸡蛋兑换积分错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 获取积分池历史记录
router.get('/history/:familyId', authenticateToken, async (req, res) => {
    try {
        const { familyId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        
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
        
        const eggPool = await EggPool.findOne({ familyId });
        if (!eggPool) {
            return res.json({ history: [], total: 0 });
        }
        
        const history = eggPool.releaseHistory
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .skip((page - 1) * limit)
            .limit(limit * 1);
        
        const total = eggPool.releaseHistory.length;
        
        res.json({
            success: true,
            history: history,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取积分池历史错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 获取积分池统计信息
router.get('/stats/:familyId', authenticateToken, async (req, res) => {
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
        
        const eggPool = await EggPool.findOne({ familyId });
        if (!eggPool) {
            return res.json({
                success: true,
                stats: {
                    totalEggs: 0,
                    totalPoints: 0,
                    dailyReleaseRate: 0.01,
                    lastReleaseDate: null,
                    totalReleases: 0,
                    totalPointsReleased: 0,
                    nextReleaseTime: null
                }
            });
        }
        
        // 计算统计信息
        const totalReleases = eggPool.releaseHistory.length;
        const totalPointsReleased = eggPool.releaseHistory.reduce(
            (sum, release) => sum + release.pointsReleased, 0
        );
        
        const stats = {
            totalEggs: eggPool.totalEggs,
            totalPoints: eggPool.totalPoints,
            dailyReleaseRate: eggPool.dailyReleaseRate,
            lastReleaseDate: eggPool.lastReleaseDate,
            totalReleases: totalReleases,
            totalPointsReleased: totalPointsReleased,
            nextReleaseTime: getNextReleaseTime(eggPool.lastReleaseDate),
            isActive: eggPool.isActive
        };
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('获取积分池统计错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 工具函数：计算下次释放时间
function getNextReleaseTime(lastReleaseDate) {
    if (!lastReleaseDate) {
        return new Date(); // 如果从未释放过，下次就是现在
    }
    
    const nextRelease = new Date(lastReleaseDate);
    nextRelease.setDate(nextRelease.getDate() + 1);
    nextRelease.setHours(0, 0, 0, 0);
    
    return nextRelease;
}

module.exports = router;
