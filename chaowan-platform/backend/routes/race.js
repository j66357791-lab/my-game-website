// backend/routes/race.js - 完整修复版本
const express = require('express');
const router = express.Router();
const { startRace, getRaceHistory, getRecentRaces, getRaceStats } = require('../controllers/raceController');

// 🔧 使用统一的认证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // 查询完整用户信息
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    
    // 设置完整的用户对象，包含 _id
    req.user = user;
    console.log('✅ 路由认证成功，用户ID:', req.user._id);
    next();
    
  } catch (error) {
    console.error('❌ 路由认证失败:', error);
    res.status(401).json({ success: false, message: '无效的token' });
  }
};

// 所有路由都需要认证
router.use(authMiddleware);

// 开始龟兔赛跑游戏
router.post('/start', startRace);

// 获取用户赛跑历史
router.get('/history', getRaceHistory);

// 获取最近10次赛跑结果
router.get('/recent', getRecentRaces);

// 🔧 新增：获取赛跑统计
router.get('/stats', getRaceStats);

module.exports = router;
