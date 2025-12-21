// backend/routes/vip.js
const express = require('express');
const router = express.Router();
const vipController = require('../controllers/vipController');
const { protect } = require('../middleware/auth'); // 🔧 修改这里：解构出 protect

router.post('/purchase', protect, vipController.purchaseVipCard); // 🔧 修改这里：使用 protect
router.post('/claim', protect, vipController.claimDailyVipReward); // 🔧 修改这里：使用 protect

module.exports = router;
