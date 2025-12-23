// backend/models/MysteryCardControl.js
const mongoose = require('mongoose');

const MysteryCardControlSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['RANDOM', 'FIXED'],
    default: 'RANDOM'
  },
  fixedLordValue: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  // 🔧 新增：智能防亏配置字段
  autoControl: {
    enabled: {
      type: Boolean,
      default: false
    },
    threshold: {
      type: Number,
      default: 2000,
      description: '亏损阈值（负数）'
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MysteryCardControl', MysteryCardControlSchema);
