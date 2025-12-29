const mongoose = require('mongoose');

const CultivationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['male', 'female'], required: true }, // 男/女
  
  // 境界系统
  realm: { 
    type: String, 
    enum: ['MORTAL', 'QI_REFINING', 'FOUNDATION', 'GOLD_CORE', 'NASCENT_SOUL', 'SPIRITUAL', 'TRIBULATION', 'MAHAYANA'],
    default: 'MORTAL' 
  },
  level: { type: Number, default: 1 }, // 当前小层级 (1-10)
  exp: { type: Number, default: 0 },  // 当前灵气值
  
  // 属性点系统
  availablePoints: { type: Number, default: 0 },
  
  // 核心属性 (存储数值，如 0.1 代表 0.1%)
  attributes: {
    attack: { type: Number, default: 0 },
    hp: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    aptitude: { type: Number, default: 0 }, // 资质 (影响修炼速度)
    critRate: { type: Number, default: 0 },
    antiCrit: { type: Number, default: 0 },
    dodgeRate: { type: Number, default: 0 },
    antiDodge: { type: Number, default: 0 }
  },
  
  // 家园灵气池
  homePoolLevel: { type: Number, default: 1 },
  
  // 法宝列表
  artifacts: [{ 
    id: String, 
    name: String, 
    effect: String,
    effectValue: Number 
  }],
  
  // 记录上次领取修炼时间，用于离线挂机计算
  lastCultivationTime: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Cultivation', CultivationSchema);
