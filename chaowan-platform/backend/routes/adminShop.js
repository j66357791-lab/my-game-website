const express = require('express');
const router = express.Router();

// ✅ 1. 确保引入了新添加的 shipOrder
const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getOrders,
    shipOrder 
} = require('../controllers/adminShopController');

// 引入认证中间件
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 2. 应用中间件：所有后台接口都需要登录和管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// --- 商品管理路由 ---
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// --- 订单管理路由 ---
router.get('/orders', getOrders);

// ✅ 3. 确保添加了发货路由，路径参数名是 :orderId (和前端调用保持一致)
router.put('/orders/:orderId/ship', shipOrder);

module.exports = router;
