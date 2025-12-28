// backend/config/constants.js

// 签到配置 (策划案2.2.1)
module.exports.CHECKIN_CONFIG = {
  baseRewards: [1, 2, 3, 4, 5, 6, 7], // 基础奖励，第7天封顶
  registerBonus: 50, // 新用户注册奖励
  maxStreak: 7 // 最大连续签到天数
};

// ✅ 商城配置 (修正版：状态值必须与 Order.js 严格一致)
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
  // ⚠️ 修改点：RECEIVED 的值改为 'completed'，以匹配 backend/models/Order.js 中的 enum 定义
  ORDER_STATUS: {
    PENDING_PAYMENT: 'pending_payment', // 待支付
    PAID: 'paid',                       // 已支付(待发货)
    SHIPPED: 'shipped',                 // 待收货(已发货)
    RECEIVED: 'completed',              // 已收货 (映射到数据库的 'completed'，防止报错)
    CANCELLED: 'cancelled'              // 已取消
  }
};
