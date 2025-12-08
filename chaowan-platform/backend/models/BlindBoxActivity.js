const mongoose = require('mongoose');

const blindBoxActivitySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  collectedChars: [{ 
    type: String 
  }], // 收集的字符
  totalDraws: { 
    type: Number, 
    default: 0 
  }, // 总抽取次数
  lastDrawTime: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 索引优化
blindBoxActivitySchema.index({ userId: 1 });
blindBoxActivitySchema.index({ updatedAt: -1 });

module.exports = mongoose.model('BlindBoxActivity', blindBoxActivitySchema);
