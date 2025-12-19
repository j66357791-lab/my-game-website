// backend/routes/dolls.js - 完整修复版本
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const dollController = require('../controllers/dollController');

// 获取用户娃娃列表
router.get('/user-dolls', protect, dollController.getUserDolls);

// 购买娃娃（使用starcoin）
router.post('/purchase', protect, dollController.purchaseDoll);

// 批量购买娃娃
router.post('/purchase-batch', protect, dollController.purchaseDolls);

// 领取今日收益
router.post('/claim-daily-earnings', protect, dollController.claimDailyEarnings);

// 回收娃娃
router.delete('/recycle/:dollId', protect, dollController.recycleDoll);

// 合成娃娃
router.post('/synthesize', protect, dollController.synthesize);

// 派遣娃娃出战
router.post('/deploy', protect, dollController.deployDoll);

// 召回娃娃
router.post('/recall', protect, dollController.recallDoll);

module.exports = router;
