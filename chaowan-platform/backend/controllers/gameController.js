// backend/controllers/raceController.js - 修复错误处理版本
const User = require('../models/User');
const RaceHistory = require('../models/RaceHistory');
const Transaction = require('../models/Transaction');

// 开始龟兔赛跑游戏
const startRace = async (req, res) => {
  try {
    const { betType, betAmount, betChoice } = req.body;
    const userId = req.user._id;

    console.log('🐢🐰 开始游戏:', { userId, betType, betAmount, betChoice });

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
    console.log('💰 用户当前余额:', { betType, currentBalance, betAmount });

    if (currentBalance < betAmount) {
      return res.status(400).json({
        success: false,
        message: `余额不足！需要 ${betAmount} ${betType === 'points' ? '积分' : '星源币'}，当前只有 ${currentBalance}`
      });
    }

    // 随机决定胜者（50%概率）
    const winner = Math.random() < 0.5 ? 'turtle' : 'rabbit';
    const isWin = betChoice === winner;
    
    console.log('🏁 比赛结果:', { winner, isWin, betChoice });
    
    // 计算余额变化
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
    
    console.log('💸 余额计算:', { currentBalance, balanceChange, newBalance, rewardAmount });

    // 🔧 关键修复：先扣除投注金额
    if (betType === 'points') {
      user.points = currentBalance - betAmount;
    } else {
      user.starcoin = currentBalance - betAmount;
    }
    
    await user.save();
    console.log('✅ 扣除投注金额后:', { betType, balance: betType === 'points' ? user.points : user.starcoin });

    // 🔧 关键修复：创建投注交易记录
    try {
      const betTransaction = await Transaction.create({
        userId,
        type: 'race_bet', // 使用修复后的枚举值
        amount: -betAmount, // 负数表示支出
        balance: betType === 'points' ? user.points : user.starcoin,
        currency: betType,
        description: `龟兔赛跑投注${betChoice === 'turtle' ? '乌龟' : '兔子'} - 投入${betAmount}${betType === 'points' ? '积分' : '星源币'}`,
        metadata: {
          betChoice,
          betAmount,
          action: 'bet'
        }
      });

      console.log('💰 创建投注交易记录成功:', betTransaction._id);
    } catch (transactionError) {
      console.error('❌ 创建投注交易记录失败:', transactionError);
      // 回滚用户余额
      if (betType === 'points') {
        user.points = currentBalance;
      } else {
        user.starcoin = currentBalance;
      }
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: '创建投注记录失败',
        error: transactionError.message
      });
    }

    // 🔧 关键修复：如果赢了，再给奖励
    if (isWin) {
      if (betType === 'points') {
        user.points += rewardAmount;
      } else {
        user.starcoin += rewardAmount;
      }
      
      await user.save();
      console.log('🎉 发放奖励后:', { betType, balance: betType === 'points' ? user.points : user.starcoin });

      // 🔧 关键修复：创建奖励交易记录
      try {
        const rewardTransaction = await Transaction.create({
          userId,
          type: 'race_win', // 获胜奖励
          amount: rewardAmount, // 正数表示收入
          balance: betType === 'points' ? user.points : user.starcoin,
          currency: betType,
          description: `龟兔赛跑获胜 - ${winner === 'turtle' ? '乌龟' : '兔子'}胜利，获得${rewardAmount}${betType === 'points' ? '积分' : '星源币'}`,
          metadata: {
            betChoice,
            winner,
            betAmount,
            rewardAmount,
            action: 'win'
          }
        });

        console.log('💰 创建奖励交易记录成功:', rewardTransaction._id);
      } catch (transactionError) {
        console.error('❌ 创建奖励交易记录失败:', transactionError);
        // 这里不需要回滚，因为奖励已经发放
      }
    }

    // 创建游戏历史记录
    try {
      const raceRecord = await RaceHistory.create({
        userId,
        betType,
        betAmount,
        betChoice,
        winner,
        result: isWin ? 'win' : 'lose',
        rewardAmount,
        balanceChange,
        newBalance: betType === 'points' ? user.points : user.starcoin
      });

      console.log('📝 创建游戏历史记录成功:', raceRecord._id);
    } catch (historyError) {
      console.error('❌ 创建游戏历史记录失败:', historyError);
      // 历史记录失败不影响游戏结果
    }

    res.status(200).json({
      success: true,
      message: isWin ? '恭喜获胜！' : '很遗憾，下次再试！',
      data: {
        winner,
        result: isWin ? 'win' : 'lose',
        betAmount,
        rewardAmount,
        balanceChange,
        newBalance: betType === 'points' ? user.points : user.starcoin
      }
    });

  } catch (error) {
    console.error('❌ 龟兔赛跑错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
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
    console.error('❌ 获取赛跑历史错误:', error);
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
    console.error('❌ 获取最近赛跑结果错误:', error);
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
