// backend/routes/vip.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const vipController = require('../controllers/vipController');

// VIP卡状态查询
router.get('/cards/status', protect, vipController.getVipStatus);

// 购买VIP卡
router.post('/cards/purchase', protect, vipController.purchaseVipCard);

// 领取每日星源币
router.post('/cards/claim-daily-starcoin', protect, vipController.claimDailyStarcoin);

module.exports = router;
