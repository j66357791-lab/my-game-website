const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

// 注册路由
router.post('/register', registerUser);

// 登录路由
router.post('/login', loginUser);

module.exports = router;
