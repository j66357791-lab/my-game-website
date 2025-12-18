// backend/routes/boss.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // 已修正
const bossController = require('../controllers/bossController');

// 挑战Boss
router.post('/challenge', protect, bossController.challengeBoss);

// 攻击Boss
router.post('/attack', protect, bossController.attackBoss);

module.exports = router;
