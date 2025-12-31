// backend/config/constants.js

// 签到配置 (策划案2.2.1)
module.exports.CHECKIN_CONFIG = {
  baseRewards: [1, 2, 3, 4, 5, 6, 7], // 基础奖励，第7天封顶
  registerBonus: 50, // 新用户注册奖励
  maxStreak: 7 // 最大连续签到天数
};

// ✅ 新增：商城配置
module.exports.SHOP_CONFIG = {
  // 版块标签
  TAGS: {
    NEW_USER: 'newbie_special',    // 新人特惠
    FLASH_SALE: 'flash_sale',       // 限时抢购
    CLEARANCE: 'clearance',         // 低价清仓
    ALL: 'all'                      // 全部商品
  },
  
  // 汇率：1 现金 = ? 积分 (用于混合支付换算)
  EXCHANGE_RATE: 100, // 假设 1元现金 = 100积分

  // 订单状态
  ORDER_STATUS: {
    PENDING_PAYMENT: 'pending_payment', // 待支付
    PAID: 'paid',                       // 已支付(待发货)
    SHIPPED: 'shipped',                 // 待收货(已发货)
    RECEIVED: 'received',               // 已收货
    CANCELLED: 'cancelled'              // 已取消
  }
};

