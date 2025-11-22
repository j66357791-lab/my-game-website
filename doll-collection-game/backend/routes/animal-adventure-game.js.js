const express = require('express');
const router = express.Router();
const { GameRound, PlayerBet, GameStats } = require('../models/animal-adventure');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 游戏配置
const GAME_CONFIG = {
  ROOMS: ['grassland', 'bushes', 'forest', 'lake', 'cave'],
  ROUND_DURATION: 40000, // 40秒
  SERVICE_FEE: 0.05, // 5%手续费
  RAGE_MODE_CHANCE: 0.05 // 5%狂暴模式概率
};

// 当前活跃轮次
let currentRound = null;
let roundTimer = null;

// 获取当前游戏状态
router.get('/status', async (req, res) => {
  try {
    if (!currentRound) {
      await startNewRound();
    }
    
    const playerBets = await PlayerBet.find({ 
      roundId: currentRound.roundId,
      userId: req.user.id 
    });
    
    res.json({
      roundId: currentRound.roundId,
      status: currentRound.status,
      timeLeft: currentRound.status === 'active' ? 
        Math.max(0, GAME_CONFIG.ROUND_DURATION - (Date.now() - currentRound.startTime)) : 0,
      playerBet: playerBets[0] || null,
      userBalance: req.user.points
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 下注
router.post('/bet', async (req, res) => {
  try {
    const { room, betAmount } = req.body;
    
    if (!currentRound || currentRound.status !== 'active') {
      return res.status(400).json({ error: '游戏未开始或已结束' });
    }
    
    if (betAmount <= 0) {
      return res.status(400).json({ error: '投注金额必须大于0' });
    }
    
    if (req.user.points < betAmount) {
      return res.status(400).json({ error: '积分不足' });
    }
    
    // 检查是否已经下注
    const existingBet = await PlayerBet.findOne({
      roundId: currentRound.roundId,
      userId: req.user.id
    });
    
    if (existingBet) {
      // 更新下注
      const pointsDiff = betAmount - existingBet.betAmount;
      if (pointsDiff > 0) {
        req.user.points -= pointsDiff;
        await req.user.save();
        
        existingBet.betAmount = betAmount;
        existingBet.room = room;
        await existingBet.save();
      }
    } else {
      // 新下注
      req.user.points -= betAmount;
      await req.user.save();
      
      const newBet = new PlayerBet({
        userId: req.user.id,
        roundId: currentRound.roundId,
        room,
        betAmount
      });
      await newBet.save();
    }
    
    // 更新轮次统计
    currentRound.totalBets += betAmount;
    currentRound.totalPlayers = await PlayerBet.distinct('userId', { 
      roundId: currentRound.roundId 
    }).then(users => users.length);
    await currentRound.save();
    
    res.json({ success: true, balance: req.user.points });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取历史记录
router.get('/history', async (req, res) => {
  try {
    const history = await PlayerBet.find({ userId: req.user.id })
      .populate('roundId')
      .sort({ timestamp: -1 })
      .limit(10);
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 开始新轮次
async function startNewRound() {
  const lastRound = await GameRound.findOne().sort({ roundId: -1 });
  const roundId = lastRound ? lastRound.roundId + 1 : 1;
  
  currentRound = new GameRound({
    roundId,
    status: 'active',
    startTime: new Date()
  });
  
  await currentRound.save();
  
  // 设置定时器结束轮次
  roundTimer = setTimeout(async () => {
    await endRound();
  }, GAME_CONFIG.ROUND_DURATION);
}

// 结束轮次
async function endRound() {
  if (!currentRound) return;
  
  currentRound.status = 'finished';
  currentRound.endTime = new Date();
  
  // 确定猎人袭击的房间
  const isRageMode = Math.random() < GAME_CONFIG.RAGE_MODE_CHANCE;
  const numRooms = isRageMode ? 
    Math.floor(Math.random() * 4) + 1 : 1;
  
  const hunterRooms = [];
  const availableRooms = [...GAME_CONFIG.ROOMS];
  
  for (let i = 0; i < numRooms; i++) {
    const randomIndex = Math.floor(Math.random() * availableRooms.length);
    hunterRooms.push(availableRooms[randomIndex]);
    availableRooms.splice(randomIndex, 1);
  }
  
  currentRound.hunterRooms = hunterRooms;
  currentRound.isRageMode = isRageMode;
  
  // 获取所有下注
  const allBets = await PlayerBet.find({ roundId: currentRound.roundId });
  
  // 计算幸存者和失败者
  const survivors = [];
  const losers = [];
  
  allBets.forEach(bet => {
    if (hunterRooms.includes(bet.room)) {
      bet.isSurvivor = false;
      losers.push(bet);
    } else {
      bet.isSurvivor = true;
      survivors.push(bet);
    }
  });
  
  // 计算奖励
  const totalLoserBets = losers.reduce((sum, bet) => sum + bet.betAmount, 0);
  const serviceFee = totalLoserBets * GAME_CONFIG.SERVICE_FEE;
  const rewardPool = totalLoserBets - serviceFee;
  
  // 发放糖果
  const candiesToDistribute = Math.floor(totalLoserBets / 100);
  losers.forEach(bet => {
    const candyRatio = bet.betAmount / totalLoserBets;
    bet.candies = Math.floor(candiesToDistribute * candyRatio);
  });
  
  // 分配奖励给幸存者
  const totalSurvivorBets = survivors.reduce((sum, bet) => sum + bet.betAmount, 0);
  survivors.forEach(bet => {
    // 返还本金
    bet.reward = bet.betAmount;
    
    // 额外奖励
    if (totalSurvivorBets > 0) {
      const extraReward = (rewardPool * bet.betAmount) / totalSurvivorBets;
      bet.reward += extraReward;
    }
    
    // 更新用户积分
    User.findById(bet.userId).then(user => {
      user.points += bet.reward;
      user.candies = (user.candies || 0) + bet.candies;
      return user.save();
    });
  });
  
  // 保存所有下注结果
  await Promise.all(allBets.map(bet => bet.save()));
  await currentRound.save();
  
  // 更新统计数据
  await updateGameStats();
  
  // 通知前端（通过WebSocket）
  notifyRoundEnd(currentRound);
  
  // 3秒后开始新轮次
  setTimeout(() => {
    startNewRound();
  }, 3000);
}

// 更新游戏统计
async function updateGameStats() {
  const today = new Date().toDateString();
  let stats = await GameStats.findOne({ date: today });
  
  if (!stats) {
    stats = new GameStats({ date: today });
  }
  
  stats.totalRounds++;
  stats.totalPlayers += currentRound.totalPlayers;
  stats.totalBets += currentRound.totalBets;
  
  // 更新房间统计
  const roomBets = await PlayerBet.aggregate([
    { $match: { roundId: currentRound.roundId } },
    { $group: { _id: '$room', totalBets: { $sum: '$betAmount' }, count: { $sum: 1 } } }
  ]);
  
  roomBets.forEach(room => {
    const roomKey = room._id;
    if (stats.roomStats[roomKey]) {
      stats.roomStats[roomKey].bets += room.totalBets;
      stats.roomStats[roomKey].players += room.count;
    }
  });
  
  await stats.save();
}

// 通知轮次结束
function notifyRoundEnd(round) {
  // 这里需要集成WebSocket或Socket.io
  // 发送消息到所有连接的客户端
}

module.exports = router;
