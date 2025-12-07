// backend/routes/dolls.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dollController = require('../controllers/dollController');

// 🔧 关键修复：路由路径标准化
// 商店相关
router.get('/shop', dollController.getShopDolls);
router.post('/purchase', auth, dollController.purchaseDoll);

// 🔧 关键修复：用户娃娃管理路由
router.get('/my', auth, dollController.getUserDolls); // 修复：/my-dolls -> /my
router.post('/:dollId/recycle', auth, dollController.recycleDoll);

module.exports = router;
