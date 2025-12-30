const mongoose = require('mongoose');

const ImmortalDollSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  
  // ✅ 新增：角色外观设定
  faction: { 
    type: String, 
    enum: ['仙', '魔', '道'],
    required: true 
  },
  gender: {
    type: String,
    enum: ['男', '女'],
    required: true
  },
  
  // 境界系统
  realm: { 
    type: String, 
    enum: ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘'],
    default: '凡人'
  },
  level: { type: Number, default: 1 },
  spiritualEnergy: { type: Number, default: 0 },
  
  // 基础属性（初始化时会根据阵营设定）
  baseAttributes: {
    attack: { type: Number, default: 0 },
    health: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    aptitude: { type: Number, default: 0 },
    critRate: { type: Number, default: 0 },
    antiCritRate: { type: Number, default: 0 },
    dodgeRate: { type: Number, default: 0 },
    antiDodgeRate: { type: Number, default: 0 }
  },
  
  availableAttributePoints: { type: Number, default: 0 },
  
  // 灵气池
  spiritPool: {
    level: { type: Number, default: 1 },
    productionRate: { type: Number, default: 1 }
  },

  // 装备槽
  equipmentSlots: {
    weapon: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    armor: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    shoes: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    belt: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    clothes: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    pants: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ImmortalDollSchema.virtual('combatPower').get(function() {
  const attrs = this.baseAttributes;
  return (
    attrs.attack * 10 + 
    Math.floor(attrs.health / 10) * 10 + 
    attrs.defense * 5 + 
    Math.floor(attrs.critRate) * 20 + 
    Math.floor(attrs.dodgeRate) * 20
  );
});

ImmortalDollSchema.set('toJSON', { virtuals: true });
ImmortalDollSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ImmortalDoll', ImmortalDollSchema);
