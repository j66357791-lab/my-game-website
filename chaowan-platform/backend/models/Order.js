const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String }, 
  userMobile: { type: String }, 
  
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String }, 
    skuId: { type: String, required: true },
    skuName: { type: String }, 
    image: { type: String }, 
    quantity: { type: Number, required: true },
    price: { type: Number, required: true } 
  }],

  address: {
    receiver: { type: String },
    mobile: { type: String },
    detail: { type: String }
  },

  totalPoints: { type: Number, default: 0 },
  totalCash: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['points', 'cash', 'mix'], default: 'mix' },
  paidAt: { type: Date },

  shipping: {
    method: { type: String, enum: ['express', 'none'], default: 'none' },
    trackingNumber: { type: String, default: '' },
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
