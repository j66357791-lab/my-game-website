// backend/controllers/adminShopController.js - 调试增强版
const Order = require('../models/Order');
const Product = require('../models/Product');

// --- 商品管理 ---
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: { products } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ success: true, message: '商品发布成功', data: { product: newProduct } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

// ✅ 获取所有订单 (带调试日志)
const getOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    
    // ✅ 调试日志：打印后端收到的参数
    console.log('🔍 [后端] 收到请求参数:', { status, search });

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
      console.log('✅ [后端] 筛选状态已应用:', status);
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
      console.log('✅ [后端] 搜索关键词已应用:', search);
    }

    console.log('🚀 [后端] 最终查询条件:', query);

    const orders = await Order.find(query).sort({ createdAt: -1 });
    
    console.log('📊 [后端] 查询结果数量:', orders.length);
    
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
