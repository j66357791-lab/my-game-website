// backend/routes/vip.js
const express = require('express');
const router = express.Router();
const vipController = require('../controllers/vipController');
const auth = require('../middleware/auth'); // 假设你有auth中间件

router.post('/purchase', auth, vipController.purchaseVipCard);
router.post('/claim', auth, vipController.claimDailyVipReward);

module.exports = router;
