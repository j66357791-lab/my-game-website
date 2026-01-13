const mongoose = require('mongoose');

const StarKlineSchema = new mongoose.Schema({
  period: { type: String, default: '1m' }, 
  time: { type: Date, required: true },    
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
  amount: Number
});

StarKlineSchema.index({ period: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('StarKline', StarKlineSchema);
