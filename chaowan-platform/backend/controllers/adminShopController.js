const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const { SHOP_CONFIG } = require('../config/constants');

// --- 分类管理 ---

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    // 返回树形结构或平铺，这里简单平铺，前端处理树
    const categories = await Category.find({ isActive: true }).sort({ sort: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 商品管理 ---

exports.createProduct = async (req, res) => {
  try {
    // createdBy 由中间件注入 req.user? 你的 admin 中间件没注入，这里手动加一下
    req.body.createdBy = req.user._id; 
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, name } = req.query;
    let query = {};
    if (name) query.name = { $regex: name, $options: 'i' };

    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Product.countDocuments(query);
    res.json({ success: true, data: { products, total, page: parseInt(page) } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    // 软删除，设为 isActive: false
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: '商品已下架' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 订单管理 ---

exports.getAdminOrders = async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    let query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(20)
      .skip((page - 1) * 20);
      
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

exports.shipOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order.status !== SHOP_CONFIG.ORDER_STATUS.PAID) {
      return res.status(400).json({ success: false, message: '订单未支付' });
    }

    order.status = SHOP_CONFIG.ORDER_STATUS.SHIPPED;
    order.shippedAt = new Date();
    await order.save();

    res.json({ success: true, message: '发货成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
