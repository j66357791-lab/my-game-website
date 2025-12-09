// backend/routes/transactions.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const transactionsController = require('../controllers/transactionsController');

const router = express.Router();

// 获取现金交易记录
router.get('/cash', authMiddleware, transactionsController.getCashTransactions);

// 获取所有交易记录（管理员用）
router.get('/all', authMiddleware, transactionsController.getAllTransactions);

module.exports = router;
