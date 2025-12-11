// backend/controllers/gameController.js
const mongoose = require('mongoose');
const GameSession = require('../models/GameSession');
const Bet = require('../models/Bet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ... 其他代码保持不变 ...

// 🔧 修改下注函数，添加交易记录
const placeBet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { session_id, bets } = req.body;
    const user_id = req.user._id;
    
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

      // 🔧 新增：记录下注交易
      const betTransaction = new Transaction({
        userId: user_id,
        type: 'game_bet',
        amount: -bet.amount,
        balance: user.points - bet.amount,
        description: `图标大乱斗下注 - ${bet.icon}`,
        metadata: {
          sessionId: session_id,
          gameType: 'icon_brawl',
          betDetails: {
            icon: bet.icon,
            amount: bet.amount
          }
        }
      });
      await betTransaction.save({ session });
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

// 🔧 修改结算函数，添加奖励交易记录
const settleGame = async (session_id) => {
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

    // 🔧 新增：更新用户积分并记录交易
    for (const [userId, amount] of Object.entries(rewards)) {
      const user = await User.findById(userId).session(session);
      const oldPoints = user.points;
      user.points += Math.floor(amount);
      await user.save({ session });

      // 记录获胜交易
      const winTransaction = new Transaction({
        userId,
        type: 'game_win',
        amount: Math.floor(amount),
        balance: user.points,
        description: `图标大乱斗获胜 - 奖励`,
        metadata: {
          sessionId: session_id,
          gameType: 'icon_brawl',
          winningIcons,
          rewardAmount: Math.floor(amount)
        }
      });
      await winTransaction.save({ session });
    }

    // 🔧 新增：为未获胜用户记录失败交易
    const allPlayerIds = [...new Set(allBets.map(b => b.user_id))];
    const winnerIds = Object.keys(rewards);
    const loserIds = allPlayerIds.filter(id => !winnerIds.includes(id));

    for (const loserId of loserIds) {
      const totalLost = allBets
        .filter(b => b.user_id === loserId)
        .reduce((sum, b) => sum + b.bet_amount, 0);

      const loseTransaction = new Transaction({
        userId: loserId,
        type: 'game_lose',
        amount: -totalLost,
        balance: await User.findById(loserId).then(u => u.points),
        description: `图标大乱斗失败`,
        metadata: {
          sessionId: session_id,
          gameType: 'icon_brawl',
          winningIcons,
          lostAmount: totalLost
        }
      });
      await loseTransaction.save({ session });
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

// 导出所有函数
module.exports = {
  getCurrentGame,
  placeBet,
  settleGame,
  getHistory
};
