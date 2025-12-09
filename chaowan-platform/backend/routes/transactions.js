// backend/routes/transactions.js - 修复导入版本
const express = require('express');
const { protect } = require('../middleware/auth'); // 🔧 修复：正确导入
const transactionsController = require('../controllers/transactionsController');

const router = express.Router();

// 获取现金交易记录
router.get('/cash', protect, transactionsController.getCashTransactions);

// 获取所有交易记录（管理员用）
router.get('/all', protect, transactionsController.getAllTransactions);

module.exports = router;
