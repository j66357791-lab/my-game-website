// backend/routes/admin.js - 完整修复版
const express = require('express');
const router = express.Router();
const { 
    getAllUsers, 
    updateUser, 
    updateUserPassword,
    toggleUserStatus,
    adjustUserPoints, 
    adjustUserCash,
    deleteUser, 
    getDashboardData,
    getMysteryCardConfig,
    updateMysteryCardConfig,
    getMysteryCardStats
} = require('../controllers/adminController');

const { 
    getAllWithdrawals, 
    processWithdrawal, 
    batchProcessWithdrawals 
} = require('../controllers/withdrawalController');

// 🔧 修复：从新的中间件文件导入
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// 所有管理员路由都需要认证和管理员权限
router.use(authMiddleware);
router.use(adminMiddleware);

// 用户管理
router.get('/users', getAllUsers);
router.put('/users/:userId', updateUser);
router.put('/users/:userId/password', updateUserPassword);
router.put('/users/:userId/toggle-status', toggleUserStatus);
router.post('/points/adjust', adjustUserPoints);
router.post('/cash/adjust', adjustUserCash);
router.delete('/users/:userId', deleteUser);

// 提现管理
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:id/process', processWithdrawal);
router.post('/withdrawals/batch-process', batchProcessWithdrawals);

// 仪表盘
router.get('/dashboard', getDashboardData);

// 🔧 神秘卡牌游戏控制
router.get('/mystery-card/config', getMysteryCardConfig);
router.post('/mystery-card/config', updateMysteryCardConfig);
router.get('/mystery-card/stats', getMysteryCardStats);

module.exports = router;
