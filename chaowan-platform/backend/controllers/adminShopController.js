// backend/controllers/adminShopController.js - 新增退款功能版
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User'); // ✅ 新增
const Transaction = require('../models/Transaction'); // ✅ 新增
const { SHOP_CONFIG } = require('../config/constants'); // ✅ 新增

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

// 获取所有订单 (支持搜索和筛选)
const getOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
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

// 发货处理
const shipOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { method, trackingNumber } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order.status !== 'paid') return res.status(400).json({ success: false, message: '订单状态不正确' });

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

// ✅ 新增：退回订单（退款）
const refundOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });

    // 只有待发货或已发货的订单可以退款，已完结或已取消的不行
    if (order.status === 'cancelled' || order.status === 'completed') {
      return res.status(400).json({ success: false, message: '该订单无法退款' });
    }

    // 1. 查找用户并退还货币
    const user = await User.findById(order.userId);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

    let refundPoints = order.totalPoints;
    let refundCash = order.totalCash;

    // 更新用户余额
    user.points += refundPoints;
    user.cashBalance += refundCash;
    await user.save();

    // 2. 生成退款交易记录
    if (refundPoints > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'order_refund',
        amount: refundPoints, // 正数表示增加
        balance: user.points,
        description: `订单退款(积分): ${order.orderNumber}`
      });
    }
    if (refundCash > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'order_refund',
        amount: refundCash,
        balance: user.cashBalance,
        description: `订单退款(现金): ${order.orderNumber}`
      });
    }

    // 3. 回退商品库存 (重要：防止库存丢失)
    for (const item of order.items) {
      // 找到对应的商品和规格，把库存加回去，销量减回去
      await Product.updateOne(
        { _id: item.productId, 'skus.id': item.skuId },
        { $inc: { 'skus.$.stock': item.quantity, salesCount: -item.quantity } }
      );
    }

    // 4. 更新订单状态为已取消
    order.status = 'cancelled';
    order.updatedAt = new Date();
    await order.save();

    res.json({ success: true, message: '退款成功，款项已退回用户账户' });

  } catch (error) {
    console.error('退款错误:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  shipOrder,
  refundOrder // ✅ 导出
};
