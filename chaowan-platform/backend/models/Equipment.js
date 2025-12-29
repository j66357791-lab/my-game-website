const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  
  // 装备类型
  type: { type: String, enum: ['WEAPON', 'ARMOR', 'SHOES', 'BELT', 'CLOTH', 'PANTS'], required: true },
  
  // 品级 (目前只有 COMMON, 后续可扩展)
  rarity: { type: String, default: 'COMMON' },
  
  // 等级 (1-10)
  level: { type: Number, default: 1 },
  
  // 当前属性 (存储浮点数，如 0.2 代表 0.2%)
  stats: {
    attack: { type: Number, default: 0 },
    hp: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    critRate: { type: Number, default: 0 },
    dodgeRate: { type: Number, default: 0 },
    antiCrit: { type: Number, default: 0 },
    antiDodge: { type: Number, default: 0 }
  },
  
  isEquipped: { type: Boolean, default: false }
});

module.exports = mongoose.model('Equipment', EquipmentSchema);
