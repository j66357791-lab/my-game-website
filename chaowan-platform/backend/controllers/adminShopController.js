// backend/controllers/adminShopController.js - 完整修复版
const Order = require('../models/Order');
const Product = require('../models/Product');

// --- 商品管理 ---

// 获取所有商品
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: { products } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 创建商品
const createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ success: true, message: '商品发布成功', data: { product: newProduct } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 修改商品
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedProduct) return res.status(404).json({ success: false, message: '商品不存在' });
    res.json({ success: true, message: '商品修改成功', data: { product: updatedProduct } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 下架商品 (软删除)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndUpdate(id, { isActive: false });
    if (!deletedProduct) return res.status(404).json({ success: false, message: '商品不存在' });
    res.json({ success: true, message: '商品已下架' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 订单管理 ---

// ✅ 修复：获取所有订单 (支持搜索和筛选)
const getOrders = async (req, res) => {
  try {
    // 获取前端传来的查询参数
    const { status, search } = req.query;
    const query = {};

    // 1. 状态筛选 (如果传了 status 且不为 'all')
    if (status && status !== 'all') {
      query.status = status;
    }

    // 2. 搜索功能 (如果传了 search)
    if (search) {
      // 使用正则匹配订单号，忽略大小写
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 发货处理 (支持快递/无快递)
const shipOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { method, trackingNumber } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order.status !== 'paid') return res.status(400).json({ success: false, message: '订单状态不正确，当前状态: ' + order.status });

    if (method === 'express' && !trackingNumber) {
      return res.status(400).json({ success: false, message: '快递发货必须填写快递单号' });
    }

    order.shipping = {
      method: method || 'none',
      trackingNumber: trackingNumber || '',
      shippedAt: new Date()
    };
    order.status = 'shipped';
    order.updatedAt = new Date();
    
    await order.save();

    res.json({ success: true, message: '发货成功', order });
  } catch (error) {
    console.error('发货错误:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  shipOrder
};
