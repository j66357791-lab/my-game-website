// backend/routes/dolls.js - 完整修复版本
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dollController = require('../controllers/dollController');

// 🔧 关键修复：使用正确的中间件
// 商店相关
router.get('/shop', dollController.getShopDolls);
router.post('/purchase', auth.protect, dollController.purchaseDoll);

// 🔧 关键修复：用户娃娃管理路由
router.get('/my', auth.protect, dollController.getUserDolls);
router.post('/:dollId/recycle', auth.protect, dollController.recycleDoll);

module.exports = router;
