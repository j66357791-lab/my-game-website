// backend/controllers/shopController.js - 修复版
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { SHOP_CONFIG } = require('../config/constants');

// @desc    获取商品列表（支持筛选）
// @route   GET /api/shop/products
exports.getProducts = async (req, res) => {
  try {
    const { tag, categorySlug, page = 1, limit = 10 } = req.query;
    let query = { isActive: true };

    if (tag && tag !== 'all') {
      query.tags = tag;
    }

    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug });
      if (category) {
        const childCategories = await Category.find({ parentId: category._id });
        const categoryIds = [category._id, ...childCategories.map(c => c._id)];
        query.categoryId = { $in: categoryIds };
      }
    }

    const products = await Product.find(query)
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({ success: true, data: { products, total, page: parseInt(page) } });
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// @desc    获取商品详情
// @route   GET /api/shop/products/:id
exports.getProductDetail = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId');
    if (!product) return res.status(404).json({ success: false, message: '商品不存在' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// @desc    创建订单
// @route   POST /api/shop/orders
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items, address, paymentMethod, usePoints, useCash } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ success: false, message: '购物车为空' });
    if (!address || !address.receiver || !address.mobile || !address.detail) {
      return res.status(400).json({ success: false, message: '请完善收货地址' });
    }

    let orderItems = [];
    let totalPoints = 0;
    let totalCash = 0;
    let productUpdates = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ success: false, message: `商品ID ${item.productId} 不存在` });

      const sku = product.skus.find(s => s.id === item.skuId);
      if (!sku) return res.status(400).json({ success: false, message: '规格不存在' });
      if (sku.stock < item.quantity) return res.status(400).json({ success: false, message: `${product.name} 库存不足` });

      const itemPoints = sku.pricePoints * item.quantity;
      const itemCash = sku.priceCash * item.quantity;
      
      totalPoints += itemPoints;
      totalCash += itemCash;

      // ✅ 修复：字段名称匹配 Order.js 模型
      // image, productId, price (这里将现金折算成积分作为 price 存储，或者你可以改为分开存)
      orderItems.push({
        productId: product._id, // ✅ 必填
        productName: product.name,
        skuId: sku.id,
        skuName: sku.name,
        image: product.images[0] || '', // ✅ 修复：productImage -> image
        quantity: item.quantity,
        price: itemPoints + (itemCash * SHOP_CONFIG.EXCHANGE_RATE) // ✅ 修复：统一折算为积分值存储在 price 字段，或者根据业务调整
      });

      productUpdates.push({
        updateOne: {
          filter: { _id: product._id, 'skus.id': sku.id },
          update: { $inc: { 'skus.$.stock': -item.quantity, salesCount: item.quantity } }
        }
      });
    }

    const user = await User.findById(userId);
    let finalDeductPoints = 0;
    let finalDeductCash = 0;

    const userPayInPoints = usePoints + (useCash * SHOP_CONFIG.EXCHANGE_RATE);
    const priceInPoints = totalPoints + (totalCash * SHOP_CONFIG.EXCHANGE_RATE);

    if (Math.abs(userPayInPoints - priceInPoints) > 1) {
      return res.status(400).json({ success: false, message: '支付金额不匹配' });
    }

    if (user.points < usePoints) return res.status(400).json({ success: false, message: '积分不足' });
    if (user.cashBalance < useCash) return res.status(400).json({ success: false, message: '现金余额不足' });

    finalDeductPoints = usePoints;
    finalDeductCash = useCash;

    // 扣库存
    for (const update of productUpdates) {
        await Product.updateOne(update.updateOne.filter, update.updateOne.update);
    }

    // 扣余额
    user.points -= finalDeductPoints;
    user.cashBalance -= finalDeductCash;
    await user.save();

    // 生成订单
    const orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    const order = new Order({
      orderNumber,
      userId,
      // 顺便保存用户名到订单，方便后台查看
      username: user.username,
      userMobile: user.mobile,
      items: orderItems,
      totalPoints: finalDeductPoints,
      totalCash: finalDeductCash,
      address,
      paymentMethod,
      status: SHOP_CONFIG.ORDER_STATUS.PAID, 
      paidAt: new Date()
    });
    await order.save();

    if (finalDeductPoints > 0) {
      await Transaction.create({
        userId,
        type: 'shop_purchase',
        amount: -finalDeductPoints,
        balance: user.points,
        description: `商城消费: ${orderNumber}`
      });
    }
    if (finalDeductCash > 0) {
      await Transaction.create({
        userId,
        type: 'shop_purchase',
        amount: -finalDeductCash,
        balance: user.cashBalance,
        description: `商城消费: ${orderNumber}`
      });
    }

    res.status(201).json({ success: true, message: '下单成功', data: { order } });

  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ success: false, message: '下单失败，请重试' });
  }
};

// @desc    获取我的订单列表
// @route   GET /api/shop/orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// @desc    确认收货
// @route   PUT /api/shop/orders/:id/receive
exports.confirmReceive = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order.status !== SHOP_CONFIG.ORDER_STATUS.SHIPPED) {
      return res.status(400).json({ success: false, message: '订单状态不正确' });
    }

    order.status = SHOP_CONFIG.ORDER_STATUS.RECEIVED;
    // 确保你有 receivedAt 字段，如果没有会自动添加
    if (!order.receivedAt) order.receivedAt = new Date();
    
    await order.save();

    res.json({ success: true, message: '确认收货成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};
