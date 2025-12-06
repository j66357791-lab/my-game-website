// backend/routes/admin.js

const express = require('express');
const router = express.Router();
const authAdmin = require('../middleware/authAdmin');
const {
    getAllUsers,
    updateUserPoints,
    getUserDolls
} = require('../controllers/adminController');

// 所有此路由下的接口都需要先通过authAdmin中间件验证
router.use(authAdmin);

router.get('/users', getAllUsers);
router.put('/users/:userId/points', updateUserPoints);
router.get('/users/:userId/dolls', getUserDolls);

module.exports = router;
