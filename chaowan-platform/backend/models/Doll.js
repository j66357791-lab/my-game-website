// backend/models/Doll.js
const dollSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  level: { type: Number, required: true, min: 1, max: 6 }, // 1-6级
  emoji: { type: String, required: true },
  description: { type: String, required: true },
  rarity: { type: String, required: true },
  
  // 经济模型
  purchasePrice: { type: Number, required: true }, // 🔧 购买价格（starcoin）
  productionPerDay: { type: Number, required: true }, // 日产出（starcoin）
  totalDays: { type: Number, required: true, default: 30 }, // 产出周期
  
  // 状态管理
  remainingDays: { type: Number, required: true }, // 剩余天数
  isExpired: { type: Boolean, default: false }, // 是否过期
  isRecycled: { type: Boolean, default: false }, // 是否回收
  isDeployed: { type: Boolean, default: false }, // 是否出战
  
  // 合成相关
  materialDolls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doll' }], // 合成材料
  
  // 系统字段
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// 计算过期时间
dollSchema.pre('save', function(next) {
  if (this.isNew) {
    this.expiresAt = new Date(this.purchasedAt.getTime() + this.totalDays * 24 * 60 * 60 * 1000);
  }
  next();
});

// 实例方法：每日产出
dollSchema.methods.produceDaily = function() {
  if (this.isExpired || this.isRecycled || this.isDeployed) return 0;
  const today = new Date().toDateString();
  if (this.lastProductionDate?.toDateString() === today) return 0;
  
  const production = Math.floor(this.productionPerDay);
  this.totalProduced = (this.totalProduced || 0) + production;
  this.lastProductionDate = new Date();
  return production;
};

// 静态方法：获取娃娃配置
dollSchema.statics.getDollConfig = function(level) {
  const configs = {
    1: { productionPerDay: 17.5 }, // 一级：日产出17.5 starcoin
    2: { productionPerDay: 53.5 }, // 二级：日产出53.5 starcoin
    3: { productionPerDay: 162 }, // 三级：日产出162 starcoin
    4: { productionPerDay: 495 }, // 四级：日产出495 starcoin
    5: { productionPerDay: 1512 }, // 五级：日产出1512 starcoin
    6: { productionPerDay: 4666 }, // 六级：日产出4666 starcoin
  };
  return configs[level] || null;
};

module.exports = mongoose.model('Doll', dollSchema);
