const mongoose = require('mongoose');

const bossSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Boss名称（如千羽）
  maxHp: { type: Number, required: true }, // 最大血量
  attack: { type: Number, required: true }, // 攻击力
  defense: { type: Number, required: true }, // 防御力
  rewardMin: { type: Number, required: true }, // 现金红包最小值（88.8）
  rewardMax: { type: Number, required: true }, // 现金红包最大值（188.8）
  currentHp: { type: Number, required: true }, // 当前血量
  totalDamage: { type: Number, default: 0 }, // 累计伤害
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // 参与玩家
  isActive: { type: Boolean, default: true }, // 是否存活
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Boss', bossSchema);
