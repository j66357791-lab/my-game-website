// backend/models/VipCard.js
const mongoose = require('mongoose');

const vipCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true }, // 月卡/季卡/年卡
  duration: { type: Number, required: true }, // 持续天数（30/90/360）
  dailyStarcoin: { type: Number, default: 66 }, // 每日领取星源币
  purchasePrice: { type: Number, required: true }, // 购买价格（points）
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true }, // 是否有效
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 计算过期时间
vipCardSchema.pre('save', function(next) {
  if (this.isNew) {
    this.expiresAt = new Date(this.purchasedAt.getTime() + this.duration * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('VipCard', vipCardSchema);
