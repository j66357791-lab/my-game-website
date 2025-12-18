// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  // --- 新玩法核心字段 ---
  // 积分：用于充值和购买VIP卡 (原 points)
  integral: {
    type: Number,
    default: 0,
    min: 0
  },
  // 星源币：用于抽取娃娃和Boss挑战
  starcoin: {
    type: Number,
    default: 0,
    min: 0
  },
  // VIP剩余总天数 (用于叠加计算)
  vip_days_left: {
    type: Number,
    default: 0,
    min: 0
  },
  // 累计获得的现金红包总额
  total_cash_reward: {
    type: Number,
    default: 0,
    min: 0
  },
  // --- 保留原有字段 ---
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  cashBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  alipayInfo: {
    account: { type: String, default: '' },
    realName: { type: String, default: '' },
    isVerified: { type: Boolean, default: false }
  },
  withdrawalLimit: {
    daily: { type: Number, default: 500 },
    monthly: { type: Number, default: 5000 }
  },
  disabled: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
