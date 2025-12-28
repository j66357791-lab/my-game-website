const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const shopController = require('../controllers/shopController');

// 公开路由 (如果允许未登录浏览)
router.get('/products', shopController.getProducts);
router.get('/products/:id', shopController.getProductDetail);

// 需要登录的路由
router.use(protect); // 应用中间件

router.post('/orders', shopController.createOrder);
router.get('/orders', shopController.getMyOrders);
router.put('/orders/:id/receive', shopController.confirmReceive);

module.exports = router;
