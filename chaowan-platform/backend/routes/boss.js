// backend/routes/boss.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const bossController = require('../controllers/bossController');

// 挑战Boss
router.post('/challenge', auth, bossController.challengeBoss);

// 攻击Boss
router.post('/attack', auth, bossController.attackBoss);

module.exports = router;
