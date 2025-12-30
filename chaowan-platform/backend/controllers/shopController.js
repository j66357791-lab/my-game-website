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

    // 筛选版块
    if (tag && tag !== 'all') {
      query.tags = tag;
    }

    // 筛选分类（包含子分类）
    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug });
      if (category) {
        // 查找该分类及其所有子分类的ID
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

// @desc    创建订单 (支持 混合/全额积分/全额现金)
// @route   POST /api/shop/orders
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items, address, paymentMethod, usePoints, useCash } = req.body; // items: [{ skuId, quantity }]

    if (!items || items.length === 0) return res.status(400).json({ success: false, message: '购物车为空' });
    if (!address || !address.receiver || !address.mobile || !address.detail) {
      return res.status(400).json({ success: false, message: '请完善收货地址' });
    }

    // 1. 查找商品并计算价格 (原子操作防止超卖)
    let orderItems = [];
    let totalPoints = 0;
    let totalCash = 0;
    let productUpdates = []; // 用于批量更新库存

    for (const item of items) {
      const product = await Product.findById(item.productId); // 注意：前端需传 productId 或者在 sku 里找
      if (!product) return res.status(404).json({ success: false, message: `商品ID ${item.productId} 不存在` });

      const sku = product.skus.find(s => s.id === item.skuId);
      if (!sku) return res.status(400).json({ success: false, message: '规格不存在' });
      if (sku.stock < item.quantity) return res.status(400).json({ success: false, message: `${product.name} 库存不足` });

      // 计算小计
      const itemPoints = sku.pricePoints * item.quantity;
      const itemCash = sku.priceCash * item.quantity;
      
      totalPoints += itemPoints;
      totalCash += itemCash;

      orderItems.push({
        skuId: sku.id,
        productName: product.name,
        productImage: product.images[0] || '',
        skuName: sku.name,
        quantity: item.quantity,
        finalPricePoints: itemPoints,
        finalPriceCash: itemCash
      });

      // 准备库存扣减
      productUpdates.push({
        updateOne: {
          filter: { _id: product._id, 'skus.id': sku.id },
          update: { $inc: { 'skus.$.stock': -item.quantity, salesCount: item.quantity } }
        }
      });
    }

    // 2. 验证支付金额与用户余额
    // 支持混合支付逻辑：
    // 如果 paymentMethod === 'mix'，则检查 usePoints + useCash*汇率 是否足够
    // 如果 paymentMethod === 'points'，则检查 usePoints 是否等于 totalPoints
    // 如果 paymentMethod === 'cash'，则检查 useCash 是否等于 totalCash
    
    // 简化逻辑：这里严格按照 usePoints 和 useCash 字段扣款，但必须满足总价
    const user = await User.findById(userId);
    let finalDeductPoints = 0;
    let finalDeductCash = 0;

    // 基础校验：必须付够钱 (汇率换算)
    // 假设 1 现金 = 100 积分
    const userPayInPoints = usePoints + (useCash * SHOP_CONFIG.EXCHANGE_RATE);
    const priceInPoints = totalPoints + (totalCash * SHOP_CONFIG.EXCHANGE_RATE);

    if (Math.abs(userPayInPoints - priceInPoints) > 1) { // 允许1分误差
      return res.status(400).json({ success: false, message: '支付金额不匹配' });
    }

    if (user.points < usePoints) return res.status(400).json({ success: false, message: '积分不足' });
    if (user.cashBalance < useCash) return res.status(400).json({ success: false, message: '现金余额不足' });

    finalDeductPoints = usePoints;
    finalDeductCash = useCash;

    // 3. 执行数据库事务 (简化版：逐步执行，生产环境建议用 session)
    
    // 3.1 扣库存
    // 注意：上面的 productUpdates 是针对 Product skus 数组内元素的更新
    // mongoose 对数组内元素更新稍微复杂，这里用 findById + save 代替原子更新可能更稳妥，
    // 但为了性能和并发，这里使用简易原子更新逻辑：
    for (const update of productUpdates) {
        await Product.updateOne(update.updateOne.filter, update.updateOne.update);
    }

    // 3.2 扣余额
    user.points -= finalDeductPoints;
    user.cashBalance -= finalDeductCash;
    await user.save();

    // 3.3 生成订单
    const orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    const order = new Order({
      orderNumber,
      userId,
      items: orderItems,
      totalPoints: finalDeductPoints,
      totalCash: finalDeductCash,
      address,
      status: SHOP_CONFIG.ORDER_STATUS.PAID, // 余额支付直接为已支付
      paidAt: new Date()
    });
    await order.save();

    // 3.4 生成交易记录
    if (finalDeductPoints > 0) {
      await Transaction.create({
        userId,
        type: 'shop_purchase',
        amount: -finalDeductPoints,
        balance: user.points,
        currency: 'points',
        description: `商城消费: ${orderNumber}`,
        relatedId: order._id,
        metadata: { orderId: orderNumber }
      });
    }
    if (finalDeductCash > 0) {
      await Transaction.create({
        userId,
        type: 'shop_purchase',
        amount: -finalDeductCash,
        balance: user.cashBalance,
        currency: 'cash',
        description: `商城消费: ${orderNumber}`,
        relatedId: order._id,
        metadata: { orderId: orderNumber }
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
    order.receivedAt = new Date();
    await order.save();

    res.json({ success: true, message: '确认收货成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};
