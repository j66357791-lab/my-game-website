// backend/routes/index.js - 添加race路由
const express = require('express');
const router = express.Router();

// 导入路由
const authRoutes = require('./auth');
const blindBoxRoutes = require('./blindBox');
const checkinRoutes = require('./checkin');
const dollRoutes = require('./dolls');
const gameRoutes = require('./game');
const refiningFactoryRoutes = require('./refiningFactory');
const vipCardRoutes = require('./vipCard');
const bossRoutes = require('./boss');
const raceRoutes = require('./race'); // 🔧 新增

// 使用路由
router.use('/auth', authRoutes);
router.use('/blind-box', blindBoxRoutes);
router.use('/checkin', checkinRoutes);
router.use('/dolls', dollRoutes);
router.use('/game', gameRoutes);
router.use('/refining-factory', refiningFactoryRoutes);
router.use('/vip-card', vipCardRoutes);
router.use('/boss', bossRoutes);
router.use('/race', raceRoutes); // 🔧 新增

module.exports = router;
