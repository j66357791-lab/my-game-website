// backend/controllers/vipCardController.js
const VipCard = require('../models/VipCard');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 现有方法保持不变...

// 新增：获取VIP状态
exports.getVipStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取用户所有有效VIP卡
    const vipCards = await VipCard.find({ 
      userId, 
      isActive: true,
      expiresAt: { $gte: new Date() }
    }).sort({ expiresAt: -1 });

    if (vipCards.length === 0) {
      return res.json({
        success: true,
        data: {
          isActive: false,
          remainingDays: 0,
          dailyStarcoin: 0,
          canClaimDaily: false,
          lastClaimDate: null,
          vipCards: []
        }
      });
    }

    // 计算剩余天数
    const now = new Date();
    const earliestExpiry = new Date(Math.min(...vipCards.map(card => card.expiresAt)));
    const remainingDays = Math.ceil((earliestExpiry - now) / (1000 * 60 * 60 * 24));

    // 检查今日是否已领取
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayClaim = await Transaction.findOne({
      userId,
      type: 'vip_reward',
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // 计算每日星源币（每张卡66星源币）
    const totalDailyStarcoin = vipCards.length * 66;

    res.json({
      success: true,
      data: {
        isActive: true,
        remainingDays: Math.max(0, remainingDays),
        dailyStarcoin: totalDailyStarcoin,
        canClaimDaily: !todayClaim,
        lastClaimDate: todayClaim ? todayClaim.createdAt : null,
        vipCards: vipCards.map(card => ({
          id: card._id,
          type: card.type,
          duration: card.duration,
          dailyStarcoin: card.dailyStarcoin,
          purchasePrice: card.purchasePrice,
          expiresAt: card.expiresAt
        }))
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取VIP状态失败', 
      error: error.message 
    });
  }
};

// 现有方法保持不变...
exports.purchaseVipCard = async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.id;

    const vipConfig = {
      monthly: { duration: 30, dailyStarcoin: 66, purchasePrice: 1980 },
      quarterly: { duration: 90, dailyStarcoin: 88, purchasePrice: 5666 },
      yearly: { duration: 360, dailyStarcoin: 128, purchasePrice: 20999 }
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

    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.duration);

    // 创建VIP卡
    const vipCard = new VipCard({
      userId,
      type,
      duration: config.duration,
      dailyStarcoin: config.dailyStarcoin,
      purchasePrice: config.purchasePrice,
      expiresAt
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

exports.claimDailyStarcoin = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 检查今日是否已领取
    const existingTransaction = await Transaction.findOne({
      userId,
      type: 'vip_reward',
      createdAt: { $gte: today, $lt: tomorrow }
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

    // 计算总星源币（根据VIP类型）
    let totalStarcoin = 0;
    vipCards.forEach(card => {
      totalStarcoin += card.dailyStarcoin;
    });

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
