const mongoose = require('mongoose');

const ImmortalEquipmentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // 装备部位：weapon(武器), armor(防具), shoes(鞋子), belt(腰带), clothes(衣服), pants(裤子)
  slot: {
    type: String,
    enum: ['weapon', 'armor', 'shoes', 'belt', 'clothes', 'pants'],
    required: true
  },
  
  // 品级：目前只做 'common' (普通)
  quality: {
    type: String,
    default: 'common',
    enum: ['common'] // 后续扩展优秀、精良
  },
  
  // 等级 (1-10)
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  // 基础属性加成 (随等级提升)
  attributes: {
    attack: { type: Number, default: 0 },
    health: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    dodgeRate: { type: Number, default: 0 }, // 存储小数，如 0.002 (0.2%)
    antiDodgeRate: { type: Number, default: 0 },
    antiCritRate: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now }
});

// ✅ 保存前根据等级自动计算属性
ImmortalEquipmentSchema.pre('save', function(next) {
  const level = this.level || 1;
  
  // ✅ 严格按照策划案计算属性
  if (this.slot === 'weapon') {
    // 武器：攻击5，每级+1
    this.attributes.attack = 5 + (level - 1) * 1;
  } else if (this.slot === 'armor') {
    // 防具：血50，每级+10
    this.attributes.health = 50 + (level - 1) * 10;
  } else if (this.slot === 'shoes') {
    // 鞋子：闪避0.2%，每级+0.1% (存储为 0.002 ~ 0.011)
    this.attributes.dodgeRate = 0.002 + (level - 1) * 0.001;
  } else if (this.slot === 'belt') {
    // 腰带：防5，每级+1
    this.attributes.defense = 5 + (level - 1) * 1;
  } else if (this.slot === 'clothes') {
    // 衣服：防2 + 0.5*(level-1)，血30 + 10*(level-1)
    this.attributes.defense = 2 + (level - 1) * 0.5;
    this.attributes.health = 30 + (level - 1) * 10;
  } else if (this.slot === 'pants') {
    // 裤子：抗闪避0.2% + 0.1%，抗暴击0.2% + 0.1%
    const baseRate = 0.002;
    const addRate = (level - 1) * 0.001;
    this.attributes.antiDodgeRate = baseRate + addRate;
    this.attributes.antiCritRate = baseRate + addRate;
  }
  
  next();
});

module.exports = mongoose.model('ImmortalEquipment', ImmortalEquipmentSchema);
