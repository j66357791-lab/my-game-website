// backend/controllers/raceController.js
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
    const balance = betType === 'points' ? user.points : user.starcoin;
    if (balance < betAmount) {
      return res.status(400).json({
        success: false,
        message: `余额不足！需要 ${betAmount} ${betType === 'points' ? '积分' : '星源币'}`
      });
    }

    // 随机决定胜者（50%概率）
    const winner = Math.random() < 0.5 ? 'turtle' : 'rabbit';
    const isWin = betChoice === winner;
    
    // 计算奖励
    let rewardAmount = 0;
    let newBalance = balance;
    
    if (isWin) {
      rewardAmount = Math.floor(betAmount * 1.9);
      newBalance = balance + rewardAmount;
    } else {
      newBalance = balance - betAmount;
    }

    // 更新用户余额
    if (betType === 'points') {
      user.points = newBalance;
    } else {
      user.starcoin = newBalance;
    }
    
    await user.save();

    // 创建交易记录
    const transactionType = isWin ? 'race_win' : 'race_lose';
    const transactionAmount = isWin ? rewardAmount : -betAmount;
    
    await Transaction.create({
      userId,
      type: transactionType,
      amount: transactionAmount,
      balance: newBalance,
      currency: betType,
      description: isWin 
        ? `龟兔赛跑获胜 - 投注${betChoice === 'turtle' ? '乌龟' : '兔子'}`
        : `龟兔赛跑失败 - 投注${betChoice === 'turtle' ? '乌龟' : '兔子'}`,
      metadata: {
        betChoice,
        winner,
        betAmount,
        rewardAmount
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
      rewardAmount
    });

    res.status(200).json({
      success: true,
      message: isWin ? '恭喜获胜！' : '很遗憾，下次再试！',
      data: {
        winner,
        result: isWin ? 'win' : 'lose',
        rewardAmount,
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
