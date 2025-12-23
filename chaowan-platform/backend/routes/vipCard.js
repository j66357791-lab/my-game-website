// backend/routes/vip-cards.js - 完整版本
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const vipCardController = require('../controllers/vipCardController');

// 获取VIP状态
router.get('/status', protect, vipCardController.getVipStatus);

// 购买VIP卡
router.post('/purchase', protect, vipCardController.purchaseVipCard);

// 领取每日星源币
router.post('/claim-daily-starcoin', protect, vipCardController.claimDailyStarcoin);

module.exports = router;
