const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '请提供用户名'],
    unique: true,
    trim: true,
    minlength: [2, '用户名至少2个字符']
  },
  email: {
    type: String,
    required: [true, '请提供邮箱'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, '请提供有效的邮箱']
  },
  password: {
    type: String,
    required: [true, '请提供密码'],
    minlength: 6,
    select: false // 默认查询不返回密码
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?name=User&background=random'
  },
  
  // --- 积分与货币系统 ---
  level: { type: Number, default: 1, min: 1, max: 10 },
  points: { type: Number, default: 50, min: 0 }, // 普通积分
  
  lockedPoints: { type: Number, default: 0, min: 0 }, // 锁定积分
  
  starcoin: { type: Number, default: 0, min: 0 }, // 星源币 (高级货币)
  
  // ✅ 新增：灵气石 (修仙游戏专用货币)
  spiritStones: { 
    type: Number, 
    default: 0, 
    min: 0,
    comment: '修仙游戏灵气石，用于升级灵气池等操作'
  },
  
  cashBalance: { 
    type: Number, 
    default: 0, 
    min: 0,
    comment: '现金余额'
  },

  // --- 娃娃关联 (可选) ---
  // dolls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doll' }],

  lastLoginAt: { type: Date, default: Date.now }
}, {
  timestamps: true // 自动添加 createdAt, updatedAt
});

// 保存前加密密码
UserSchema.pre('save', async function(next) {
  // 只有密码字段被修改时才加密
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 实例方法：比对密码
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('密码比对失败');
  }
};

module.exports = mongoose.model('User', UserSchema);
