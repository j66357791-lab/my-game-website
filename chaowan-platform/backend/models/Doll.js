// backend/models/Doll.js - 重构版
const mongoose = require('mongoose');

const dollSchema = new mongoose.Schema({
  // 所属用户
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 娃娃基础信息
  name: { type: String, required: true },
  level: { type: Number, required: true, min: 1, max: 6 },
  attribute: { type: String, required: true }, // 例如: 'fire', 'water', 'wood'
  emoji: { type: String, required: true },
  
  // 状态管理
  status: {
    type: String,
    enum: ['idle', 'deployed'],
    default: 'idle'
  },
  deployment_date: { type: Date }, // 出战时间，用于计算30天周期

  // 系统字段
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

/**
 * 核心算法：获取娃娃配置（防作弊）
 * 所有与数值相关的配置都从这里获取，而不是从数据库读取
 */
dollSchema.statics.getDollConfigByLevel = function(level) {
  const configs = {
    1: { name: '初级娃娃', total_production: 525, daily_production: 17.5, cost_starcoin: 500 },
    2: { name: '进阶娃娃', total_production: 1605, daily_production: 53.5, cost_starcoin: 1500 },
    3: { name: '精英娃娃', total_production: 4860, daily_production: 162, cost_starcoin: 4500 },
    4: { name: '大师娃娃', total_production: 14850, daily_production: 495, cost_starcoin: 13500 },
    5: { name: '史诗娃娃', total_production: 45360, daily_production: 1512, cost_starcoin: 40500 },
    6: { name: '传说娃娃', total_production: 139980, daily_production: 4666, cost_starcoin: 121500 },
  };
  return configs[level] || null;
};

/**
 * 实例方法：检查娃娃是否已过期（30天生命周期）
 * @returns {boolean} true if expired
 */
dollSchema.methods.isExpired = function() {
  if (this.status !== 'deployed') return false;
  const now = new Date();
  const deploymentTime = this.deployment_date.getTime();
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  return (now.getTime() - deploymentTime) > thirtyDaysInMs;
};

module.exports = mongoose.model('Doll', dollSchema);
