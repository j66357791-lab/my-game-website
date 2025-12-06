const express = require('express');
const router = express.Router();
const { getAllUsers, adjustUserPoints, deleteUser, getDashboardData } = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 所有管理员路由都需要认证和管理员权限
router.use(authMiddleware);
router.use(adminMiddleware);

// 用户管理
router.get('/users', getAllUsers);
router.post('/points/adjust', adjustUserPoints);
router.delete('/users/:userId', deleteUser);

// 仪表盘
router.get('/dashboard', getDashboardData);

module.exports = router;
