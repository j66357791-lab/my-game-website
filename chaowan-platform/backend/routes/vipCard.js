// backend/routes/vipCard.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const vipCardController = require('../controllers/vipCardController');

// 购买VIP卡
router.post('/purchase', auth, vipCardController.purchaseVipCard);

// 领取每日星源币
router.post('/claim-daily-starcoin', auth, vipCardController.claimDailyStarcoin);

module.exports = router;
