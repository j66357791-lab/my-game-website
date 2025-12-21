// backend/config/constants.js

// 娃娃配置 (策划案2.1.1)
module.exports.DOLL_CONFIGS = {
  1: { // 萌新宝宝
    name: '萌新宝宝',
    emoji: '👶',
    description: '新用户的入门级伙伴，可爱又贴心',
    rarity: '⭐',
    purchasePrice: 50,
    productionPerDay: 0.88,
    totalDays: 60,
    recycleMinMultiplier: 0.88,
    recycleMaxMultiplier: 8.88,
    recycleExperience: 30
  },
  2: { // 元气宝贝
    name: '元气宝贝',
    emoji: '⚡',
    description: '充满活力的进阶伙伴，产出效率更高',
    rarity: '⭐⭐',
    purchasePrice: 250,
    productionPerDay: 3.88,
    totalDays: 70,
    recycleMinMultiplier: 0.88,
    recycleMaxMultiplier: 8.88,
    recycleExperience: 30
  },
  // 3-10级预留，按策划案暂时锁定
  3: { name: '神秘娃娃', emoji: '🔒', isLocked: true },
  4: { name: '神秘娃娃', emoji: '🔒', isLocked: true },
  5: { name: '神秘娃娃', emoji: '🔒', isLocked: true },
  6: { name: '神秘娃娃', emoji: '🔒', isLocked: true },
  7: { name: '神秘娃娃', emoji: '🔒', isLocked: true },
  8: { name: '神秘娃娃', emoji: '🔒', isLocked: true },
  9: { name: '神秘娃娃', emoji: '🔒', isLocked: true },
  10: { name: '神秘娃娃', emoji: '🔒', isLocked: true }
};

// 等级配置 (策划案2.2.2)
module.exports.LEVEL_CONFIG = {
  thresholds: [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500], // 升级所需经验
  checkinBonusMultiplier: 0.1, // 每级签到加成10%
  productionBonusMultiplier: 0.05, // 每级产出加成5%
  levelUpRewards: {
    2: 20,  // 升到2级奖励20积分
    3: 50,  // 升到3级奖励50积分
    4: 100, // 升到4级奖励100积分
    5: 200, // 升到5级奖励200积分
    6: 300, // 升到6级奖励300积分
    // 7-10级待开放
  }
};

// 签到配置 (策划案2.2.1)
module.exports.CHECKIN_CONFIG = {
  baseRewards: [1, 2, 3, 4, 5, 6, 7], // 基础奖励，第7天封顶
  registerBonus: 50, // 新用户注册奖励
  maxStreak: 7 // 最大连续签到天数
};

// 系统配置
module.exports.SYSTEM_CONFIG = {
  maxDollsPerUser: 100, // 每个用户最多拥有娃娃数量
  productionTime: '00:00', // 每日产出时间
  timezone: 'Asia/Shanghai'
};