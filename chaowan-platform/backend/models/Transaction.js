// backend/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // 关联用户
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 交易信息
  type: { 
    type: String, 
    required: true,
    enum: [
      'checkin',        // 签到奖励
      'purchase',       // 购买娃娃
      'production',     // 娃娃产出
      'recycle',        // 回收娃娃
      'register',       // 注册奖励
      'level_up',       // 升级奖励
      'admin_add',      // 管理员增加
      'admin_deduct'    // 管理员扣除
    ]
  },
  amount: { type: Number, required: true }, // 正数为收入，负数为支出
  balance: { type: Number, required: true }, // 交易后余额
  
  // 描述信息
  description: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // 关联的娃娃ID等
  
  // 元数据
  metadata: {
    dollLevel: Number,
    dollName: String,
    oldLevel: Number,
    newLevel: Number,
    streak: Number
  },
  
  // 系统字段
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// 索引优化
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
