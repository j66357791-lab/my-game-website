// backend/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    required: true,
    enum: [
      'checkin',
      'purchase',
      'production',
      'recycle',
      'register',
      'level_up',
      'admin_add',
      'admin_deduct',
      'doll_purchase',
      'vip_purchase',
      'vip_reward',
      'boss_integral',
      'race_win',
      'race_lose',
      'race_bet',
      'mystery_bet', // 🔧 新增：神秘卡牌下注
      'mystery_win'  // 🔧 新增：神秘卡牌获胜
    ]
  },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  currency: {
    type: String, 
    enum: ['points', 'starcoin'], 
    default: 'points' 
  },
  description: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  metadata: {
    dollLevel: Number,
    dollName: String,
    oldLevel: Number,
    newLevel: Number,
    streak: Number,
    vipType: String,
    bossId: String,
    damage: Number,
    betChoice: String,
    winner: String,
    betAmount: Number,
    rewardAmount: Number,
    balanceChange: Number,
    action: String
  },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
