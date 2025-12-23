// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    required: true,
    select: false // 默认查询时不返回密码
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

// 🔒 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 🔒 密码比对方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
