// backend/controllers/vipCardController.js
const VipCard = require('../models/VipCard');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 购买VIP卡
exports.purchaseVipCard = async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.id;

    const vipConfig = {
      monthly: { duration: 30, dailyStarcoin: 66, purchasePrice: 1980 },
      quarterly: { duration: 90, dailyStarcoin: 66, purchasePrice: 5666 },
      yearly: { duration: 360, dailyStarcoin: 66, purchasePrice: 20999 }
    };

    const config = vipConfig[type];
    if (!config) {
      return res.status(400).json({ success: false, message: 'VIP卡类型无效' });
    }

    const user = await User.findById(userId);
    if (user.points < config.purchasePrice) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }

    // 扣除积分
    user.points -= config.purchasePrice;
    await user.save();

    // 创建VIP卡
    const vipCard = new VipCard({
      userId,
      type,
      duration: config.duration,
      dailyStarcoin: config.dailyStarcoin,
      purchasePrice: config.purchasePrice
    });
    await vipCard.save();

    // 记录交易
    await new Transaction({
      userId,
      type: 'vip_purchase',
      amount: -config.purchasePrice,
      currency: 'points',
      balance: user.points,
      description: `购买${type}VIP卡`,
      metadata: { vipType: type }
    }).save();

    res.json({ success: true, message: '购买成功', data: vipCard });
  } catch (error) {
    res.status(500).json({ success: false, message: '购买失败', error: error.message });
  }
};

// 领取每日星源币
exports.claimDailyStarcoin = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toDateString();

    // 检查今日是否已领取
    const existingTransaction = await Transaction.findOne({
      userId,
      type: 'vip_reward',
      createdAt: { $gte: new Date(today), $lt: new Date(today + ' 23:59:59') }
    });

    if (existingTransaction) {
      return res.status(400).json({ success: false, message: '今日已领取' });
    }

    // 获取用户所有有效VIP卡
    const vipCards = await VipCard.find({ 
      userId, 
      isActive: true,
      expiresAt: { $gte: new Date() }
    });

    if (vipCards.length === 0) {
      return res.status(400).json({ success: false, message: '没有有效VIP卡' });
    }

    // 计算总星源币（每张卡66星源币）
    const totalStarcoin = vipCards.length * 66;

    // 增加星源币
    const user = await User.findById(userId);
    user.starcoin += totalStarcoin;
    await user.save();

    // 记录交易
    await new Transaction({
      userId,
      type: 'vip_reward',
      amount: totalStarcoin,
      currency: 'starcoin',
      balance: user.starcoin,
      description: 'VIP卡每日星源币',
      metadata: { vipCardCount: vipCards.length }
    }).save();

    res.json({ success: true, message: `领取成功，获得${totalStarcoin}星源币`, data: { totalStarcoin } });
  } catch (error) {
    res.status(500).json({ success: false, message: '领取失败', error: error.message });
  }
};
