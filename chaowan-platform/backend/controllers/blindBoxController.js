const blindBoxActivity = require('../models/blindBoxActivity');
const blindBoxReward = require('../models/blindBoxReward');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 概率配置（不暴露给前端）
const CHAR_PROBABILITY = [
  { char: '内', weight: 15 },
  { char: '测', weight: 15 },
  { char: '红', weight: 5 },
  { char: '包', weight: 8 },
  { char: '天', weight: 17 },
  { char: '天', weight: 15 }, // 第二个天
  { char: '领', weight: 25 }
];

// 获取随机字符
const getRandomChar = () => {
  const totalWeight = CHAR_PROBABILITY.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of CHAR_PROBABILITY) {
    random -= item.weight;
    if (random <= 0) {
      return item.char;
    }
  }
  return '领'; // 默认返回
};

// 奖励配置
const REWARD_CONFIG = {
  '单字': { chars: 1, amount: 0.88, description: '单字兑换' },
  '内测': { chars: ['内', '测'], amount: 1.58, description: '内测红包' },
  '红包': { chars: ['红', '包'], amount: 3.88, description: '红包奖励' },
  '天天领': { chars: ['天', '天', '领'], amount: 2.88, description: '天天领红包' },
  '内测红包': { chars: ['内', '测', '红', '包'], amount: 5.88, description: '内测红包大礼包' },
  '全集': { chars: ['内', '测', '红', '包', '天', '天', '领'], amount: 9.88, description: '全集大红包' }
};

// 计算奖励
const calculateReward = (chars) => {
  const sortedChars = chars.sort();
  
  // 检查全集
  if (sortedChars.length === 7 && 
      sortedChars.every(char => ['内', '测', '红', '包', '天', '领'].includes(char))) {
    return REWARD_CONFIG['全集'];
  }
  
  // 检查内测红包
  if (sortedChars.includes('内') && sortedChars.includes('测') && 
      sortedChars.includes('红') && sortedChars.includes('包')) {
    return REWARD_CONFIG['内测红包'];
  }
  
  // 检查天天领
  const tianCount = sortedChars.filter(char => char === '天').length;
  if (tianCount >= 2 && sortedChars.includes('领')) {
    return REWARD_CONFIG['天天领'];
  }
  
  // 检查红包
  if (sortedChars.includes('红') && sortedChars.includes('包')) {
    return REWARD_CONFIG['红包'];
  }
  
  // 检查内测
  if (sortedChars.includes('内') && sortedChars.includes('测')) {
    return REWARD_CONFIG['内测'];
  }
  
  // 单字
  if (sortedChars.length === 1) {
    return REWARD_CONFIG['单字'];
  }
  
  return null;
};

// 获取活动数据
exports.getActivityData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 检查活动时间（12.8-12.30）
    const now = new Date();
    const activityStart = new Date('2024-12-08T00:00:00.000Z');
    const activityEnd = new Date('2024-12-30T23:59:59.999Z');
    const exchangeEnd = new Date('2024-12-31T23:59:59.999Z');
    
    if (now < activityStart) {
      return res.json({
        success: true,
        data: {
          status: 'not_started',
          message: '活动尚未开始',
          activityStart,
          activityEnd,
          exchangeEnd
        }
      });
    }
    
    if (now > exchangeEnd) {
      return res.json({
        success: true,
        data: {
          status: 'ended',
          message: '活动已结束',
          activityStart,
          activityEnd,
          exchangeEnd
        }
      });
    }
    
    const user = await User.findById(userId);
    let activityData = await blindBoxActivity.findOne({ userId });
    
    if (!activityData) {
      activityData = new blindBoxActivity({ userId });
      await activityData.save();
    }
    
    const canExchange = now <= exchangeEnd;
    const canDraw = now <= activityEnd;
    
    res.json({
      success: true,
      data: {
        status: canDraw ? 'active' : 'exchange_only',
        collectedChars: activityData.collectedChars,
        totalDraws: activityData.totalDraws,
        userPoints: user.points,
        canDraw,
        canExchange,
        activityStart,
        activityEnd,
        exchangeEnd
      }
    });
  } catch (error) {
    console.error('获取盲盒活动数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 单抽
exports.singleDraw = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 检查活动时间
    const now = new Date();
    const activityEnd = new Date('2024-12-30T23:59:59.999Z');
    
    if (now > activityEnd) {
      return res.status(400).json({ success: false, message: '活动抽取已结束' });
    }
    
    const user = await User.findById(userId);
    if (user.points < 10) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }
    
    // 扣除积分
    user.points -= 10;
    await user.save();
    
    // 随机抽取字符
    const char = getRandomChar();
    
    // 保存抽取记录
    await blindBoxActivity.findOneAndUpdate(
      { userId },
      { 
        $push: { collectedChars: char }, 
        $inc: { totalDraws: 1 },
        lastDrawTime: now,
        updatedAt: now
      },
      { upsert: true }
    );
    
    // 记录交易
    await Transaction.create({
      userId,
      type: 'blindBox_draw',
      amount: -10,
      balance: user.points,
      description: '盲盒单抽',
      metadata: { char, drawType: 'single' }
    });
    
    console.log(`🎲 用户单抽: ${user.username}, 获得: ${char}, 剩余积分: ${user.points}`);
    
    res.json({ 
      success: true, 
      data: { 
        char, 
        remainingPoints: user.points,
        drawType: 'single'
      } 
    });
  } catch (error) {
    console.error('盲盒单抽失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 十连抽
exports.tenDraw = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 检查活动时间
    const now = new Date();
    const activityEnd = new Date('2024-12-30T23:59:59.999Z');
    
    if (now > activityEnd) {
      return res.status(400).json({ success: false, message: '活动抽取已结束' });
    }
    
    const user = await User.findById(userId);
    if (user.points < 95) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }
    
    user.points -= 95;
    await user.save();
    
    const chars = [];
    for (let i = 0; i < 10; i++) {
      chars.push(getRandomChar());
    }
    
    await blindBoxActivity.findOneAndUpdate(
      { userId },
      { 
        $push: { collectedChars: { $each: chars } }, 
        $inc: { totalDraws: 10 },
        lastDrawTime: now,
        updatedAt: now
      },
      { upsert: true }
    );
    
    // 记录交易
    await Transaction.create({
      userId,
      type: 'blindBox_draw',
      amount: -95,
      balance: user.points,
      description: '盲盒十连抽',
      metadata: { chars, drawType: 'ten' }
    });
    
    console.log(`🎲 用户十连抽: ${user.username}, 获得: ${chars.join(', ')}, 剩余积分: ${user.points}`);
    
    res.json({ 
      success: true, 
      data: { 
        chars, 
        remainingPoints: user.points,
        drawType: 'ten'
      } 
    });
  } catch (error) {
    console.error('盲盒十连抽失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 奖励兑换
exports.exchangeReward = async (req, res) => {
  try {
    const { chars } = req.body;
    const userId = req.user.id;
    
    // 检查兑换时间
    const now = new Date();
    const exchangeEnd = new Date('2024-12-31T23:59:59.999Z');
    
    if (now > exchangeEnd) {
      return res.status(400).json({ success: false, message: '兑换时间已结束' });
    }
    
    if (!chars || chars.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要兑换的字符' });
    }
    
    const userActivity = await blindBoxActivity.findOne({ userId });
    if (!userActivity) {
      return res.status(400).json({ success: false, message: '未找到活动数据' });
    }
    
    // 验证字符是否足够
    const hasEnoughChars = chars.every(char => {
      const countInRequest = chars.filter(c => c === char).length;
      const countInCollection = userActivity.collectedChars.filter(c => c === char).length;
      return countInRequest <= countInCollection;
    });
    
    if (!hasEnoughChars) {
      return res.status(400).json({ success: false, message: '字符不足' });
    }
    
    // 计算奖励
    const reward = calculateReward(chars);
    if (!reward) {
      return res.status(400).json({ success: false, message: '无效的字符组合' });
    }
    
    // 更新用户余额
    const user = await User.findById(userId);
    const oldCashBalance = user.cashBalance;
    user.cashBalance += reward.amount;
    await user.save();
    
    // 移除已使用的字符
    chars.forEach(char => {
      const index = userActivity.collectedChars.indexOf(char);
      if (index > -1) {
        userActivity.collectedChars.splice(index, 1);
      }
    });
    await userActivity.save();
    
    // 记录奖励
    await blindBoxReward.create({
      userId,
      rewardType: reward.description,
      amount: reward.amount,
      charsUsed: chars,
      status: 'completed'
    });
    
    // 记录交易
    await Transaction.create({
      userId,
      type: 'blindBox_reward',
      amount: reward.amount,
      balance: user.cashBalance,
      description: `盲盒奖励兑换: ${reward.description}`,
      metadata: { chars, rewardType: reward.description }
    });
    
    console.log(`🎁 用户兑换奖励: ${user.username}, 字符: ${chars.join('')}, 获得: ¥${reward.amount}`);
    
    res.json({ 
      success: true, 
      message: '兑换成功',
      data: { 
        reward: reward.amount,
        rewardType: reward.description,
        newCashBalance: user.cashBalance,
        charsUsed: chars
      } 
    });
  } catch (error) {
    console.error('盲盒奖励兑换失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取兑换记录
exports.getExchangeHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const rewards = await blindBoxReward.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await blindBoxReward.countDocuments({ userId });
    
    res.json({
      success: true,
      data: {
        rewards,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('获取兑换记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};
