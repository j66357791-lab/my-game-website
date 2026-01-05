// backend/utils/realmConfig.js

module.exports = {
  // 灵气池基础配置
  spiritPool: {
    baseRate: 1,         // 初始产出
    rateIncrement: 1,    // 每级增加产出
    costPerLevel: 1,     // 每级消耗 1 灵气石
  },

  // ✅ 各境界灵气池等级上限
  poolMaxLevels: {
    '凡人': 20,
    '练气': 50,
    '筑基': 200,
    '金丹': 500,
    '元婴': 800,
    '化神': 1200,
    '渡劫': 2000,
    '大乘': 3000
  },

  // ✅ 凡人小层级配置 (1-10级)
  mortalLevels: [
    { level: 1, cost: 1000, reward: 1 },
    { level: 2, cost: 3000, reward: 1 },
    { level: 3, cost: 7000, reward: 1 },
    { level: 4, cost: 12000, reward: 1 },
    { level: 5, cost: 18000, reward: 1 },
    { level: 6, cost: 25000, reward: 1 },
    { level: 7, cost: 35000, reward: 2 },
    { level: 8, cost: 45000, reward: 2 },
    { level: 9, cost: 55000, reward: 2 },
    { level: 10, cost: 80000, reward: 3 }
  ],

  // ✅ 练气小层级配置 (1-10级)
  qiLevels: [
    { level: 1, cost: 100000, reward: 2 },
    { level: 2, cost: 150000, reward: 2 },
    { level: 3, cost: 200000, reward: 2 },
    { level: 4, cost: 250000, reward: 2 },
    { level: 5, cost: 350000, reward: 2 },
    { level: 6, cost: 450000, reward: 3 },
    { level: 7, cost: 550000, reward: 3 },
    { level: 8, cost: 650000, reward: 3 },
    { level: 9, cost: 800000, reward: 4 },
    { level: 10, cost: 1000000, reward: 5 }
  ],

  // ✅ 洗髓丹加成
  marrowBonus: {
    '普通': 0.05,
    '优秀': 0.10,
    '精良': 0.15,
    '史诗': 0.20,
    '传说': 0.30,
    '神话': 0.40
  },

  // 辅助：获取当前境界的升级表
  getLevelTable: function(realm) {
    if (realm === '凡人') return this.mortalLevels;
    if (realm === '练气') return this.qiLevels;
    return this.mortalLevels; // 默认回退
  },

  // 辅助：获取灵气池上限
  getPoolMax: function(realm) {
    return this.poolMaxLevels[realm] || 20;
  }
};
