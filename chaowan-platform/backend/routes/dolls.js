// backend/routes/dolls.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dollController = require('../controllers/dollController');

// 商店相关
router.get('/shop', dollController.getShopDolls);
router.post('/purchase', auth, dollController.purchaseDoll);

// 用户娃娃管理
router.get('/my-dolls', auth, dollController.getUserDolls);
router.post('/:dollId/recycle', auth, dollController.recycleDoll);

module.exports = router;
