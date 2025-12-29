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
      'mystery_bet', 
      'mystery_win',
      'shop_purchase' // ✅ 新增：商城购买
    ]
  },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  currency: {
    type: String, 
    // ✅ 修改：增加了 'cash'
    enum: ['points', 'starcoin', 'cash'], 
    default: 'points' 
  },
  description: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // 可关联 Order ID
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
    action: String,
    orderId: String, // ✅ 新增：关联订单号
    orderItems: Array // ✅ 新增：快照商品信息
  },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
