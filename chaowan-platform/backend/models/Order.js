const mongoose = require('mongoose');
const { SHOP_CONFIG } = require('../config/constants');

const orderItemSchema = new mongoose.Schema({
  skuId: { type: String, required: true },
  productName: String,
  productImage: String,
  skuName: String, // 规格: "红色/L码"
  pricePointsPaid: { type: Number, default: 0 }, // 实际支付积分
  priceCashPaid: { type: Number, default: 0 },   // 实际支付现金
  quantity: { type: Number, required: true },
  finalPricePoints: Number, // 小计积分
  finalPriceCash: Number   // 小计现金
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalPoints: { type: Number, default: 0 }, // 订单总积分
  totalCash: { type: Number, default: 0 },   // 订单总现金
  status: { 
    type: String, 
    enum: Object.values(SHOP_CONFIG.ORDER_STATUS), 
    default: SHOP_CONFIG.ORDER_STATUS.PENDING_PAYMENT 
  },
  address: {
    receiver: String,
    mobile: String,
    detail: String
  },
  remark: String, // 用户备注
  paidAt: Date,   // 支付时间
  shippedAt: Date, // 发货时间
  receivedAt: Date // 收货时间
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
