// backend/routes/mysteryCard.js - 完整修复版
const express = require('express');
const router = express.Router();
const mysteryCardController = require('../controllers/mysteryCardController');
const authMiddleware = require('../middleware/authMiddleware');

// ==================== 公开路由（无需认证）====================

// 🔧 获取游戏历史（用于前端走势图）
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const result = await mysteryCardController.getPublicHistory(limit);
    res.json(result);
  } catch (error) {
    console.error('获取历史失败:', error);
    res.status(500).json({ success: false, message: '获取历史失败' });
  }
});

// ==================== 需要认证的路由 ====================

// 应用认证中间件（以下所有路由都需要登录）
router.use(authMiddleware);

// 处理下注
router.post('/bet', async (req, res) => {
  try {
    const { userId, general, amount } = req.body;
    
    // 验证：只能操作自己的下注
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权操作其他用户的下注' });
    }
    
    const result = await mysteryCardController.processBet(userId, general, amount);
    res.json(result);
  } catch (error) {
    console.error('下注处理失败:', error);
    res.status(500).json({ success: false, message: '下注处理失败' });
  }
});

// 结算下注
router.post('/settle', async (req, res) => {
  try {
    const { userId, general, amount, lordStar, generalStar } = req.body;
    
    // 验证：只能操作自己的结算
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权操作其他用户的结算' });
    }
    
    const result = await mysteryCardController.settleBet(userId, general, amount, lordStar, generalStar);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('结算处理失败:', error);
    res.status(500).json({ success: false, message: '结算处理失败' });
  }
});

// 保存游戏记录
router.post('/save-round', async (req, res) => {
  try {
    const gameData = req.body;
    
    // 验证：只有管理员可以保存游戏记录
    if (req.user.role !== 'admin' && req.user.email !== 'admin@example.com') {
      return res.status(403).json({ success: false, message: '无权保存游戏记录' });
    }
    
    const record = await mysteryCardController.saveRoundRecord(gameData);
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('保存游戏记录失败:', error);
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
    console.error('获取游戏历史失败:', error);
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
    console.error('获取用户历史失败:', error);
    res.status(500).json({ success: false, message: '获取用户历史失败' });
  }
});

module.exports = router;
