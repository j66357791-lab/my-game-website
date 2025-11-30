const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SpaceGameBet = require('../models/SpaceGameBet');
const { generateBossStar } = require('../utils/space-game-economy');

// 全局游戏状态
let currentGame = {
    sessionId: '',
    status: 'betting',
    timeRemaining: 30,
    bossStar: null,
    fighterStars: [null, null, null, null],
    userMaxBets: {}
};

// 获取游戏状态
router.get('/status', async (req, res) => {
    const userId = req.user.id;

    if (!currentGame.userMaxBets[userId] && currentGame.status === 'betting') {
        const user = await User.findById(userId);
        if (user) {
            const maxAmount = Math.floor(user.points / 10);
            currentGame.userMaxBets[userId] = { maxAmount, currentTotalBet: 0 };
        }
    }

    const user = await User.findById(userId);
    
    res.json({
        status: currentGame.status,
        timeRemaining: currentGame.timeRemaining,
        sessionId: currentGame.sessionId,
        maxBetAmount: userId && currentGame.userMaxBets[userId] ? currentGame.userMaxBets[userId].maxAmount : 0,
        remainingQuota: userId && currentGame.userMaxBets[userId] ? currentGame.userMaxBets[userId].maxAmount - currentGame.userMaxBets[userId].currentTotalBet : 0,
        userPoints: user ? user.points : 0
    });
});

// 提交下注
router.post('/bet', async (req, res) => {
    const userId = req.user.id;
    const { fighterId, amount } = req.body;

    if (currentGame.status !== 'betting') {
        return res.status(400).json({ error: '当前不在下注时间' });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    if (user.points < amount) {
        return res.status(400).json({ error: '积分不足' });
    }

    const userBetInfo = currentGame.userMaxBets[userId];
    if (!userBetInfo || userBetInfo.currentTotalBet + amount > userBetInfo.maxAmount) {
        return res.status(400).json({ error: '下注金额超过本局上限' });
    }

    try {
        // 扣除用户积分
        user.points -= amount;
        await user.save();

        // 创建下注记录
        const newBet = new SpaceGameBet({
            user: userId,
            gameSessionId: currentGame.sessionId,
            betOnFighter: fighterId,
            betAmount: amount
        });
        await newBet.save();

        // 更新内存中的下注总额
        userBetInfo.currentTotalBet += amount;

        // 通过WebSocket通知
        if (global.io) {
            global.io.emit('space-game-bet', {
                userId: userId,
                username: user.username,
                fighterId: fighterId,
                amount: amount,
                userPoints: user.points
            });
        }

        res.json({ 
            success: true, 
            remainingQuota: userBetInfo.maxAmount - userBetInfo.currentTotalBet,
            newPoints: user.points
        });
    } catch (error) {
        console.error('下注处理失败:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取游戏结果
router.get('/result/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    if (sessionId !== currentGame.sessionId) {
        return res.status(404).json({ error: '无效的游戏会话' });
    }
    res.json({
        bossStar: currentGame.bossStar,
        fighterStars: currentGame.fighterStars
    });
});

module.exports = { router, currentGame };
