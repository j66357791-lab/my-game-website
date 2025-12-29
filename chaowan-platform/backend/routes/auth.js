const express = require('express');
const router = express.Router();
// 引入 protect 中间件
const { protect } = require('../middleware/auth'); 
// 引入所有控制器方法
const { 
  registerUser, 
  loginUser, 
  getCurrentUser,
  transferPoints, 
  changePassword, 
  getGameStats, 
  getUserMails, 
  claimMail 
} = require('../controllers/authController');

// 公开路由
router.post('/register', registerUser);
router.post('/login', loginUser);

// 需要认证的路由
router.get('/user', protect, getCurrentUser); // 获取用户信息
router.post('/transfer', protect, transferPoints); // 积分转增
router.post('/change-password', protect, changePassword); // 修改密码
router.get('/game-stats', protect, getGameStats); // 游戏统计
router.get('/mails', protect, getUserMails); // 获取邮件
router.post('/mails/:mailId/claim', protect, claimMail); // 领取邮件

module.exports = router;
