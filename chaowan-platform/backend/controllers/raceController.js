// backend/controllers/raceController.js - 修复版本
const User = require('../models/User');
const RaceHistory = require('../models/RaceHistory');
const Transaction = require('../models/Transaction');

// 开始龟兔赛跑游戏
const startRace = async (req, res) => {
  try {
    const { betType, betAmount, betChoice } = req.body;
    const userId = req.user._id;

    // 验证输入
    if (!betType || !betAmount || !betChoice) {
      return res.status(400).json({
        success: false,
        message: '请填写完整的投注信息'
      });
    }

    if (!['points', 'starcoin'].includes(betType)) {
      return res.status(400).json({
        success: false,
        message: '无效的投注类型'
      });
    }

    if (!['turtle', 'rabbit'].includes(betChoice)) {
      return res.status(400).json({
        success: false,
        message: '无效的投注选择'
      });
    }

    if (betAmount < 1) {
      return res.status(400).json({
        success: false,
        message: '投注金额最少为1'
      });
    }

    // 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查余额
    const currentBalance = betType === 'points' ? user.points : user.starcoin;
    if (currentBalance < betAmount) {
      return res.status(400).json({
        success: false,
        message: `余额不足！需要 ${betAmount} ${betType === 'points' ? '积分' : '星源币'}`
      });
    }

    // 随机决定胜者（50%概率）
    const winner = Math.random() < 0.5 ? 'turtle' : 'rabbit';
    const isWin = betChoice === winner;
    
    // 🔧 修复：正确计算余额变化
    let balanceChange = 0;
    let rewardAmount = 0;
    
    if (isWin) {
      // 赢了：获得投注金额的1.9倍，净收益是投注金额的0.9倍
      rewardAmount = Math.floor(betAmount * 1.9);
      balanceChange = rewardAmount - betAmount; // 净收益
    } else {
      // 输了：扣除投注金额
      balanceChange = -betAmount;
    }
    
    const newBalance = currentBalance + balanceChange;

    // 🔧 修复：更新用户余额
    if (betType === 'points') {
      user.points = newBalance;
    } else {
      user.starcoin = newBalance;
    }
    
    await user.save();

    // 创建交易记录
    const transactionType = isWin ? 'race_win' : 'race_lose';
    
    await Transaction.create({
      userId,
      type: transactionType,
      amount: balanceChange, // 🔧 修复：使用实际余额变化
      balance: newBalance,
      currency: betType,
      description: isWin 
        ? `龟兔赛跑获胜 - 投注${betChoice === 'turtle' ? '乌龟' : '兔子'}，净收益${balanceChange}`
        : `龟兔赛跑失败 - 投注${betChoice === 'turtle' ? '乌龟' : '兔子'}，损失${Math.abs(balanceChange)}`,
      metadata: {
        betChoice,
        winner,
        betAmount,
        rewardAmount,
        balanceChange
      }
    });

    // 创建游戏历史记录
    const raceRecord = await RaceHistory.create({
      userId,
      betType,
      betAmount,
      betChoice,
      winner,
      result: isWin ? 'win' : 'lose',
      rewardAmount,
      balanceChange // 🔧 新增：记录余额变化
    });

    res.status(200).json({
      success: true,
      message: isWin ? '恭喜获胜！' : '很遗憾，下次再试！',
      data: {
        winner,
        result: isWin ? 'win' : 'lose',
        betAmount,
        rewardAmount,
        balanceChange, // 🔧 新增：返回余额变化
        newBalance,
        raceRecord
      }
    });

  } catch (error) {
    console.error('龟兔赛跑错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取用户赛跑历史
const getRaceHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10, page = 1 } = req.query;
    
    const raceHistory = await RaceHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'username');

    const total = await RaceHistory.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        raceHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取赛跑历史错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取最近10次赛跑结果
const getRecentRaces = async (req, res) => {
  try {
    const recentRaces = await RaceHistory.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('winner betAmount createdAt');

    res.status(200).json({
      success: true,
      data: recentRaces
    });

  } catch (error) {
    console.error('获取最近赛跑结果错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

module.exports = {
  startRace,
  getRaceHistory,
  getRecentRaces
};
