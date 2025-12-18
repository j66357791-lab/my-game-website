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
      'checkin',           // 签到奖励
      'purchase',          // 购买娃娃
      'production',        // 娃娃产出
      'recycle',           // 回收娃娃
      'register',          // 注册奖励
      'level_up',          // 升级奖励
      'admin_add',         // 管理员增加
      'admin_deduct',      // 管理员扣除
      'admin_cash_add',     // 管理员增加现金
      'admin_cash_deduct',  // 管理员扣除现金
      'game_bet',          // 游戏下注
      'game_win',          // 游戏获胜
      'game_lose',         // 游戏失败
      'blind_box_draw',    // 盲盒抽取
      'blind_box_exchange', // 盲盒兑换
      'refining_input',     // 炼化投入
      'refining_output'    // 炼化产出
    ]
  },
  amount: { type: Number, required: true }, // 正数为收入，负数为支出
  balance: { type: Number, required: true }, // 交易后余额
  
  // 描述信息
  description: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // 关联的娃娃ID等
  
  // 元数据 - 扩展支持游戏数据
  metadata: {
    // 娃娃相关
    dollLevel: Number,
    dollName: String,
    oldLevel: Number,
    newLevel: Number,
    streak: Number,
    
    // 游戏相关
    sessionId: String,
    gameType: String,
    betDetails: {
      icon: String,
      amount: Number
    },
    winningIcons: [String],
    rewardAmount: Number,
    lostAmount: Number,
    
    // 盲盒相关
    drawType: String, // 'single' | 'ten'
    rewards: Array,
    
    // 炼化相关
    inputCharacters: [String],
    outputPoints: Number,
    
    // 提现相关
    withdrawalId: String,
    alipayAccount: String
  },
  
  // 系统字段
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// 索引优化
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ 'metadata.sessionId': 1 });
transactionSchema.index({ 'metadata.gameType': 1 });

// 虚拟字段 - 获取交易图标
transactionSchema.virtual('icon').get(function() {
  const icons = {
    'game_bet': '🎲',
    'game_win': '🏆',
    'game_lose': '😔',
    'checkin': '📅',
    'register': '🎉',
    'admin_add': '➕',
    'admin_deduct': '➖',
    'admin_cash_add': '💰',
    'admin_cash_deduct': '💸',
    'purchase': '🛍️',
    'recycle': '♻️',
    'production': '🧸',
    'level_up': '⭐',
    'blind_box_draw': '🎁',
    'blind_box_exchange': '🔄',
    'refining_input': '🔥',
    'refining_output': '✨'
  };
  return icons[this.type] || '💰';
});

// 虚拟字段 - 获取交易颜色
transactionSchema.virtual('color').get(function() {
  if (this.type.includes('win') || this.type.includes('register') || 
      this.type.includes('checkin') || this.type.includes('production') ||
      this.type.includes('refining_output') || this.type.includes('admin_cash_add')) {
    return '#4CAF50';
  }
  if (this.type.includes('lose') || this.type.includes('bet') || 
      this.type.includes('deduct') || this.type.includes('recycle') ||
      this.type.includes('refining_input') || this.type.includes('admin_cash_deduct')) {
    return '#f44336';
  }
  if (this.type.includes('blind_box')) {
    return '#FF9800';
  }
  return '#2196F3';
});

// 实例方法 - 格式化显示金额
transactionSchema.methods.formatAmount = function() {
  const absAmount = Math.abs(this.amount);
  if (absAmount >= 10000) {
    return (absAmount / 10000).toFixed(1) + 'w';
  }
  return absAmount.toFixed(absAmount % 1 === 0 ? 0 : 2);
};

// 静态方法 - 获取用户游戏交易记录
transactionSchema.statics.getGameTransactions = function(userId, options = {}) {
  const { limit = 20, page = 1, gameType } = options;
  const query = { 
    userId,
    type: { $in: ['game_bet', 'game_win', 'game_lose'] }
  };
  
  if (gameType) {
    query['metadata.gameType'] = gameType;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

// 静态方法 - 获取交易统计
transactionSchema.statics.getTransactionStats = function(userId, startDate, endDate) {
  const matchStage = {
    userId: mongoose.Types.ObjectId(userId),
    createdAt: { $gte: startDate, $lte: endDate }
  };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
