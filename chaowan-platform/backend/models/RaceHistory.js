// backend/models/RaceHistory.js
const mongoose = require('mongoose');

const raceHistorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  betType: { 
    type: String, 
    enum: ['points', 'starcoin'], 
    required: true 
  },
  betAmount: { 
    type: Number, 
    required: true,
    min: 1
  },
  betChoice: { 
    type: String, 
    enum: ['turtle', 'rabbit'], 
    required: true 
  },
  winner: { 
    type: String, 
    enum: ['turtle', 'rabbit'], 
    required: true 
  },
  result: { 
    type: String, 
    enum: ['win', 'lose'], 
    required: true 
  },
  rewardAmount: { 
    type: Number, 
    required: true 
  },
  balanceChange: { 
    type: Number, 
    required: true 
  },
  newBalance: { 
    type: Number, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// 索引优化
raceHistorySchema.index({ userId: 1, createdAt: -1 });
raceHistorySchema.index({ result: 1, createdAt: -1 });

module.exports = mongoose.model('RaceHistory', raceHistorySchema);
