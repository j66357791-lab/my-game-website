const mongoose = require('mongoose');
const GameSession = require('../models/GameSession');
const Bet = require('../models/Bet');
const User = require('../models/User');

// 获取当前游戏状态
exports.getCurrentGame = async (req, res) => {
  try {
    let session = await GameSession.findOne({
      status: { $ne: 'finished' }
    }).sort({ start_time: -1 });

    if (!session) {
      session = new GameSession({
        session_id: `G${Date.now()}`,
        status: 'betting'
      });
      await session.save();
    }

    const bets = await Bet.find({ session_id: session.session_id });
    
    res.json({ session, bets });
  } catch (error) {
    console.error('获取当前游戏失败:', error);
    res.status(500).json({ error: error.message });
  }
};

// 下注
exports.placeBet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { session_id, bets } = req.body;
    const user_id = req.user.id;
    
    // 验证游戏状态
    const gameSession = await GameSession.findOne({ 
      session_id,
      status: 'betting'
    }).session(session);
    
    if (!gameSession) {
      await session.abortTransaction();
      return res.status(400).json({ error: '下注阶段已结束' });
    }

    // 验证用户积分
    const user = await User.findById(user_id).session(session);
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    
    if (user.points < totalBet) {
      await session.abortTransaction();
      return res.status(400).json({ error: '积分不足' });
    }

    // 处理下注
    for (const bet of bets) {
      if (bet.amount < 10 || bet.amount > 10000) {
        await session.abortTransaction();
        return res.status(400).json({ error: '下注金额必须在10-10000之间' });
      }

      const newBet = new Bet({
        session_id,
        user_id,
        icon_type: bet.icon,
        bet_amount: bet.amount
      });
      await newBet.save({ session });
    }
    
    // 更新用户积分和奖池
    user.points -= totalBet;
    await user.save({ session });
    
    gameSession.total_pot += totalBet;
    await gameSession.save({ session });

    await session.commitTransaction();
    res.json({ success: true });
  } catch (error) {
    await session.abortTransaction();
    console.error('下注失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// 结算游戏
exports.settleGame = async (session_id) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const gameSession = await GameSession.findOne({ 
      session_id,
      status: 'revealing'
    }).session(session);
    
    if (!gameSession) {
      await session.abortTransaction();
      return;
    }

    const resultIcons = GameSession.generateIcons();
    const winningIcons = [...new Set(resultIcons)];
    
    // 获取所有下注
    const allBets = await Bet.find({ 
      session_id 
    }).session(session);

    if (allBets.length === 0) {
      gameSession.status = 'finished';
      gameSession.end_time = new Date();
      gameSession.result_icons = resultIcons;
      gameSession.winning_icons = winningIcons;
      await gameSession.save({ session });
      await session.commitTransaction();
      return;
    }

    // 按图标分组下注
    const betsByIcon = {};
    allBets.forEach(bet => {
      if (!betsByIcon[bet.icon_type]) {
        betsByIcon[bet.icon_type] = { total: 0, players: {} };
      }
      betsByIcon[bet.icon_type].total += bet.bet_amount;
      betsByIcon[bet.icon_type].players[bet.user_id] = 
        (betsByIcon[bet.icon_type].players[bet.user_id] || 0) + bet.bet_amount;
    });

    // 计算奖励
    const rewards = {};
    let totalReward = 0;

    for (const icon of winningIcons) {
      if (betsByIcon[icon]) {
        const iconBets = betsByIcon[icon];
        // 计算失败方的总下注
        const losingBets = allBets
          .filter(b => !winningIcons.includes(b.icon_type))
          .reduce((sum, b) => sum + b.bet_amount, 0);
        
        for (const [playerId, playerBet] of Object.entries(iconBets.players)) {
          const share = (playerBet / iconBets.total) * losingBets;
          rewards[playerId] = (rewards[playerId] || 0) + share;
          totalReward += share;
        }
      }
    }

    // 更新用户积分
    for (const [userId, amount] of Object.entries(rewards)) {
      await User.updateOne(
        { _id: userId },
        { $inc: { points: Math.floor(amount) } },
        { session }
      );
    }
    
    // 更新游戏状态
    gameSession.status = 'finished';
    gameSession.end_time = new Date();
    gameSession.result_icons = resultIcons;
    gameSession.winning_icons = winningIcons;
    await gameSession.save({ session });

    await session.commitTransaction();
    console.log(`游戏 ${session_id} 结算完成，总奖励: ${totalReward}`);
    return { resultIcons, rewards };
  } catch (error) {
    await session.abortTransaction();
    console.error('结算错误:', error);
  } finally {
    session.endSession();
  }
};

// 获取历史记录
exports.getHistory = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    const sessions = await GameSession.find({ 
      status: 'finished' 
    })
    .sort({ end_time: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await GameSession.countDocuments({ 
      status: 'finished' 
    });

    res.json({
      sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ error: error.message });
  }
};
