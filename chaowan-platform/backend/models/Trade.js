const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  buyOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'StarOrder' },
  sellOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'StarOrder' },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  total: { type: Number, required: true }, 
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Trade', TradeSchema);
