// backend/routes/boss.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const bossController = require('../controllers/bossController');

// 现有路由保持不变
router.post('/challenge', protect, bossController.challengeBoss);
router.post('/attack', protect, bossController.attackBoss);

// 新增：Boss状态查询
router.get('/status', protect, bossController.getBossStatus);

module.exports = router;
