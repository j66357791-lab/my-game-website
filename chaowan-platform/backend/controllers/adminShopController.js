// backend/controllers/adminShopController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
// ⬇️ 引入 Category 模型
const Category = require('../models/Category');

// --- 商品管理 ---

// 获取所有商品 (供前台使用)
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: { products } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 获取所有商品 (供后台管理使用 - 别名，对应路由里的 getAdminProducts)
const getAdminProducts = async (req, res) => {
  try {
    // 后台通常需要看到所有商品（包括下架的）
    const products = await Product.find().sort({ createdAt: -1 });
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

// --- 分类管理 (新增) ---

// 获取所有分类
const getCategories = async (req, res) => {
  try {
    // 按照排序权重 sort 字段升序，创建时间降序排列
    const categories = await Category.find().sort({ sort: 1, createdAt: -1 });
    res.json({ success: true, data: { categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 创建分类
const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, message: '分类创建成功', data: { category } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 修改分类
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedCategory) return res.status(404).json({ success: false, message: '分类不存在' });
    res.json({ success: true, message: '分类修改成功', data: { category: updatedCategory } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 删除分类 (软删除，保持一致性)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndUpdate(id, { isActive: false });
    if (!deletedCategory) return res.status(404).json({ success: false, message: '分类不存在' });
    res.json({ success: true, message: '分类已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 订单管理 ---

// 获取所有订单 (供前台/其他模块使用)
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 获取所有订单 (供后台管理使用 - 别名)
const getAdminOrders = getOrders; 

// 发货处理
const shipOrder = async (req, res) => {
  try {
    // ⚠️ 修正：路由定义的是 /orders/:id/ship，所以参数名是 id，不是 orderId
    const { id } = req.params; 
    const { method, trackingNumber } = req.body; 

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order.status !== 'paid') return res.status(400).json({ success: false, message: '订单状态不正确，当前状态: ' + order.status });

    // 如果是快递，必须填单号
    if (method === 'express' && !trackingNumber) {
      return res.status(400).json({ success: false, message: '快递发货必须填写快递单号' });
    }

    // 更新物流信息
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
  // 商品
  getProducts,       // 导出原名供可能的前台路由使用
  getAdminProducts,   // 导出别名供 adminShop.js 路由使用
  createProduct,
  updateProduct,
  deleteProduct,
  // 分类
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // 订单
  getOrders,          // 导出原名
  getAdminOrders,     // 导出别名供 adminShop.js 路由使用
  shipOrder
};
