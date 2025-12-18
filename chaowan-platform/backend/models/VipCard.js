// backend/models/VipCard.js
const mongoose = require('mongoose');

const vipCardSchema = new mongoose.Schema({
  // 关联用户
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 卡种类型: 'monthly', 'quarterly', 'yearly'
  type: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly']
  },
  // 购买日期
  purchase_date: {
    type: Date,
    default: Date.now
  },
  // 过期日期 (购买后立即计算)
  expiry_date: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// 在保存前，根据类型计算过期日期
vipCardSchema.pre('save', function(next) {
  if (this.isNew) {
    const durationInDays = {
      'monthly': 30,
      'quarterly': 90,
      'yearly': 360
    };
    const days = durationInDays[this.type];
    if (days) {
      this.expiry_date = new Date(this.purchase_date.getTime() + days * 24 * 60 * 60 * 1000);
    }
  }
  next();
});

module.exports = mongoose.model('VipCard', vipCardSchema);
