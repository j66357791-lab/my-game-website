// backend/controllers/vipController.js
const User = require('../models/User');
const VipCard = require('../models/VipCard');

const VIP_CONFIG = {
  monthly: { price_integral: 1980, duration_days: 30 },
  quarterly: { price_integral: 5666, duration_days: 90 },
  yearly: { price_integral: 20999, duration_days: 360 },
};

// 购买VIP卡
exports.purchaseVipCard = async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user._id;
    const config = VIP_CONFIG[type];

    if (!config) {
      return res.status(400).json({ success: false, message: '无效的卡种' });
    }

    const user = await User.findById(userId);
    if (user.integral < config.price_integral) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }

    // 扣除积分
    user.integral -= config.price_integral;
    user.vip_days_left += config.duration_days;
    await user.save();

    // 创建VIP卡记录
    await VipCard.create({ user_id: userId, type });

    res.json({ success: true, message: '购买成功', data: { newIntegral: user.integral, newVipDays: user.vip_days_left } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 领取每日VIP奖励
exports.claimDailyVipReward = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    
    // 查找所有未过期的VIP卡
    const activeVipCards = await VipCard.find({
      user_id: userId,
      expiry_date: { $gt: now }
    });

    if (activeVipCards.length === 0) {
      return res.status(400).json({ success: false, message: '您没有有效的VIP卡' });
    }
    
    // 简化逻辑：只要有有效VIP，就领一份奖励
    const DAILY_REWARD = 66;
    const user = await User.findById(userId);
    user.starcoin += DAILY_REWARD;
    await user.save();

    res.json({ success: true, message: '领取成功', data: { reward: DAILY_REWARD, newStarcoin: user.starcoin } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};
