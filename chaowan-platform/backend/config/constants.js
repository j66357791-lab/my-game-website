// backend/config/constants.js
module.exports.CHECKIN_CONFIG = {
  baseRewards: [1, 2, 3, 4, 5, 6, 7],
  registerBonus: 50,
  maxStreak: 7
};

// ✅ 商城配置
module.exports.SHOP_CONFIG = {
  TAGS: {
    NEW_USER: 'newbie_special',
    FLASH_SALE: 'flash_sale',
    CLEARANCE: 'clearance',
    ALL: 'all'
  },
  
  // ✅ 修改：1元 = 10积分
  EXCHANGE_RATE: 10, 

  ORDER_STATUS: {
    PENDING_PAYMENT: 'pending_payment',
    PAID: 'paid',
    SHIPPED: 'shipped',
    RECEIVED: 'completed',
    CANCELLED: 'cancelled'
  }
};

module.exports = {
  // 境界升级所需总经验阈值 (数组下标0对应1级)
  REALM_EXP_REQ: {
    MORTAL: [1000, 3000, 7000, 12000, 18000, 25000, 35000, 45000, 55000, 80000],
    QI_REFINING: [100000, 150000, 200000, 250000, 350000, 450000, 550000, 650000, 800000, 1000000],
    // ... 后续境界略，参考文档填入
  },

  // 每级升级奖励属性点 (数组下标0对应1级)
  REALM_LEVEL_REWARDS: {
    MORTAL: [
      { points: 1 }, { points: 1 }, { points: 1 }, { points: 1 }, { points: 1 },
      { points: 1 }, { points: 2 }, { points: 2 }, { points: 2 }, { points: 3 }
    ],
    QI_REFINING: [
      { points: 2 }, { points: 2 }, { points: 2 }, { points: 2 }, { points: 2 },
      { points: 3 }, { points: 3 }, { points: 3 }, { points: 4 }, { points: 5 }
    ]
  },

  // 洗髓丹成功率加成
  PILL_BONUS: {
    NORMAL: 0.05,
    GOOD: 0.10,
    FINE: 0.15,
    EPIC: 0.20,
    LEGEND: 0.30,
    MYTH: 0.40
  },

  // 关卡数据
  DUNGEONS: {
    1: {
      name: '狗熊',
      cost: 100,
      boss: { attack: 5, hp: 50, defense: 0, crit: 5, dodge: 0 },
      rewards: { minQi: 1000, maxQi: 5000 }
    }
  },

  // 装备基础属性模板
  EQUIPMENT_BASE_STATS: {
    WEAPON: { base: { attack: 5 }, growth: { attack: 1 } },
    ARMOR: { base: { hp: 50 }, growth: { hp: 10 } },
    SHOES: { base: { dodgeRate: 0.2 }, growth: { dodgeRate: 0.1 } }, // 注意这里存的是小数
    BELT: { base: { defense: 5 }, growth: { defense: 1 } },
    CLOTH: { base: { defense: 2, hp: 30 }, growth: { defense: 0.5, hp: 10 } },
    PANTS: { base: { antiDodge: 0.2, antiCrit: 0.2 }, growth: { antiDodge: 0.1, antiCrit: 0.1 } }
  }
};
