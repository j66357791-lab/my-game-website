const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const adminShopController = require('../controllers/adminShopController');

// 需要管理员权限
router.use(protect);
router.use(admin);

// 分类
router.post('/categories', adminShopController.createCategory);
router.get('/categories', adminShopController.getCategories);
router.put('/categories/:id', adminShopController.updateCategory);
router.delete('/categories/:id', adminShopController.deleteCategory);

// 商品
router.post('/products', adminShopController.createProduct);
router.get('/products', adminShopController.getAdminProducts);
router.put('/products/:id', adminShopController.updateProduct);
router.delete('/products/:id', adminShopController.deleteProduct);

// 订单
router.get('/orders', adminShopController.getAdminOrders);
router.put('/orders/:id/ship', adminShopController.shipOrder);

module.exports = router;
