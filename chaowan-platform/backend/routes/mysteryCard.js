const express = require('express');
const router = express.Router();
const mysteryCardController = require('../controllers/mysteryCardController');
const { authMiddleware } = require('../middleware/auth');

// ==================== 游戏相关路由 ====================

// 🔧 公开接口：获取游戏历史（用于前端走势图）
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const result = await mysteryCardController.getPublicHistory(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '获取历史失败' });
  }
});

// 🔧 需要认证的接口
router.use(authMiddleware);

// 处理下注
router.post('/bet', async (req, res) => {
  try {
    const { userId, general, amount } = req.body;
    const result = await mysteryCardController.processBet(userId, general, amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: '下注处理失败' });
  }
});

// 结算下注
router.post('/settle', async (req, res) => {
  try {
    const { userId, general, amount, lordStar, generalStar } = req.body;
    const result = await mysteryCardController.settleBet(userId, general, amount, lordStar, generalStar);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '结算处理失败' });
  }
});

// 保存游戏记录
router.post('/save-round', async (req, res) => {
  try {
    const gameData = req.body;
    const record = await mysteryCardController.saveRoundRecord(gameData);
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: '保存游戏记录失败' });
  }
});

// 获取游戏历史（管理员或用户查看）
router.get('/game-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await mysteryCardController.getGameHistory(limit);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取游戏历史失败' });
  }
});

// 获取用户游戏历史
router.get('/user-history', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const history = await mysteryCardController.getUserGameHistory(userId, limit);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户历史失败' });
  }
});

module.exports = router;
