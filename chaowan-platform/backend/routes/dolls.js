const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const dollController = require('../controllers/dollController');

// 获取用户娃娃列表
router.get('/user-dolls', auth, dollController.getUserDolls);

// 购买娃娃（使用starcoin）
router.post('/purchase', auth, dollController.purchaseDoll);

// 批量购买娃娃
router.post('/purchase-batch', auth, dollController.purchaseDolls);

// 领取今日收益
router.post('/claim-daily-earnings', auth, dollController.claimDailyEarnings);

// 回收娃娃
router.delete('/recycle/:dollId', auth, dollController.recycleDoll);

// 🔧 新增：合成娃娃
router.post('/synthesize', auth, dollController.synthesize);

// 🔧 新增：派遣娃娃出战
router.post('/deploy', auth, dollController.deployDoll);

// 🔧 新增：召回娃娃
router.post('/recall', auth, dollController.recallDoll);

module.exports = router;
