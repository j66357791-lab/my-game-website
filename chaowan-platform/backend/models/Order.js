// backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String }, // 冗余存储，方便后台查看
  userMobile: { type: String }, // 冗余存储
  
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String }, // 冗余存储
    skuId: { type: String, required: true },
    skuName: { type: String }, // 冗余存储
    image: { type: String }, // 冗余存储
    quantity: { type: Number, required: true },
    price: { type: Number, required: true } // 单价（积分或现金，视具体逻辑而定，这里简化为数字）
  }],

  // 收货地址
  address: {
    receiver: { type: String },
    mobile: { type: String },
    detail: { type: String }
  },

  // 支付信息
  totalPoints: { type: Number, default: 0 },
  totalCash: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['points', 'cash', 'mix'], default: 'mix' },
  paidAt: { type: Date },

  // ✅ 物流信息 (新增)
  shipping: {
    method: { type: String, enum: ['express', 'none'], default: 'none' }, // express: 快递, none: 无需快递
    trackingNumber: { type: String, default: '' }, // 快递单号
    shippedAt: { type: Date }
  },

  status: { 
    type: String, 
    enum: ['pending_payment', 'paid', 'shipped', 'completed', 'cancelled'], 
    default: 'pending_payment' 
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
