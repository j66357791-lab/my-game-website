// backend/controllers/vipController.js - 配合现有 VipCard.js 的修正版
const VipCard = require('../models/VipCard');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const VIP_CONFIG = {
  monthly: { price: 1980, duration: 30, dailyStarcoin: 66 },
  quarterly: { price: 5666, duration: 90, dailyStarcoin: 66 },
  yearly: { price: 20999, duration: 360, dailyStarcoin: 66 }
};

// 获取VIP状态
exports.getVipStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const vipCards = await VipCard.find({ userId, isActive: true });
    
    const now = new Date();
    // 过滤掉已过期的卡
    const activeCards = vipCards.filter(card => new Date(card.expiresAt) > now);
    
    const totalDailyStarcoin = activeCards.reduce((sum, card) => 
      sum + (VIP_CONFIG[card.type]?.dailyStarcoin || 0), 0
    );
    
    const latestCard = activeCards.length > 0 
      ? activeCards.reduce((latest, card) => 
          new Date(card.expiresAt) > new Date(latest.expiresAt) ? card : latest
        )
      : null;

    // 检查今日是否已领取
    const today = new Date().toDateString();
    const hasClaimedToday = await Transaction.findOne({
      userId,
      type: 'vip_daily_reward',
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    res.json({
      success: true,
      data: {
        isActive: activeCards.length > 0,
        monthlyCards: activeCards.filter(c => c.type === 'monthly').length,
        quarterlyCards: activeCards.filter(c => c.type === 'quarterly').length,
        yearlyCards: activeCards.filter(c => c.type === 'yearly').length,
        totalDailyStarcoin,
        canClaimDaily: !hasClaimedToday && activeCards.length > 0,
        lastClaimDate: hasClaimedToday ? hasClaimedToday.createdAt : null,
        remainingDays: latestCard 
          ? Math.max(0, Math.ceil((new Date(latestCard.expiresAt) - now) / (1000 * 60 * 60 * 24)))
          : 0
      }
    });
  } catch (error) {
    console.error('获取VIP状态失败:', error);
    res.status(500).json({ success: false, message: '获取VIP状态失败' });
  }
};

// 购买VIP
exports.purchaseVipCard = async (req, res) => {
  try {
    const { type } = req.body; // ⚠️ 注意：这里对应模型里的 type 字段
    const userId = req.user.id;
    const config = VIP_CONFIG[type];
    
    if (!config) {
      return res.status(400).json({ success: false, message: 'VIP类型不存在' });
    }

    const user = await User.findById(userId);
    if (user.points < config.price) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }

    // 检查购买限制
    const activeCards = await VipCard.find({ userId, isActive: true, type: type }); // ⚠️ 查询时也用 type
    const limits = { monthly: 10, quarterly: 5, yearly: 2 };
    
    if (activeCards.length >= limits[type]) {
      return res.status(400).json({ 
        success: false, 
        message: `${type === 'monthly' ? '月卡' : type === 'quarterly' ? '季卡' : '年卡'}购买上限已达到` 
      });
    }

    user.points -= config.price;
    await user.save();

    // ⚠️ 创建时必须使用 type 字段
    const vipCard = new VipCard({
      userId,
      type: type, 
      duration: config.duration, // 传入 duration 让模型自动计算 expiresAt
      dailyStarcoin: config.dailyStarcoin,
      purchasePrice: config.price
    });
    
    await vipCard.save();

    await new Transaction({
      userId,
      type: 'vip_purchase',
      amount: -config.price,
      currency: 'points',
      balance: user.points,
      description: `购买VIP-${type === 'monthly' ? '月卡' : type === 'quarterly' ? '季卡' : '年卡'}`,
      relatedId: vipCard._id
    }).save();

    res.json({
      success: true,
      message: '购买成功',
      data: { vipCard, newPoints: user.points }
    });
  } catch (error) {
    console.error('购买VIP失败:', error);
    res.status(500).json({ success: false, message: '购买VIP失败' });
  }
};

// 领取每日星源币
exports.claimDailyStarcoin = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 检查今日是否已领取
    const today = new Date().toDateString();
    const existingClaim = await Transaction.findOne({
      userId,
      type: 'vip_daily_reward',
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    if (existingClaim) {
      return res.status(400).json({ success: false, message: '今日已领取，请明天再来' });
    }

    // 获取活跃VIP卡
    const now = new Date();
    const vipCards = await VipCard.find({ userId, isActive: true });
    const activeCards = vipCards.filter(card => new Date(card.expiresAt) > now);

    if (activeCards.length === 0) {
      return res.status(400).json({ success: false, message: '您还没有开通VIP特权' });
    }

    const totalStarcoin = activeCards.reduce((sum, card) => 
      sum + (VIP_CONFIG[card.type]?.dailyStarcoin || 0), 0 // ⚠️ 读取时用 card.type
    );

    // 更新用户星源币
    const user = await User.findById(userId);
    user.starcoin += totalStarcoin;
    await user.save();

    await new Transaction({
      userId,
      type: 'vip_daily_reward',
      amount: totalStarcoin,
      currency: 'starcoin',
      balance: user.starcoin,
      description: 'VIP每日星源币奖励'
    }).save();

    res.json({
      success: true,
      message: '领取成功',
      data: { totalStarcoin, newStarcoin: user.starcoin }
    });
  } catch (error) {
    console.error('领取失败:', error);
    res.status(500).json({ success: false, message: '领取失败' });
  }
};
