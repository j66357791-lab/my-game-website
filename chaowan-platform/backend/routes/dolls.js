// backend/routes/dolls.js - 最简化版本
const express = require('express');
const router = express.Router();

// 🔧 临时移除有问题的路由，让应用先启动
// 商店相关
router.get('/shop', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        level: 1,
        name: '萌新宝宝',
        emoji: '👶',
        description: '新用户的入门级伙伴，可爱又贴心',
        rarity: '⭐',
        purchasePrice: 50,
        productionPerDay: 0.88,
        totalDays: 60,
        isAvailable: true
      },
      {
        level: 2,
        name: '元气宝贝',
        emoji: '⚡',
        description: '充满活力的进阶伙伴，产出效率更高',
        rarity: '⭐⭐',
        purchasePrice: 250,
        productionPerDay: 3.88,
        totalDays: 70,
        isAvailable: true
      }
    ]
  });
});

// 🔧 临时简化购买路由
router.post('/purchase', async (req, res) => {
  try {
    console.log('🧸 临时购买接口被调用');
    console.log('📡 请求体:', req.body);
    
    res.json({
      success: false,
      message: '购买功能暂时维护中，请稍后再试'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 🔧 临时简化获取娃娃列表路由
router.get('/my', async (req, res) => {
  try {
    res.json({
      success: true,
      data: { dolls: [] }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 🔧 临时简化回收路由
router.post('/:dollId/recycle', async (req, res) => {
  try {
    res.json({
      success: false,
      message: '回收功能暂时维护中，请稍后再试'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
