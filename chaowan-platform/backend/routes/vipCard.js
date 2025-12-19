// backend/routes/vipCard.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const vipCardController = require('../controllers/vipCardController');

// 现有路由保持不变
router.post('/purchase', protect, vipCardController.purchaseVipCard);
router.post('/claim-daily-starcoin', protect, vipCardController.claimDailyStarcoin);

// 新增：VIP状态查询
router.get('/status', protect, vipCardController.getVipStatus);

module.exports = router;
