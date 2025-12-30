// backend/utils/realmConfig.js

module.exports = {
  // 灵气池配置
  spiritPool: {
    baseRate: 1,          // 初始每小时产出
    baseCost: 50,         // 初始升级消耗星源币
    costMultiplier: 1.5,   // 每升一级，消耗倍率
    rateIncrement: 1      // 每升一级，每小时产出增加多少
  },

  // 阵营加成 (预留)
  factionBonus: {
    '仙': { rateBonus: 0 }, // 仙平稳
    '魔': { rateBonus: 0 }, // 魔爆发(暂未实装)
    '道': { rateBonus: 0 }  // 道均衡
  }
};
