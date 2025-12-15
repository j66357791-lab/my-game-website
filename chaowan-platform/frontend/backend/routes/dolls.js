// backend/routes/dolls.js - 完整修复版本
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dollController = require('../controllers/dollController');

// 🔧 确保所有路由都有正确的回调函数
// 商店相关
router.get('/shop', dollController.getShopDolls); // 第8行，确保这里不是undefined
router.post('/purchase', auth.protect, dollController.purchaseDoll);
router.post('/purchase-batch', auth.protect, dollController.purchaseDolls);
router.post('/deploy', auth, dollController.deployDoll);
router.post('/recall', auth, dollController.recallDoll);
router.get('/deployment', auth, dollController.getDeploymentSlots);
router.post('/synthesize', auth, dollController.synthesizeDoll);

// 收益相关
router.post('/claim-earnings', auth.protect, dollController.claimDailyEarnings);

// 用户娃娃管理
router.get('/my', auth.protect, dollController.getUserDolls);
router.post('/:dollId/recycle', auth.protect, dollController.recycleDoll);

console.log('✅ dolls.js 路由配置完成');

module.exports = router;
