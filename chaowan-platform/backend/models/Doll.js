// backend/models/Doll.js - 彻底修复版本
const mongoose = require('mongoose');

const dollSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  level: { type: Number, required: true, min: 1, max: 6 },
  emoji: { type: String, required: true },
  description: { type: String, required: true },
  rarity: { type: String, required: true },
  
  // 🔥 修复：只使用星源币
  purchasePrice: { type: Number, required: true }, // 星源币价格
  productionPerDay: { type: Number, required: true }, // 星源币日产出
  totalDays: { type: Number, required: true, default: 30 },
  
  // 状态管理
  remainingDays: { type: Number, required: true },
  isExpired: { type: Boolean, default: false },
  isRecycled: { type: Boolean, default: false },
  isDeployed: { type: Boolean, default: false },
  
  // 🔥 修复：移除积分相关字段
  // 移除：recyclePoints, recycleExperience
  
  // 合成相关
  materialDolls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doll' }],
  
  // 系统字段
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  lastProductionDate: { type: Date }, // 添加最后产出日期
  totalProduced: { type: Number, default: 0 }, // 总产出（星源币）
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// 🔥 修复：实例方法 - 只产出星源币
dollSchema.methods.produceDaily = function() {
  if (this.isExpired || this.isRecycled || !this.isDeployed) return 0;
  
  const today = new Date().toDateString();
  if (this.lastProductionDate && this.lastProductionDate.toDateString() === today) {
    return 0; // 今日已产出
  }
  
  const production = this.productionPerDay; // 星源币产出
  this.totalProduced = (this.totalProduced || 0) + production;
  this.lastProductionDate = new Date();
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

// 🔥 修复：静态配置 - 只使用星源币
dollSchema.statics.getDollConfig = function(level) {
  const configs = {
    1: { 
      purchasePrice: 500, 
      productionPerDay: 17.5, // 525÷30
      totalDays: 30 
    },
    2: { 
      purchasePrice: 1500, 
      productionPerDay: 53.5, // 1605÷30
      totalDays: 30 
    },
    3: { 
      purchasePrice: 4500, 
      productionPerDay: 162, // 4860÷30
      totalDays: 30 
    },
    4: { 
      purchasePrice: 13500, 
      productionPerDay: 495, // 14850÷30
      totalDays: 30 
    },
    5: { 
      purchasePrice: 40500, 
      productionPerDay: 1512, // 45360÷30
      totalDays: 30 
    },
    6: { 
      purchasePrice: 121500, 
      productionPerDay: 4666, // 139980÷30
      totalDays: 30 
    }
  };
  return configs[level] || null;
};

module.exports = mongoose.model('Doll', dollSchema);
