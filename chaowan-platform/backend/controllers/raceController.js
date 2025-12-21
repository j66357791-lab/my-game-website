// backend/controllers/raceController.js - 完整修复版本
const User = require('../models/User');
const RaceHistory = require('../models/RaceHistory');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// 开始龟兔赛跑游戏
const startRace = async (req, res) => {
  console.log('🐢🐰 收到游戏请求');
  console.log('👤 请求用户:', req.user);
  console.log('👤 用户ID (_id):', req.user?._id); // 🔧 使用 _id
  console.log('👤 用户名:', req.user?.username);

  // 🔧 关键修复：检查认证状态
  if (!req.user || !req.user._id) {
    console.error('❌ 中间件未正确设置用户信息');
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }

  try {
    const { betType, betAmount, betChoice } = req.body;
    const userId = req.user._id; // 🔧 使用 _id

    console.log('🐢🐰 开始游戏:', { userId, betType, betAmount, betChoice });

    // 🔧 验证输入
    if (!betType || !betAmount || !betChoice) {
      console.log('❌ 缺少必要参数:', { betType, betAmount, betChoice });
      return res.status(400).json({
        success: false,
        message: '请填写完整的投注信息'
      });
    }

    if (!['points', 'starcoin'].includes(betType)) {
      console.log('❌ 无效的投注类型:', betType);
      return res.status(400).json({
        success: false,
        message: '无效的投注类型'
      });
    }

    if (!['turtle', 'rabbit'].includes(betChoice)) {
      console.log('❌ 无效的投注选择:', betChoice);
      return res.status(400).json({
        success: false,
        message: '无效的投注选择'
      });
    }

    if (betAmount < 1) {
      console.log('❌ 投注金额过小:', betAmount);
      return res.status(400).json({
        success: false,
        message: '投注金额最少为1'
      });
    }

    // 🔧 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ 用户不存在:', userId);
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 🔧 检查用户状态
    if (user.disabled) {
      console.log('❌ 用户已被禁用:', user.username);
      return res.status(403).json({
        success: false,
        message: '用户已被禁用'
      });
    }

    // 🔧 检查余额
    const currentBalance = betType === 'points' ? user.points : user.starcoin;
    console.log('💰 用户当前余额:', { betType, currentBalance, betAmount });

    if (currentBalance < betAmount) {
      console.log('❌ 余额不足:', { currentBalance, betAmount });
      return res.status(400).json({
        success: false,
        message: `余额不足！需要 ${betAmount} ${betType === 'points' ? '积分' : '星源币'}，当前只有 ${currentBalance}`
      });
    }

    // 🔧 使用事务确保数据一致性
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 🔧 随机决定胜者（50%概率）
      const winner = Math.random() < 0.5 ? 'turtle' : 'rabbit';
      const isWin = betChoice === winner;
      
      console.log('🏁 比赛结果:', { winner, isWin, betChoice });
      
      // 🔧 计算余额变化
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

      // 🔧 先扣除投注金额
      if (betType === 'points') {
        user.points = currentBalance - betAmount;
      } else {
        user.starcoin = currentBalance - betAmount;
      }
      
      await user.save({ session });
      console.log('✅ 扣除投注金额后:', { betType, balance: betType === 'points' ? user.points : user.starcoin });

      // 🔧 创建投注交易记录
      const betTransaction = await Transaction.create([{
        userId,
        type: 'race_bet',
        amount: -betAmount,
        balance: betType === 'points' ? user.points : user.starcoin,
        currency: betType,
        description: `龟兔赛跑投注${betChoice === 'turtle' ? '乌龟' : '兔子'} - 投入${betAmount}${betType === 'points' ? '积分' : '星源币'}`,
        metadata: {
          betChoice,
          betAmount,
          action: 'bet'
        }
      }], { session });

      console.log('💰 创建投注交易记录成功:', betTransaction[0]._id);

      // 🔧 如果赢了，再给奖励
      if (isWin) {
        if (betType === 'points') {
          user.points += rewardAmount;
        } else {
          user.starcoin += rewardAmount;
        }
        
        await user.save({ session });
        console.log('🎉 发放奖励后:', { betType, balance: betType === 'points' ? user.points : user.starcoin });

        // 🔧 创建奖励交易记录
        const rewardTransaction = await Transaction.create([{
          userId,
          type: 'race_win',
          amount: rewardAmount,
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
        }], { session });

        console.log('💰 创建奖励交易记录成功:', rewardTransaction[0]._id);
      }

      // 🔧 创建游戏历史记录
      const raceRecord = await RaceHistory.create([{
        userId,
        betType,
        betAmount,
        betChoice,
        winner,
        result: isWin ? 'win' : 'lose',
        rewardAmount,
        balanceChange,
        newBalance: betType === 'points' ? user.points : user.starcoin
      }], { session });

      console.log('📝 创建游戏历史记录成功:', raceRecord[0]._id);

      // 🔧 提交事务
      await session.commitTransaction();
      console.log('✅ 事务提交成功');

      console.log('✅ 游戏完成，返回结果');
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

    } catch (transactionError) {
      console.error('❌ 事务执行失败:', transactionError);
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('❌ 龟兔赛跑错误:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 获取用户赛跑历史
const getRaceHistory = async (req, res) => {
  console.log('📜 获取用户赛跑历史请求');
  
  // 🔧 检查认证状态
  if (!req.user || !req.user._id) {
    console.error('❌ 中间件未正确设置用户信息');
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }

  try {
    const userId = req.user._id; // 🔧 使用 _id
    const { limit = 10, page = 1 } = req.query;
    
    console.log('📜 查询参数:', { userId, limit, page });
    
    // 🔧 验证参数
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const parsedPage = Math.max(1, parseInt(page) || 1);
    
    const raceHistory = await RaceHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit)
      .populate('userId', 'username');

    const total = await RaceHistory.countDocuments({ userId });

    console.log('✅ 获取用户赛跑历史成功:', { count: raceHistory.length, total });

    res.status(200).json({
      success: true,
      data: {
        raceHistory,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          pages: Math.ceil(total / parsedLimit)
        }
      }
    });

  } catch (error) {
    console.error('❌ 获取赛跑历史错误:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 获取最近10次赛跑结果
const getRecentRaces = async (req, res) => {
  console.log('📜 获取最近赛跑结果请求');
  
  // 🔧 检查认证状态
  if (!req.user || !req.user._id) {
    console.error('❌ 中间件未正确设置用户信息');
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }

  try {
    // 🔧 获取最近10次全局赛跑结果
    const recentRaces = await RaceHistory.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('winner betAmount createdAt')
      .populate('userId', 'username');

    console.log('✅ 获取最近赛跑结果成功:', { count: recentRaces.length });

    res.status(200).json({
      success: true,
      data: recentRaces
    });

  } catch (error) {
    console.error('❌ 获取最近赛跑结果错误:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 新增：获取用户统计数据
const getUserStats = async (req, res) => {
  console.log('📊 获取用户统计数据请求');
  
  if (!req.user || !req.user._id) {
    console.error('❌ 中间件未正确设置用户信息');
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }

  try {
    const userId = req.user._id; // 🔧 使用 _id

    // 🔧 获取统计数据
    const stats = await RaceHistory.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalRaces: { $sum: 1 },
          totalWins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
          totalInvested: { $sum: '$betAmount' },
          totalProfit: { $sum: '$balanceChange' },
          biggestWin: { $max: { $cond: [{ $eq: ['$result', 'win'] }, '$rewardAmount', 0] } },
          biggestLoss: { $max: { $cond: [{ $eq: ['$result', 'lose'] }, '$betAmount', 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalRaces: 0,
      totalWins: 0,
      totalInvested: 0,
      totalProfit: 0,
      biggestWin: 0,
      biggestLoss: 0
    };

    // 🔧 计算胜率
    const winRate = result.totalRaces > 0 ? (result.totalWins / result.totalRaces * 100).toFixed(2) : 0;

    console.log('✅ 获取用户统计数据成功:', { ...result, winRate });

    res.status(200).json({
      success: true,
      data: {
        ...result,
        winRate: parseFloat(winRate)
      }
    });

  } catch (error) {
    console.error('❌ 获取用户统计数据错误:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 新增：获取游戏统计概览
const getGameOverview = async (req, res) => {
  console.log('📊 获取游戏统计概览请求');
  
  if (!req.user || !req.user._id) {
    console.error('❌ 中间件未正确设置用户信息');
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }

  try {
    // 🔧 获取全局统计数据
    const globalStats = await RaceHistory.aggregate([
      {
        $group: {
          _id: null,
          totalRaces: { $sum: 1 },
          turtleWins: { $sum: { $cond: [{ $eq: ['$winner', 'turtle'] }, 1, 0] } },
          rabbitWins: { $sum: { $cond: [{ $eq: ['$winner', 'rabbit'] }, 1, 0] } },
          totalBetAmount: { $sum: '$betAmount' },
          totalRewardAmount: { $sum: '$rewardAmount' }
        }
      }
    ]);

    // 🔧 获取今日统计数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await RaceHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalRaces: { $sum: 1 },
          totalBetAmount: { $sum: '$betAmount' },
          totalRewardAmount: { $sum: '$rewardAmount' }
        }
      }
    ]);

    const globalResult = globalStats[0] || {
      totalRaces: 0,
      turtleWins: 0,
      rabbitWins: 0,
      totalBetAmount: 0,
      totalRewardAmount: 0
    };

    const todayResult = todayStats[0] || {
      totalRaces: 0,
      totalBetAmount: 0,
      totalRewardAmount: 0
    };

    // 🔧 计算胜率
    const turtleWinRate = globalResult.totalRaces > 0 ? 
      (globalResult.turtleWins / globalResult.totalRaces * 100).toFixed(2) : 50;
    const rabbitWinRate = globalResult.totalRaces > 0 ? 
      (globalResult.rabbitWins / globalResult.totalRaces * 100).toFixed(2) : 50;

    console.log('✅ 获取游戏统计概览成功:', { globalResult, todayResult });

    res.status(200).json({
      success: true,
      data: {
        global: {
          ...globalResult,
          turtleWinRate: parseFloat(turtleWinRate),
          rabbitWinRate: parseFloat(rabbitWinRate)
        },
        today: todayResult
      }
    });

  } catch (error) {
    console.error('❌ 获取游戏统计概览错误:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  startRace,
  getRaceHistory,
  getRecentRaces,
  getUserStats,
  getGameOverview
};
