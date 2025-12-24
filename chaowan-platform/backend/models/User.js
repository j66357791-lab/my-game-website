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
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  points: {
    type: Number,
    default: 50,
    min: 0
  },
  // 🔧 新增：锁定积分（上庄专用）
  lockedPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  starcoin: {
    type: Number,
    default: 0,
    min: 0
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
    account: {
      type: String,
      default: ''
    },
    realName: {
      type: String,
      default: ''
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  withdrawalLimit: {
    daily: {
      type: Number,
      default: 500
    },
    monthly: {
      type: Number,
      default: 5000
    }
  },
  deployedDolls: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doll'
  }],
  vipCards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VipCard'
  }],
  disabled: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

// 确保虚拟字段和 toJSON 配置正确
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
