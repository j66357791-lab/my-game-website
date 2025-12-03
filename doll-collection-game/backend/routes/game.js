// routes/game.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const GameRecord = require('../models/GameRecord');

// 保存游戏记录
router.post('/save', auth, async (req, res) => {
    try {
        const gameData = req.body;
        gameData.userId = req.user.id;
        
        const gameRecord = new GameRecord(gameData);
        await gameRecord.save();
        
        res.json({
            success: true,
            gameId: gameRecord._id
        });
        
    } catch (error) {
        console.error('Save game record error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save game record'
        });
    }
});

// 获取游戏历史
router.get('/history', auth, async (req, res) => {
    try {
        const history = await GameRecord.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(20);
        
        res.json(history);
        
    } catch (error) {
        console.error('Get game history error:', error);
        res.status(500).json({
            message: 'Failed to get game history'
        });
    }
});

module.exports = router;
