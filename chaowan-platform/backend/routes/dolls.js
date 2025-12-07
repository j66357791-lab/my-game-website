// backend/routes/dolls.js - 添加新路由
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dollController = require('../controllers/dollController');

// 商店相关
router.get('/shop', dollController.getShopDolls);
router.post('/purchase', auth.protect, dollController.purchaseDoll); // 单个购买
router.post('/purchase-batch', auth.protect, dollController.purchaseDolls); // 🔧 批量购买

// 🔧 新增：收益领取
router.post('/claim-earnings', auth.protect, dollController.claimDailyEarnings);

// 用户娃娃管理
router.get('/my', auth.protect, dollController.getUserDolls);
router.post('/:dollId/recycle', auth.protect, dollController.recycleDoll);

module.exports = router;
