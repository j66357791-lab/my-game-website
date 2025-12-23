const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MysteryCardBetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  roundNumber: { type: Number, required: true },
  general: { type: String, required: true, enum: ['east', 'south', 'west', 'north'] },
  amount: { type: Number, required: true },
  choice: { type: String, required: true, enum: ['win', 'lose'] },
  status: { type: String, default: 'pending' },
  result: { type: String },
  winAmount: { type: Number, default: 0 },
  lordCard: Number,
  generalCard: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MysteryCardBet', MysteryCardBetSchema);
