// backend/models/Doll.js
const mongoose = require('mongoose');

console.log('🔍 Doll.js 文件开始加载...');

const dollSchema = new mongoose.Schema({
  // 所属用户
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 娃娃基础信息 (策划案2.1)
  name: { type: String, required: true },
  level: { type: Number, required: true, min: 1, max: 10 },
  emoji: { type: String, required: true },
  description: { type: String, required: true },
  rarity: { type: String, required: true }, // ⭐⭐⭐ 等表示
  
  // 经济模型 (策划案2.1.1)
  purchasePrice: { type: Number, required: true },
  productionPerDay: { type: Number, required: true },
  totalDays: { type: Number, required: true },
  
  // 状态管理
  remainingDays: { type: Number, required: true },
  isExpired: { type: Boolean, default: false },
  isRecycled: { type: Boolean, default: false },
  
  // 产出记录
  totalProduced: { type: Number, default: 0 },
  lastProductionDate: { type: Date },
  
  // 回收相关
  recycleReward: { type: Number, default: 0 },
  recycleDate: { type: Date },
  
  // 系统字段
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// 计算过期时间
dollSchema.pre('save', function(next) {
  if (this.isNew && this.totalDays) {
    this.expiresAt = new Date(this.purchasedAt.getTime() + this.totalDays * 24 * 60 * 60 * 1000);
  }
  next();
});

// 实例方法：检查是否过期
dollSchema.methods.checkExpiration = function() {
  if (this.isExpired || this.isRecycled) return false;
  
  const now = new Date();
  if (now >= this.expiresAt) {
    this.isExpired = true;
    this.remainingDays = 0;
    return true;
  }
  
  // 更新剩余天数
  const remainingTime = this.expiresAt - now;
  this.remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
  return false;
};

// 实例方法：执行每日产出
dollSchema.methods.produceDaily = function(userBonus = 1) {
  if (this.isExpired || this.isRecycled) return 0;
  
  const today = new Date().toDateString();
  if (this.lastProductionDate?.toDateString() === today) {
    return 0; // 今天已经产出过了
  }
  
  const production = Math.floor(this.productionPerDay * userBonus);
  this.totalProduced += production;
  this.lastProductionDate = new Date();
  
  return production;
};

// 实例方法：执行回收
dollSchema.methods.recycle = function() {
  if (this.isRecycled) return { reward: 0, experience: 0 };
  
  // 根据策划案：回收获得随机积分（0.88-8.88倍基础价格）
  const minMultiplier = 0.88;
  const maxMultiplier = 8.88;
  const rewardMultiplier = minMultiplier + Math.random() * (maxMultiplier - minMultiplier);
  const recycleReward = Math.floor(this.purchasePrice * rewardMultiplier);
  
  this.isRecycled = true;
  this.recycleReward = recycleReward;
  this.recycleDate = new Date();
  
  return {
    reward: recycleReward,
    experience: 30 // 策划案：回收给予30经验
  };
};

// 静态方法：获取娃娃配置
dollSchema.statics.getDollConfig = function(level) {
  console.log(`🔍 获取娃娃配置: level=${level}`);
  
  const configs = {
    1: { // 萌新宝宝
      name: '萌新宝宝',
      emoji: '👶',
      description: '新用户的入门级伙伴，可爱又贴心',
      rarity: '⭐',
      purchasePrice: 50,
      productionPerDay: 0.88,
      totalDays: 60
    },
    2: { // 元气宝贝
      name: '元气宝贝',
      emoji: '⚡',
      description: '充满活力的进阶伙伴，产出效率更高',
      rarity: '⭐⭐',
      purchasePrice: 250,
      productionPerDay: 3.88,
      totalDays: 70
    }
    // 3-10级暂时锁定，按策划案设计
  };
  
  const config = configs[level] || null;
  console.log(`🔍 返回娃娃配置:`, config);
  return config;
};

console.log('🔍 Doll Schema 定义完成');

module.exports = mongoose.model('Doll', dollSchema);

console.log('✅ Doll.js 文件加载完成');
