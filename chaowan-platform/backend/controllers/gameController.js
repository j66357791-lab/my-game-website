// backend/controllers/gameController.js
const mongoose = require('mongoose');
const GameSession = require('../models/GameSession');
const Bet = require('../models/Bet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 新增：生成并下注机器人的函数
const generateAndPlaceBotBets = async (session_id) => {
  try {
    const icons = ['heart', 'burger', 'chest', 'cola', 'car', 'fridge'];
    const botBetsToInsert = [];
    let totalBotPot = 0;

    // 假设我们生成 5-10 个机器人，让场面看起来更热闹
    const botCount = Math.floor(Math.random() * 6) + 5; 

    for (let i = 0; i < botCount; i++) {
      // 每个机器人随机下注 1-3 个图标
      const betCount = Math.floor(Math.random() * 3) + 1;
      const selectedIcons = [...icons].sort(() => Math.random() - 0.5).slice(0, betCount);

      for (const icon of selectedIcons) {
        // 机器人下注金额在 10-160 之间，让奖池更有吸引力
        const betAmount = Math.floor(Math.random() * 150) + 10;
        botBetsToInsert.push({
          session_id,
          user_id: `bot_${i}`, // 🔑 使用特殊前缀 'bot_' 来标识机器人
          icon_type: icon,
          bet_amount: betAmount,
        });
        totalBotPot += betAmount;
      }
    }

    if (botBetsToInsert.length > 0) {
      // 批量插入机器人下注，提高数据库写入效率
      await Bet.insertMany(botBetsToInsert);
      
      // 更新 GameSession 的总奖池和总玩家数
      await GameSession.updateOne(
        { session_id },
        { $inc: { total_pot: totalBotPot, total_players: botCount } }
      );
      console.log(`🤖 为游戏 ${session_id} 生成了 ${botCount} 个机器人，总下注 ${totalBotPot} 积分`);
    }
  } catch (error) {
    console.error('生成机器人下注失败:', error);
  }
};

// 获取当前游戏状态
const getCurrentGame = async (req, res) => {
  try {
    let session = await GameSession.findOne({
      status: { $ne: 'finished' }
    }).sort({ start_time: -1 });

    // 如果没有进行中的游戏，创建一个新的
    if (!session) {
      session = new GameSession({
        session_id: `G${Date.now()}`,
        status: 'betting'
      });
      await session.save();
      
      // 🌟 关键：在新游戏创建后，立即异步生成机器人下注
      generateAndPlaceBotBets(session.session_id); 
    }

    const bets = await Bet.find({ session_id: session.session_id });
    
    res.json({ session, bets });
  } catch (error) {
    console.error('获取当前游戏失败:', error);
    res.status(500).json({ error: error.message });
  }
};

// 下注
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

      // 记录下注交易
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

// 结算游戏
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
    
    // 获取所有下注（包括机器人的）
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
      // 只为真人玩家记录奖励，机器人不需要
      if (!bet.user_id.startsWith('bot_')) {
        betsByIcon[bet.icon_type].players[bet.user_id] = 
          (betsByIcon[bet.icon_type].players[bet.user_id] || 0) + bet.bet_amount;
      }
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

    // 更新真人用户积分并记录交易
    for (const [userId, rewardAmount] of Object.entries(rewards)) {
      const user = await User.findById(userId).session(session);
      const userTotalBet = allBets
        .filter(b => b.user_id === userId)
        .reduce((sum, b) => sum + b.bet_amount, 0);

      const totalReturn = userTotalBet + Math.floor(rewardAmount); // 本金 + 奖励
      const oldPoints = user.points;
      user.points += totalReturn;
      await user.save({ session });

      // 🔧 修复：记录更清晰的获胜交易
      const winTransaction = new Transaction({
        userId,
        type: 'game_win',
        amount: totalReturn, // 记录总返还额
        balance: user.points,
        description: `图标大乱斗获胜 - 本金返还${userTotalBet} + 奖励${Math.floor(rewardAmount)}`,
        metadata: {
          sessionId: session_id,
          gameType: 'icon_brawl',
          winningIcons,
          principalReturned: userTotalBet,
          rewardAmount: Math.floor(rewardAmount)
        }
      });
      await winTransaction.save({ session });
    }

    // 为未获胜的真人用户记录失败交易
    const allPlayerIds = [...new Set(allBets.filter(b => !b.user_id.startsWith('bot_')).map(b => b.user_id))];
    const winnerIds = Object.keys(rewards);
    const loserIds = allPlayerIds.filter(id => !winnerIds.includes(id));

    for (const loserId of loserIds) {
      const totalLost = allBets
        .filter(b => b.user_id === loserId)
        .reduce((sum, b) => sum + b.bet_amount, 0);

      // 🔧 修复：记录更清晰的失败交易
      const loseTransaction = new Transaction({
        userId: loserId,
        type: 'game_lose',
        amount: -totalLost, // 记录总损失
        balance: await User.findById(loserId).then(u => u.points),
        description: `图标大乱斗失败 - 损失${totalLost}积分`,
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

// 获取历史记录
const getHistory = async (req, res) => {
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

// 导出所有函数
module.exports = {
  getCurrentGame,
  placeBet,
  settleGame,
  getHistory
};
