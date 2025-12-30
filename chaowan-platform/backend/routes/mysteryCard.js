// backend/routes/mysteryCard.js
const express = require('express');
const MysteryCardController = require('../controllers/mysteryCardController');

const router = express.Router();

// 认证中间件（直接定义，避免导入问题）
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    User.findById(decoded.userId).select('-password').then(user => {
      if (!user) {
        return res.status(401).json({ success: false, message: '用户不存在' });
      }
      
      req.user = user;
      next();
    }).catch(error => {
      console.error('❌ 认证查询失败:', error);
      res.status(401).json({ success: false, message: '认证失败' });
    });
    
  } catch (error) {
    console.error('❌ JWT验证失败:', error);
    res.status(401).json({ success: false, message: '无效的token' });
  }
};

// 获取游戏历史
router.get('/history', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const controller = new MysteryCardController();
    const history = await controller.getGameHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取游戏历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取游戏历史失败'
    });
  }
});

// 获取用户游戏历史
router.get('/user-history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50 } = req.query;
    const controller = new MysteryCardController();
    const history = await controller.getUserGameHistory(userId, limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取用户游戏历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户游戏历史失败'
    });
  }
});

module.exports = router;
