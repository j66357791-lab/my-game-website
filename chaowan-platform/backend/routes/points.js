// backend/routes/points.js - 修复导入版本
const express = require('express');
const { protect } = require('../middleware/auth'); // 🔧 修复：正确导入
const pointsController = require('../controllers/pointsController');

const router = express.Router();

// 获取积分历史
router.get('/history', protect, pointsController.getPointsHistory);

// 获取积分统计
router.get('/stats', protect, pointsController.getPointsStats);

module.exports = router;
