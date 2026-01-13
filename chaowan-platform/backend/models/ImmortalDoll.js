const mongoose = require('mongoose');

const ImmortalDollSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  
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
  
  realm: { 
    type: String, 
    enum: ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘'],
    default: '凡人'
  },
  
  // ✅ 小层级 (当前境界下的等级，如 凡人3级)
  level: { type: Number, default: 1 }, 
  
  spiritualEnergy: { type: Number, default: 0 }, 
  
  // ✅ 增加新属性
  baseAttributes: {
    attack: { type: Number, default: 0 },
    health: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    aptitude: { type: Number, default: 0 }, // 资质
    critRate: { type: Number, default: 0 },  // 暴击率 (存储小数，如 0.05 代表 5%)
    antiCritRate: { type: Number, default: 0 }, // 抗暴击
    dodgeRate: { type: Number, default: 0 },  // 闪避
    antiDodgeRate: { type: Number, default: 0 } // 抗闪避
  },
  
  availableAttributePoints: { type: Number, default: 0 },
  
  spiritPool: {
    level: { type: Number, default: 1 },
    productionRate: { type: Number, default: 1 },
    lastCollectedAt: { type: Date, default: Date.now }
  },

  equipmentSlots: {
    weapon: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    armor: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    shoes: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    belt: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    clothes: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' },
    pants: { type: mongoose.Schema.Types.ObjectId, ref: 'ImmortalEquipment' }
  },

  // ==========================================
  // ✅ 新增功能字段
  // ==========================================

  // 1. 炼丹师职业信息
  alchemist: {
    level: { type: Number, default: 1 },      // 1-9品
    stage: { type: String, default: 'low' },  // 阶段: 'low'(低), 'mid'(中), 'high'(高)
    exp: { type: Number, default: 0 },         // 当前经验
    currentTask: {                             // 当前炼制任务
      type: String,                            // 'potential'(潜力丹) 或 'spirit'(灵气丹)
      startTime: Date,
      endTime: Date
    }
  },

  // 2. 药园信息
  garden: {
    unlockedPlots: { type: Number, default: 1 }, // 已解锁地块数 (1-9)
    plots: [{                                   // 9块地的详情
      id: Number,
      durability: Number,
      status: String,      // 'empty', 'growing'
      crop: String,        // 'worry_10', 'spirit_10'
      plantTime: Date
    }]
  },

  // 3. 简易背包 (物品计数)
  inventory: {
    // 材料
    'herb_worry_10': { type: Number, default: 0 },   // 十年无忧草
    'herb_spirit_10': { type: Number, default: 0 },  // 十年灵气草
    'mat_bear_heart': { type: Number, default: 0 },  // 狗熊心
    'mat_tree_branch': { type: Number, default: 0 }, // 树妖枝干
    'fertilizer': { type: Number, default: 0 },      // 肥料
    
    // 丹药 - 潜力丹
    'pill_pot_low': { type: Number, default: 0 },
    'pill_pot_mid': { type: Number, default: 0 },
    'pill_pot_high': { type: Number, default: 0 },
    'pill_pot_super': { type: Number, default: 0 },
    'pill_pot_immortal': { type: Number, default: 0 },

    // 丹药 - 灵气丹
    'pill_spirit_low': { type: Number, default: 0 },
    'pill_spirit_mid': { type: Number, default: 0 },
    'pill_spirit_high': { type: Number, default: 0 },
    'pill_spirit_super': { type: Number, default: 0 },
    'pill_spirit_immortal': { type: Number, default: 0 }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ✅ 严格按照策划案计算的战斗力公式
ImmortalDollSchema.virtual('combatPower').get(function() {
  const attrs = this.baseAttributes;
  
  // 1. 基础属性战力
  let cp = 0;
  cp += attrs.attack * 10;
  cp += Math.floor(attrs.health / 10) * 10;
  cp += attrs.defense * 5;
  
  // 2. 暴击/闪避战力 (只有达到1%才计算)
  // 假设数据库存的是 0.01 代表 1%。
  // Math.floor(0.009 * 100) = 0
  // Math.floor(0.01 * 100) = 1
  const critPercent = Math.floor(attrs.critRate * 100);
  cp += critPercent * 20;
  
  const dodgePercent = Math.floor(attrs.dodgeRate * 100);
  cp += dodgePercent * 20;

  // 资质不增加战力，抗暴抗闪不增加战力
  return cp;
});

ImmortalDollSchema.set('toJSON', { virtuals: true });
ImmortalDollSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ImmortalDoll', ImmortalDollSchema);
