const RefiningFactory = require('../models/RefiningFactory');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 获取炼化工厂数据
exports.getActivityData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let factoryData = await RefiningFactory.findOne({ userId });
    
    if (!factoryData) {
      factoryData = new RefiningFactory({ userId });
      await factoryData.save();
    }
    
    // 计算当前炼化状态
    let currentStatus = factoryData.status;
    let remainingTime = 0;
    let canClaim = false;
    
    if (factoryData.status === 'active' && factoryData.refiningStartTime) {
      const elapsed = (Date.now() - factoryData.refiningStartTime) / (1000 * 60 * 60); // 转换为小时
      remainingTime = Math.max(0, factoryData.refiningDuration - elapsed);
      
      if (remainingTime <= 0) {
        currentStatus = 'completed';
        canClaim = true;
      }
    }
    
    res.json({
      success: true,
      data: {
        status: currentStatus,
        inputChars: factoryData.inputChars,
        totalChars: factoryData.totalChars,
        refinedChars: factoryData.refinedChars,
        refinedPoints: factoryData.refinedPoints,
        remainingTime: remainingTime,
        canClaim: canClaim
      }
    });
  } catch (error) {
    console.error('获取炼化工厂数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 投入汉字
exports.inputChars = async (req, res) => {
  try {
    const { chars } = req.body;
    const userId = req.user.id;
    
    if (!chars || chars.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要投入的汉字' });
    }
    
    const userActivity = await RefiningFactory.findOne({ userId });
    if (!userActivity) {
      return res.status(400).json({ success: false, message: '未找到炼化工厂数据' });
    }
    
    // 检查用户是否有足够的汉字
    const userBlindBoxActivity = await BlindBoxActivity.findOne({ userId });
    if (!userBlindBoxActivity) {
      return res.status(400).json({ success: false, message: '未找到盲盒活动数据' });
    }
    
    const hasEnoughChars = chars.every(char => {
      const countInRequest = chars.filter(c => c === char).length;
      const countInCollection = userBlindBoxActivity.collectedChars.filter(c => c === char).length;
      return countInRequest <= countInCollection;
    });
    
    if (!hasEnoughChars) {
      return res.status(400).json({ success: false, message: '汉字不足' });
    }
    
    // 扣除用户的汉字
    chars.forEach(char => {
      const index = userBlindBoxActivity.collectedChars.indexOf(char);
      if (index > -1) {
        userBlindBoxActivity.collectedChars.splice(index, 1);
      }
    });
    await userBlindBoxActivity.save();
    
    // 更新炼化工厂数据
    userActivity.inputChars = [...userActivity.inputChars, ...chars];
    userActivity.totalChars += chars.length;
    
    // 计算炼化速度
    const totalInput = userActivity.totalChars;
    let duration = 24; // 默认24小时
    
    if (totalInput >= 2000) {
      duration = 1.5;
    } else if (totalInput >= 1500) {
      duration = 3;
    } else if (totalInput >= 1000) {
      duration = 6;
    } else if (totalInput >= 500) {
      duration = 12;
    }
    
    userActivity.refiningDuration = duration;
    
    // 如果之前是idle状态，开始炼化
    if (userActivity.status === 'idle') {
      userActivity.refiningStartTime = new Date();
      userActivity.status = 'active';
    }
    
    await userActivity.save();
    
    console.log(`🔥 用户投入汉字炼化: ${userId}, 汉字: ${chars.join('')}, 总数量: ${userActivity.totalChars}, 炼化时间: ${duration}小时`);
    
    res.json({ 
      success: true, 
      message: '投入成功',
      data: {
        totalChars: userActivity.totalChars,
        refiningDuration: duration
      }
    });
  } catch (error) {
    console.error('投入汉字失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 取出汉字（扣除5%手续费）
exports.withdrawChars = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const factoryData = await RefiningFactory.findOne({ userId });
    if (!factoryData || factoryData.inputChars.length === 0) {
      return res.status(400).json({ success: false, message: '没有可取出的汉字' });
    }
    
    const inputChars = [...factoryData.inputChars];
    const totalChars = inputChars.length;
    
    // 计算手续费（5%）
    const fee = Math.ceil(totalChars * 0.05);
    const withdrawableChars = totalChars - fee;
    
    if (withdrawableChars <= 0) {
      return res.status(400).json({ success: false, message: '手续费过高，无法取出' });
    }
    
    // 返回可取出的汉字（随机选择）
    const withdrawnChars = inputChars.slice(0, withdrawableChars);
    
    // 更新炼化工厂数据
    factoryData.inputChars = inputChars.slice(withdrawableChars);
    factoryData.totalChars -= totalChars;
    
    await factoryData.save();
    
    // 将取出的汉字返回给用户
    const userBlindBoxActivity = await BlindBoxActivity.findOne({ userId });
    if (userBlindBoxActivity) {
      userBlindBoxActivity.collectedChars = [...userBlindBoxActivity.collectedChars, ...withdrawnChars];
      await userBlindBoxActivity.save();
    }
    
    console.log(`🔄 用户取出汉字: ${userId}, 取出: ${withdrawnChars.join('')}, 手续费: ${fee}`);
    
    res.json({ 
      success: true, 
      message: '取出成功',
      data: {
        withdrawnChars,
        fee,
        remainingChars: factoryData.inputChars.length
      }
    });
  } catch (error) {
    console.error('取出汉字失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 领取积分
exports.claimPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const factoryData = await RefiningFactory.findOne({ userId });
    if (!factoryData || factoryData.refinedPoints === 0) {
      return res.status(400).json({ success: false, message: '没有可领取的积分' });
    }
    
    if (factoryData.status !== 'completed') {
      return res.status(400).json({ success: false, message: '炼化尚未完成' });
    }
    
    const points = factoryData.refinedPoints;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    user.points += points;
    await user.save();
    
    // 重置炼化工厂状态
    factoryData.refinedPoints = 0;
    factoryData.refinedChars = 0;
    factoryData.status = 'idle';
    factoryData.refiningStartTime = null;
    factoryData.refiningDuration = 24;
    
    await factoryData.save();
    
    // 记录交易
    await Transaction.create({
      userId,
      type: 'refining_reward',
      amount: points,
      balance: user.points,
      description: '炼化工厂积分奖励',
      metadata: {
        refinedChars: factoryData.refinedChars
      }
    });
    
    console.log(`💰 用户领取炼化积分: ${userId}, 积分: ${points}`);
    
    res.json({ 
      success: true, 
      message: '领取成功',
      data: {
        points,
        newPoints: user.points
      }
    });
  } catch (error) {
    console.error('领取积分失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取炼化历史
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // 这里需要新增炼化历史模型，暂时用空数组代替
    const history = [];
    
    res.json({
      success: true,
      data: {
        history,
        pagination: {
          currentPage: page,
          totalPages: 1,
          total: history.length
        }
      }
    });
  } catch (error) {
    console.error('获取炼化历史失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};
