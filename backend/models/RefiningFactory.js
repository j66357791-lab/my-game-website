// backend/models/RefiningFactory.js - 修复版本
const mongoose = require('mongoose');

const refiningFactorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  inputChars: [{ 
    type: String 
  }],
  refiningStartTime: { 
    type: Date, 
    default: null 
  },
  refiningDuration: { 
    type: Number, 
    default: 24 // 默认24小时
  },
  totalChars: { 
    type: Number, 
    default: 0 
  },
  refinedChars: { 
    type: Number, 
    default: 0 
  },
  refinedPoints: { 
    type: Number, 
    default: 0 
  },
  status: { 
    type: String, 
    enum: ['idle', 'active', 'completed'], 
    default: 'idle' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 更新时间中间件
refiningFactorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 索引
refiningFactorySchema.index({ userId: 1 });

module.exports = mongoose.model('RefiningFactory', refiningFactorySchema);
