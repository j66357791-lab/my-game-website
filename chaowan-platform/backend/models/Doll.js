// backend/models/Doll.js - 修复小数收益
const mongoose = require('mongoose');

const dollSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  level: { type: Number, required: true },
  emoji: { type: String, required: true },
  description: { type: String, required: true },
  rarity: { type: String, required: true },
  purchasePrice: { type: Number, required: true },
  productionPerDay: { type: Number, required: true },
  totalDays: { type: Number, required: true },
  remainingDays: { type: Number, required: true },
  totalProduced: { type: Number, default: 0 },
  isExpired: { type: Boolean, default: false },
  isRecycled: { type: Boolean, default: false },
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

// 🔧 修复：确保小数收益计算
dollSchema.methods.produceDaily = function() {
  if (this.isExpired || this.isRecycled || this.remainingDays <= 0) {
    return 0;
  }
  
  // 🔧 修复：直接返回小数，不做整数处理
  const dailyEarning = parseFloat(this.productionPerDay);
  
  // 更新总产出
  this.totalProduced = parseFloat((this.totalProduced || 0) + dailyEarning).toFixed(2);
  
  // 减少剩余天数
  this.remainingDays -= 1;
  
  // 检查是否过期
  if (this.remainingDays <= 0) {
    this.isExpired = true;
    this.expiresAt = new Date();
  }
  
  return parseFloat(dailyEarning).toFixed(2);
};

// 🔧 修复：回收方法也要处理小数
dollSchema.methods.recycle = function() {
  if (this.isRecycled) {
    return { reward: 0, experience: 0 };
  }
  
  // 🔧 修复：回收价值也支持小数
  const reward = parseFloat((this.remainingDays * 0.5)).toFixed(2);
  let experience = 0;
  
  // 二级娃娃额外获得经验
  if (this.level === 2) {
    experience = parseFloat(this.remainingDays * 2).toFixed(2);
  }
  
  this.isRecycled = true;
  this.recycledAt = new Date();
  
  return {
    reward: parseFloat(reward),
    experience: parseFloat(experience)
  };
};

// 🔧 修复：娃娃配置确保小数
dollSchema.statics.getDollConfig = function(level) {
  const configs = {
    1: {
      name: '萌新宝宝',
      emoji: '👶',
      description: '新用户的入门级伙伴，可爱又贴心',
      rarity: '⭐',
      purchasePrice: parseFloat(50).toFixed(2),
      productionPerDay: parseFloat(0.88).toFixed(2), // 🔧 确保小数
      totalDays: 60
    },
    2: {
      name: '元气宝贝',
      emoji: '⚡',
      description: '充满活力的进阶伙伴，产出效率更高',
      rarity: '⭐⭐',
      purchasePrice: parseFloat(250).toFixed(2),
      productionPerDay: parseFloat(3.88).toFixed(2), // 🔧 确保小数
      totalDays: 70
    }
  };
  
  return configs[level];
};

// 🔧 修复：保存时确保小数精度
dollSchema.pre('save', function(next) {
  if (this.productionPerDay) {
    this.productionPerDay = parseFloat(this.productionPerDay).toFixed(2);
  }
  if (this.totalProduced) {
    this.totalProduced = parseFloat(this.totalProduced).toFixed(2);
  }
  if (this.purchasePrice) {
    this.purchasePrice = parseFloat(this.purchasePrice).toFixed(2);
  }
  next();
});

module.exports = mongoose.model('Doll', dollSchema);
