const mongoose = require('mongoose');

const blindBoxRewardSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rewardType: { 
    type: String, 
    required: true 
  }, // 奖励类型
  amount: { 
    type: Number, 
    required: true 
  }, // 金额
  charsUsed: [String], // 使用的字符
  status: { 
    type: String, 
    default: 'completed',
    enum: ['pending', 'completed', 'failed']
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 索引优化
blindBoxRewardSchema.index({ userId: 1, createdAt: -1 });
blindBoxRewardSchema.index({ status: 1 });

module.exports = mongoose.model('blindBoxReward', blindBoxRewardSchema);
