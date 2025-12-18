const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth'); // 改这里
const dollController = require('../controllers/dollController');

// 获取用户娃娃列表
router.get('/user-dolls', protect, dollController.getUserDolls); // 改这里

// 购买娃娃（使用starcoin）
router.post('/purchase', protect, dollController.purchaseDoll); // 改这里

// 批量购买娃娃
router.post('/purchase-batch', protect, dollController.purchaseDolls); // 改这里

// 领取今日收益
router.post('/claim-daily-earnings', protect, dollController.claimDailyEarnings); // 改这里

// 回收娃娃
router.delete('/recycle/:dollId', protect, dollController.recycleDoll); // 改这里

// 🔧 新增：合成娃娃
router.post('/synthesize', protect, dollController.synthesize); // 改这里

// 🔧 新增：派遣娃娃出战
router.post('/deploy', protect, dollController.deployDoll); // 改这里

// 🔧 新增：召回娃娃
router.post('/recall', protect, dollController.recallDoll); // 改这里

module.exports = router;
