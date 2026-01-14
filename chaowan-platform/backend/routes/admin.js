const express = require('express');
const router = express.Router();

// 🔧 修正引用：从 auth.js 引入 protect 和 admin
const { protect, admin } = require('../middleware/auth');

const { 
    getAllUsers, 
    updateUser, 
    updateUserPassword,
    toggleUserStatus,
    adjustUserPoints, 
    adjustUserCash,
    deleteUser, 
    getDashboardData 
} = require('../controllers/adminController');

const { 
    getAllWithdrawals, 
    processWithdrawal, 
    batchProcessWithdrawals 
} = require('../controllers/withdrawalController');

// 所有管理员路由都需要认证和管理员权限
// ✅ 修改：使用 protect 替代 authMiddleware
router.use(protect);
// ✅ 修改：使用 admin 替代 adminMiddleware
router.use(admin);

// 用户管理
router.get('/users', getAllUsers);
router.put('/users/:userId', updateUser);
router.put('/users/:userId/password', updateUserPassword);
router.put('/users/:userId/toggle-status', toggleUserStatus);
router.post('/points/adjust', adjustUserPoints);
router.post('/cash/adjust', adjustUserCash);
router.delete('/users/:userId', deleteUser);

// 🔧 新增：提现管理
router.get('/withdrawals', getAllWithdrawals);
router.put('/withdrawals/:id/process', processWithdrawal);
router.post('/withdrawals/batch-process', batchProcessWithdrawals);

// 仪表盘
router.get('/dashboard', getDashboardData);

module.exports = router;
