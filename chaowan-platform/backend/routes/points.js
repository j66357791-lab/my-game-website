// backend/routes/points.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const pointsController = require('../controllers/pointsController');

const router = express.Router();

// 获取积分历史
router.get('/history', authMiddleware, pointsController.getPointsHistory);

// 获取积分统计
router.get('/stats', authMiddleware, pointsController.getPointsStats);

module.exports = router;
