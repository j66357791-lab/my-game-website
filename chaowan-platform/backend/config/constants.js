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
