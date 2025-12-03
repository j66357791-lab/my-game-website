const express = require('express');
const router = express.Router();
const spaceGameController = require('../controllers/spaceGameController');
const { authenticateToken } = require('../middleware/auth');

// 保存游戏记录
router.post('/save', authenticateToken, spaceGameController.saveGameRecord);

// 获取游戏历史
router.get('/history', authenticateToken, spaceGameController.getGameHistory);

// 获取游戏排行榜
router.get('/leaderboard', authenticateToken, spaceGameController.getLeaderboard);

module.exports = router;
