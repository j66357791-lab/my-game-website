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
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  // 🔧 确保所有用户都有现金余额字段
  cashBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  // 🔧 支付宝信息
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
  // 🔧 提现限制
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
  // 🔧 账户状态
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

// 🔧 确保新注册用户有初始余额
userSchema.pre('save', function(next) {
  if (this.isNew && this.cashBalance === undefined) {
    this.cashBalance = this.role === 'admin' ? 1000 : 100; // 管理员1000，普通用户100
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
