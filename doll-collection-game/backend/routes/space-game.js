const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const GameTransaction = require('../models/GameTransaction');
const User = require('../models/User');
const auth = require('../middleware/auth'); // 假设你有认证中间件

// 获取用户信息
router.get('/user/info', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('points username');
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        res.json({
            id: user._id,
            username: user.username,
            points: user.points || 10000 // 默认积分
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新用户积分
router.post('/user/points', auth, async (req, res) => {
    try {
        const { points } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        user.points = points;
        await user.save();
        
        res.json({ success: true, points: user.points });
    } catch (error) {
        console.error('更新积分错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 保存游戏记录
router.post('/game/save', auth, async (req, res) => {
    try {
        const gameData = req.body;
        
        // 创建游戏记录
        const game = new Game({
            userId: req.user.id,
            ...gameData
        });
        
        await game.save();
        
        // 更新用户积分
        const user = await User.findById(req.user.id);
        if (user) {
            user.points = (user.points || 10000) + gameData.profit;
            await user.save();
        }
        
        res.json({ success: true, gameId: game._id });
    } catch (error) {
        console.error('保存游戏记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取游戏历史
router.get('/game/history', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const games = await Game.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(limit)
            .select('round redStar blueStar winner timestamp');
        
        res.json(games);
    } catch (error) {
        console.error('获取游戏历史错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取游戏统计
router.get('/game/statistics', auth, async (req, res) => {
    try {
        const stats = await Game.aggregate([
            { $match: { userId: req.user.id } },
            {
                $group: {
                    _id: null,
                    totalGames: { $sum: 1 },
                    redWins: {
                        $sum: { $cond: [{ $eq: ['$winner', 'red'] }, 1, 0] }
                    },
                    blueWins: {
                        $sum: { $cond: [{ $eq: ['$winner', 'blue'] }, 1, 0] }
                    },
                    draws: {
                        $sum: { $cond: [{ $eq: ['$winner', 'draw'] }, 1, 0] }
                    },
                    totalProfit: { $sum: '$profit' }
                }
            }
        ]);
        
        const result = stats[0] || {
            totalGames: 0,
            redWins: 0,
            blueWins: 0,
            draws: 0,
            totalProfit: 0
        };
        
        res.json(result);
    } catch (error) {
        console.error('获取游戏统计错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;
