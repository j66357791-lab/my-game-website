// backend/controllers/blindBoxController.js - 修复版本
const BlindBoxActivity = require('../models/BlindBoxActivity');
const BlindBoxReward = require('../models/BlindBoxReward');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const CHAR_PROBABILITY = [
  { char: '内', weight: 15 },
  { char: '测', weight: 15 },
  { char: '红', weight: 2 },
  { char: '包', weight: 8 },
  { char: '天', weight: 20 },
  { char: '天', weight: 15 },
  { char: '领', weight: 25 }
];

const getRandomChar = () => {
  const totalWeight = CHAR_PROBABILITY.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of CHAR_PROBABILITY) {
    random -= item.weight;
    if (random <= 0) {
      return item.char;
    }
  }
  return '领';
};

const REWARD_CONFIG = {
  '单字': { chars: 1, amount: 0.88, description: '单字兑换' },
  '内测': { chars: ['内', '测'], amount: 1.58, description: '内测红包' },
  '红包': { chars: ['红', '包'], amount: 3.88, description: '红包奖励' },
  '天天领': { chars: ['天', '天', '领'], amount: 2.88, description: '天天领红包' },
  '内测红包': { chars: ['内', '测', '红', '包'], amount: 5.88, description: '内测红包大礼包' },
  '全集': { chars: ['内', '测', '红', '包', '天', '天', '领'], amount: 9.88, description: '全集大红包' }
};

const calculateReward = (chars) => {
  const sortedChars = chars.sort();
  
  if (sortedChars.length === 7 && 
      sortedChars.every(char => ['内', '测', '红', '包', '天', '领'].includes(char))) {
    return REWARD_CONFIG['全集'];
  }
  
  if (sortedChars.includes('内') && sortedChars.includes('测') && 
      sortedChars.includes('红') && sortedChars.includes('包')) {
    return REWARD_CONFIG['内测红包'];
  }
  
  const tianCount = sortedChars.filter(char => char === '天').length;
  if (tianCount >= 2 && sortedChars.includes('领')) {
    return REWARD_CONFIG['天天领'];
  }
  
  if (sortedChars.includes('红') && sortedChars.includes('包')) {
    return REWARD_CONFIG['红包'];
  }
  
  if (sortedChars.includes('内') && sortedChars.includes('测')) {
    return REWARD_CONFIG['内测'];
  }
  
  if (sortedChars.length === 1) {
    return REWARD_CONFIG['单字'];
  }
  
  return null;
};

exports.getActivityData = async (req, res) => {
  try {
    // 🔧 修复：使用 _id 而不是 id
    const userId = req.user._id;
    console.log('🔥 获取盲盒活动数据 - 用户ID:', userId);
    
    const user = await User.findById(userId);
    let activityData = await BlindBoxActivity.findOne({ userId });
    
    if (!activityData) {
      activityData = new BlindBoxActivity({ userId });
      await activityData.save();
    }
    
    console.log('✅ 获取盲盒活动数据成功');
    
    res.json({
      success: true,
      data: {
        status: 'active',
        collectedChars: activityData.collectedChars || [],
        totalDraws: activityData.totalDraws || 0,
        userPoints: user.points || 0,
        canDraw: true,
        canExchange: true
      }
    });
  } catch (error) {
    console.error('获取盲盒活动数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.singleDraw = async (req, res) => {
  try {
    // 🔧 修复：使用 _id 而不是 id
    const userId = req.user._id;
    console.log('🔥 盲盒单抽 - 用户ID:', userId);
    
    const user = await User.findById(userId);
    if (user.points < 10) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }
    
    user.points -= 10;
    await user.save();
    
    const char = getRandomChar();
    
    await BlindBoxActivity.findOneAndUpdate(
      { userId },
      { 
        $push: { collectedChars: char }, 
        $inc: { totalDraws: 1 },
        lastDrawTime: new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    );
    
    await Transaction.create({
      userId,
      type: 'blindbox_draw',
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
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.tenDraw = async (req, res) => {
  try {
    // 🔧 修复：使用 _id 而不是 id
    const userId = req.user._id;
    console.log('🔥 盲盒十连抽 - 用户ID:', userId);
    
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
    
    await BlindBoxActivity.findOneAndUpdate(
      { userId },
      { 
        $push: { collectedChars: { $each: chars } }, 
        $inc: { totalDraws: 10 },
        lastDrawTime: new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    );
    
    await Transaction.create({
      userId,
      type: 'blindbox_draw',
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
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.hundredDraw = async (req, res) => {
  try {
    // 🔧 修复：使用 _id 而不是 id
    const userId = req.user._id;
    console.log('🔥 盲盒一百连抽 - 用户ID:', userId);
    
    const user = await User.findById(userId);
    if (user.points < 899) {
      return res.status(400).json({ success: false, message: '积分不足，需要899积分' });
    }
    
    user.points -= 899;
    await user.save();
    
    const chars = [];
    for (let i = 0; i < 100; i++) {
      chars.push(getRandomChar());
    }
    
    await BlindBoxActivity.findOneAndUpdate(
      { userId },
      { 
        $push: { collectedChars: { $each: chars } }, 
        $inc: { totalDraws: 100 },
        lastDrawTime: new Date(),
        updatedAt: new Date()
      },
      { upsert: true }
    );
    
    await Transaction.create({
      userId,
      type: 'blindbox_draw',
      amount: -899,
      balance: user.points,
      description: '盲盒一百连抽',
      metadata: { chars, drawType: 'hundred' }
    });
    
    console.log(`🎲 用户一百连抽: ${user.username}, 获得100个字符, 剩余积分: ${user.points}`);
    
    res.json({ 
      success: true, 
      data: { 
        chars, 
        remainingPoints: user.points,
        drawType: 'hundred'
      } 
    });
  } catch (error) {
    console.error('盲盒一百连抽失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.exchangeReward = async (req, res) => {
  try {
    const { chars } = req.body;
    // 🔧 修复：使用 _id 而不是 id
    const userId = req.user._id;
    console.log('🔥 盲盒兑换奖励 - 用户ID:', userId);
    
    if (!chars || chars.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要兑换的字符' });
    }
    
    const userActivity = await BlindBoxActivity.findOne({ userId });
    if (!userActivity) {
      return res.status(400).json({ success: false, message: '未找到活动数据' });
    }
    
    const hasEnoughChars = chars.every(char => {
      const countInRequest = chars.filter(c => c === char).length;
      const countInCollection = userActivity.collectedChars.filter(c => c === char).length;
      return countInRequest <= countInCollection;
    });
    
    if (!hasEnoughChars) {
      return res.status(400).json({ success: false, message: '字符不足' });
    }
    
    const reward = calculateReward(chars);
    if (!reward) {
      return res.status(400).json({ success: false, message: '无效的字符组合' });
    }
    
    const user = await User.findById(userId);
    const oldCashBalance = user.cashBalance;
    user.cashBalance += reward.amount;
    await user.save();
    
    chars.forEach(char => {
      const index = userActivity.collectedChars.indexOf(char);
      if (index > -1) {
        userActivity.collectedChars.splice(index, 1);
      }
    });
    await userActivity.save();
    
    await BlindBoxReward.create({
      userId,
      rewardType: reward.description,
      amount: reward.amount,
      charsUsed: chars,
      status: 'completed'
    });
    
    await Transaction.create({
      userId,
      type: 'blindbox_reward',
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
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

exports.getExchangeHistory = async (req, res) => {
  try {
    // 🔧 修复：使用 _id 而不是 id
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    
    const rewards = await BlindBoxReward.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await BlindBoxReward.countDocuments({ userId });
    
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
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};
