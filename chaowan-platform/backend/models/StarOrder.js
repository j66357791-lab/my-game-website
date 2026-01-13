const mongoose = require('mongoose');

const StarOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['buy', 'sell'], required: true }, 
  price: { type: Number, required: true },   
  amount: { type: Number, required: true },  
  filledAmount: { type: Number, default: 0 }, 
  status: { type: String, default: 'open', enum: ['open', 'partial', 'filled', 'canceled'] },
  createdAt: { type: Date, default: Date.now, index: true }
});

// 优化撮合查询速度
StarOrderSchema.index({ status: 1, type: 1, price: -1, createdAt: 1 });

module.exports = mongoose.model('StarOrder', StarOrderSchema);
