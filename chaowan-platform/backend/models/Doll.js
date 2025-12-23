// backend/models/Doll.js - 完全修复版本
const mongoose = require('mongoose');

const dollSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  level: { type: Number, required: true, min: 1, max: 6 },
  emoji: { type: String, required: true },
  description: { type: String, required: true },
  rarity: { type: String, required: true },
  
  // 🔥 只使用星源币
  purchasePrice: { type: Number, required: true },
  productionPerDay: { type: Number, required: true },
  totalDays: { type: Number, required: true, default: 30 },
  
  // 状态管理
  remainingDays: { type: Number, required: true },
  isExpired: { type: Boolean, default: false },
  isRecycled: { type: Boolean, default: false },
  isDeployed: { type: Boolean, default: false },
  
  // 🔥 新增：跟踪已产出天数（防止重复产出）
  totalProducedDays: { type: Number, default: 0 },
  
  materialDolls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doll' }],
  
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  lastProductionDate: { type: Date },
  totalProduced: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// 🔥 完全修复的每日产出方法
dollSchema.methods.produceDaily = function() {
  // 检查基本状态
  if (this.isExpired || this.isRecycled || !this.isDeployed) {
    return 0;
  }
  
  // 检查是否已产出
  const today = new Date().toDateString();
  if (this.lastProductionDate && this.lastProductionDate.toDateString() === today) {
    return 0; // 今日已产出
  }
  
  // 检查剩余天数
  if (this.remainingDays <= 0 || this.totalProducedDays >= this.totalDays) {
    this.isExpired = true;
    this.isDeployed = false;
    return 0;
  }
  
  // 计算产出（星源币）
  const production = this.productionPerDay;
  this.totalProduced = (this.totalProduced || 0) + production;
  this.totalProducedDays += 1; // 🔥 递增已产出天数
  this.remainingDays -= 1;    // 🔥 递减剩余天数
  this.lastProductionDate = new Date();
  
  // 检查是否过期
  if (this.remainingDays <= 0 || this.totalProducedDays >= this.totalDays) {
    this.isExpired = true;
    this.isDeployed = false;
  }
  
  return production; // 返回星源币数量
};

// 🔥 修复：回收方法 - 只给星源币
dollSchema.methods.recycle = function() {
  if (this.isRecycled) {
    return { success: false, message: '娃娃已被回收' };
  }
  
  const recycleRate = 0.3; // 30%回收率
  const recycleStarcoin = Math.floor(this.purchasePrice * recycleRate);
  
  this.isRecycled = true;
  this.isDeployed = false;
  this.updatedAt = new Date();
  
  return {
    success: true,
    starcoin: recycleStarcoin,
    message: `回收成功，获得${recycleStarcoin}星源币`
  };
};

// 🔥 静态配置 - 只使用星源币
dollSchema.statics.getDollConfig = function(level) {
  const configs = {
    1: { 
      name: '一级娃娃',
      emoji: '🧸',
      purchasePrice: 500, 
      productionPerDay: 17.5, 
      totalDays: 30 
    },
    2: { 
      name: '二级娃娃',
      emoji: '🦄',
      purchasePrice: 1500, 
      productionPerDay: 53.5, 
      totalDays: 30 
    },
    3: { 
      name: '三级娃娃',
      emoji: '🐉',
      purchasePrice: 4500, 
      productionPerDay: 162, 
      totalDays: 30 
    },
    4: { 
      name: '四级娃娃',
      emoji: '🦅',
      purchasePrice: 13500, 
      productionPerDay: 495, 
      totalDays: 30 
    },
    5: { 
      name: '五级娃娃',
      emoji: '🦁',
      purchasePrice: 40500, 
      productionPerDay: 1512, 
      totalDays: 30 
    },
    6: { 
      name: '六级娃娃',
      emoji: '🦋',
      purchasePrice: 121500, 
      productionPerDay: 4666, 
      totalDays: 30 
    }
  };
  return configs[level] || null;
};

module.exports = mongoose.model('Doll', dollSchema);
