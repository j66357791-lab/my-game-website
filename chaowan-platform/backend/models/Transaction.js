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
      'purchase',       // 原有购买（需明确用途）
      'production',     // 娃娃产出
      'recycle',        // 回收娃娃
      'register',       // 注册奖励
      'level_up',       // 升级奖励
      'admin_add',      // 管理员增加
      'admin_deduct',   // 管理员扣除
      'doll_purchase',  // 🔧 新增：娃娃购买（starcoin）
      'vip_purchase',   // 🔧 新增：VIP卡购买（points）
      'vip_reward',     // 🔧 新增：VIP每日星源币
      'boss_integral',  // 🔧 新增：Boss积分掉落
      'race_win',       // 🔧 新增：龟兔赛跑获胜
      'race_lose'       // 🔧 新增：龟兔赛跑失败
    ]
  },
  amount: { type: Number, required: true }, // 正数为收入，负数为支出
  balance: { type: Number, required: true }, // 交易后余额
  currency: {  // 🔧 新增：货币类型（points/starcoin）
    type: String, 
    enum: ['points', 'starcoin'], 
    default: 'points' 
  },
  
  // 描述信息
  description: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // 关联的娃娃ID等
  
  // 元数据
  metadata: {
    dollLevel: Number,
    dollName: String,
    oldLevel: Number,
    newLevel: Number,
    streak: Number,
    vipType: String,       // 🔧 新增：VIP卡类型（monthly/quarterly/yearly）
    bossId: String,        // 🔧 新增：Boss ID
    damage: Number,        // 🔧 新增：Boss伤害值
    betChoice: String,     // 🔧 新增：龟兔赛跑投注选择（turtle/rabbit）
    winner: String,        // 🔧 新增：龟兔赛跑胜者（turtle/rabbit）
    betAmount: Number,     // 🔧 新增：龟兔赛跑投注金额
    rewardAmount: Number   // 🔧 新增：龟兔赛跑奖励金额
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
