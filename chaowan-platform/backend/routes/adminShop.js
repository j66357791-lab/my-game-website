const express = require('express');
const router = express.Router();

// ✅ 引入控制器
const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getOrders,
    shipOrder 
} = require('../controllers/adminShopController');

// ✅ 修正：引入中间件，变量名必须与 server.js 中保持一致
// 你的项目里用的是 protect 和 admin
const { protect, admin } = require('../middleware/auth');

// 应用中间件
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

module.exports = router;
