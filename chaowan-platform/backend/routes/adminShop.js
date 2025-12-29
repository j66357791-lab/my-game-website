// backend/routes/adminShop.js
const express = require('express');
const router = express.Router();

// ✅ 统一引入控制器 (包含 refundOrder)
const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getOrders,
    shipOrder,
    refundOrder 
} = require('../controllers/adminShopController');

// ✅ 引入中间件
const { protect, admin } = require('../middleware/auth');

// 应用中间件 (此文件下的所有路由都需要登录且是管理员)
router.use(protect);
router.use(admin);

// --- 商品管理路由 ---
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// --- 订单管理路由 ---
router.get('/orders', getOrders);
router.put('/orders/:orderId/ship', shipOrder);

// ✅ 新增退款路由 (无需再写 protect, admin，因为上面已经全局应用了)
router.put('/orders/:orderId/refund', refundOrder); 

module.exports = router;
