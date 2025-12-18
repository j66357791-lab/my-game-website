// backend/routes/vipCard.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // 已修正
const vipCardController = require('../controllers/vipCardController');

// 购买VIP卡
router.post('/purchase', protect, vipCardController.purchaseVipCard); // 已修正

// 领取每日星源币
router.post('/claim-daily-starcoin', protect, vipCardController.claimDailyStarcoin); // 已修正

module.exports = router;
