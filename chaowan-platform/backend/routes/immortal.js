const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyDoll, createDoll, collectSpirit, upgradeSpiritPool } = require('../controllers/immortalController');

// 所有路由都需要登录验证
router.use(protect);

// 获取娃娃信息
router.get('/my-doll', getMyDoll);

// 创建娃娃
router.post('/create', createDoll);

// ✅ 新增：领取灵气
router.post('/collect-spirit', collectSpirit);

// ✅ 新增：升级灵气池
router.post('/upgrade-pool', upgradeSpiritPool);

module.exports = router;
