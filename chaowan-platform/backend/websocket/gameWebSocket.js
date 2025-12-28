const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const MysteryCardGame = require('../models/MysteryCardGame');

class GameWebSocket {
  constructor() {
    this.clients = new Map();
    this.gameState = {
      currentPhase: 'PREPARE',
      timeRemaining: 5,
      roundNumber: 1,
      lordCard: null,
      generalsCards: { east: null, south: null, west: null, north: null },
      bets: new Map(),
      totalBetsByPosition: { east: 0, south: 0, west: 0, north: 0 },
      revealStep: 0,
      // 领主模式状态
      currentLeader: null, 
      leaderQueue: [],
    };
    this.timers = {};
    this.userHistoryThrottle = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // 🔧 修复：先同步期号，再启动游戏循环
    this.syncRoundNumber().then(() => {
      this.startGameLoop();
    });

    this.startHeartbeat();
    console.log('🎮 领主模式 WebSocket服务器启动 (完整安全版 + 概率修正)');
  }

  // 🔧 新增：从数据库同步期号
  async syncRoundNumber() {
    try {
      const lastGame = await MysteryCardGame.findOne().sort({ roundNumber: -1 });
      if (lastGame) {
        this.gameState.roundNumber = lastGame.roundNumber + 1;
        console.log(`🔄 数据库同步: 恢复到第 ${this.gameState.roundNumber} 轮`);
      } else {
        console.log(`🔄 数据库同步: 未发现历史记录，从第 1 轮开始`);
        this.gameState.roundNumber = 1;
      }
    } catch (error) {
      console.error('❌ 同步期号失败，默认从第 1 轮开始:', error);
      this.gameState.roundNumber = 1;
    }
  }

  // ====== 🔧 概率算法移植区域 ======

  // 生成领主卡牌
  generateLordCard() {
    const probabilities = [
      { star: 0, prob: 0.05 },
      { star: 1, prob: 0.10 },
      { star: 2, prob: 0.12 },
      { star: 3, prob: 0.05 },
      { star: 4, prob: 0.10 },
      { star: 5, prob: 0.08 },
      { star: 6, prob: 0.13 },
      { star: 7, prob: 0.10 },
      { star: 8, prob: 0.12 },
      { star: 9, prob: 0.10 },
      { star: 10, prob: 0.05 }
    ];
    return this.generateCardByProbability(probabilities);
  }

  // 生成战将卡牌
  generateGeneralCard() {
    const probabilities = [
      { star: 0, prob: 0.04 },
      { star: 1, prob: 0.08 },
      { star: 2, prob: 0.10 },
      { star: 3, prob: 0.07 },
      { star: 4, prob: 0.11 },
      { star: 5, prob: 0.15 },
      { star: 6, prob: 0.13 },
      { star: 7, prob: 0.07 },
      { star: 8, prob: 0.08 },
      { star: 9, prob: 0.08 },
      { star: 10, prob: 0.07 }
    ];
    return this.generateCardByProbability(probabilities);
  }

  // 根据概率生成卡牌
  generateCardByProbability(probabilities) {
    const random = Math.random();
    let cumulative = 0;
    
    for (const { star, prob } of probabilities) {
      cumulative += prob;
      if (random <= cumulative) {
        return star;
      }
    }
    
    return 1; // 默认返回1星
  }
  // ====== 概率算法移植结束 ======

  handleConnection(ws, req) {
    const url = new URL(req.url, 'http://localhost:5000');
    const token = url.searchParams.get('token');
    if (!token) return ws.close(1008, '缺少token');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const userId = decoded.userId;
      this.clients.set(userId, ws);
      ws.userId = userId;
      ws.isAlive = true;
      ws.lastPongTime = Date.now();
      console.log(`✅ 用户 ${userId} 连接成功`);
      this.sendGameState(userId);
      this.sendLeaderStatus(userId); // 发送领主状态
      
      ws.on('pong', () => { 
        ws.isAlive = true; 
        ws.lastPongTime = Date.now();
      });
      ws.on('message', (message) => this.handleMessage(ws, message));
      ws.on('close', (code, reason) => {
        const reasonStr = reason ? reason.toString() : '无原因';
        console.log(`❌ 用户 ${userId} 断开连接 - Code: ${code}, Reason: ${reasonStr}`);
        this.handleDisconnection(userId);
      });
    } catch (error) {
      console.error('❌ Token验证失败:', error.message);
      ws.close(1008, '认证失败');
    }
  }

  // 发送领主状态
  sendLeaderStatus(userId = null) {
    const payload = {
      currentLeader: this.gameState.currentLeader,
      leaderQueue: this.gameState.leaderQueue
    };
    const message = { type: 'LEADER_STATUS', payload };
    
    if (userId) {
      this.sendMessage(userId, message);
    } else {
      this.broadcast(message);
    }
  }

  sendGameState(userId = null) {
    const gameStateData = {
      type: 'GAME_STATE',
      payload: {
        currentPhase: this.gameState.currentPhase,
        timeRemaining: this.gameState.timeRemaining,
        roundNumber: this.gameState.roundNumber,
        lordCard: this.gameState.currentPhase === 'REVEALING' || this.gameState.currentPhase === 'SETTLEMENT' 
          ? this.gameState.lordCard 
          : null,
        generalsCards: this.gameState.currentPhase === 'REVEALING' || this.gameState.currentPhase === 'SETTLEMENT'
          ? this.gameState.generalsCards
          : { east: null, south: null, west: null, north: null },
        totalBets: this.getTotalBets(),
        totalBetsByPosition: this.gameState.totalBetsByPosition,
        revealStep: this.gameState.revealStep,
        betLimit: this.calculateBetLimit()
      }
    };

    if (userId) {
      const userBets = this.gameState.bets.get(userId) || [];
      const messageForUser = {
        ...gameStateData,
        payload: {
          ...gameStateData.payload,
          userBets
        }
      };
      this.sendMessage(userId, messageForUser);
    } else {
      this.broadcast(gameStateData);
    }
  }

  sendMessage(userId, message) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify(message)); } catch (e) { console.error(e); }
    }
  }

  broadcast(message) {
    this.clients.forEach((ws, userId) => this.sendMessage(userId, message));
  }

  getTotalBets() {
    let total = 0;
    for (const userBets of this.gameState.bets.values()) {
      for (const bet of userBets) total += bet.amount;
    }
    return total;
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;
      const userId = ws.userId;
      
      switch(type) {
        case 'BET':
          this.handleBet(ws.userId, payload);
          break;
        case 'GET_STATE':
          this.sendGameState(ws.userId);
          break;
        case 'GET_HISTORY':
          const now = Date.now();
          const lastRequestTime = this.userHistoryThrottle.get(userId) || 0;
          if (now - lastRequestTime < 3000) return;
          this.userHistoryThrottle.set(userId, now);
          this.sendHistory(userId);
          break;
        case 'GET_GAME_HISTORY': 
          this.sendGameHistory(userId);
          break;
        case 'APPLY_LEADER':
          this.handleApplyLeader(userId);
          break;
        case 'REQUEST_DOWN':
          this.handleRequestDown(userId);
          break;
        case 'HEARTBEAT':
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        default:
          console.warn('⚠️ 未知消息:', type);
      }
    } catch (error) {
      console.error('❌ 消息处理错误:', error);
    }
  }

  async handleApplyLeader(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error('用户不存在');

      const availablePoints = user.points - user.lockedPoints;
      if (availablePoints < 10000) {
        throw new Error('可用积分不足10000，无法申请领主');
      }

      if (this.gameState.currentLeader?.userId === userId || 
          this.gameState.leaderQueue.find(q => q.userId === userId)) {
        throw new Error('您已在队列中或当前是领主');
      }

      const lockAmount = 10000;
      user.lockedPoints += lockAmount;
      await user.save({ session });

      const applicant = {
        userId: user._id.toString(),
        username: user.username,
        lockedPoints: lockAmount 
      };

      if (!this.gameState.currentLeader || this.gameState.currentLeader.type === 'SYSTEM') {
        this.gameState.currentLeader = {
          ...applicant,
          roundCount: 0,
          requestedDown: false,
          type: 'USER'
        };
        await session.commitTransaction();
        this.sendLeaderStatus();
        this.sendMessage(userId, { type: 'INFO', message: '您已成为领主！' });
      } else {
        this.gameState.leaderQueue.push(applicant);
        await session.commitTransaction();
        this.sendLeaderStatus();
        this.sendMessage(userId, { type: 'INFO', message: '排队成功' });
      }

    } catch (error) {
      await session.abortTransaction();
      this.sendMessage(userId, { type: 'ERROR', message: error.message });
    } finally {
      session.endSession();
    }
  }

  async handleRequestDown(userId) {
    const leader = this.gameState.currentLeader;
    if (!leader || leader.userId !== userId) {
      return this.sendMessage(userId, { type: 'ERROR', message: '您不是当前领主' });
    }
    if (leader.roundCount < 3) {
      return this.sendMessage(userId, { type: 'ERROR', message: '需连续当庄3把后才能申请下庄' });
    }
    leader.requestedDown = true;
    this.sendLeaderStatus();
    this.sendMessage(userId, { type: 'INFO', message: '已申请下庄，下局结束后退位' });
  }

  calculateBetLimit() {
    if (!this.gameState.currentLeader || this.gameState.currentLeader.type === 'SYSTEM') return 999999;
    return Math.floor(this.gameState.currentLeader.lockedPoints * 0.1);
  }

  async handleBet(userId, { general, amount }) {
    if (this.gameState.currentPhase !== 'BETTING') {
      return this.sendMessage(userId, { type: 'ERROR', message: '当前不在下注阶段' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error('用户不存在');

      if (user.points < amount) throw new Error('积分不足');

      const currentUserBets = this.gameState.bets.get(userId) || [];
      const currentUserTotalBets = currentUserBets.reduce((sum, bet) => sum + bet.amount, 0);
      const userMaxBetLimit = Math.floor(user.points * 0.1); 
      
      if (currentUserTotalBets + amount > userMaxBetLimit) {
        throw new Error(`本局累计下注已达个人上限 (${currentUserTotalBets}/${userMaxBetLimit})`);
      }

      if (this.gameState.currentLeader && this.gameState.currentLeader.type === 'USER') {
        const leaderTotal = Object.values(this.gameState.totalBetsByPosition).reduce((a,b)=>a+b, 0);
        const leaderLimit = this.calculateBetLimit();
        if (leaderTotal + amount > leaderLimit) {
          throw new Error(`本局总下注已满 (领主上限${leaderLimit})`);
        }
      }

      user.points -= amount;
      await user.save({ session });

      const transaction = new Transaction({
        userId,
        type: 'mystery_bet',
        amount: -amount,
        balance: user.points,
        description: `神秘卡牌下注 - ${general}`,
        currency: 'points',
        metadata: {
          betChoice: general,
          betAmount: amount,
          action: 'bet'
        }
      });
      await transaction.save({ session });

      await session.commitTransaction();

      if (!this.gameState.bets.has(userId)) this.gameState.bets.set(userId, []);
      this.gameState.bets.get(userId).push({ general, amount });
      if (this.gameState.totalBetsByPosition[general] !== undefined) {
        this.gameState.totalBetsByPosition[general] += amount;
      }

      this.broadcast({
        type: 'BET_ANIMATION',
        payload: {
          userId,
          username: user.username,
          direction: general,
          amount
        }
      });

      this.sendMessage(userId, {
        type: 'BET_SUCCESS',
        payload: { general, amount, newBalance: user.points, totalBetsByPosition: this.gameState.totalBetsByPosition }
      });
      this.broadcastGameState();
      console.log(`💰 用户 ${userId} 下注成功: ${general} ${amount}, 新余额: ${user.points}`);

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ 下注异常 (已回滚):', error.message);
      this.sendMessage(userId, { type: 'ERROR', message: error.message || '下注服务异常' });
    } finally {
      session.endSession();
    }
  }

  broadcastGameState() {
    const message = {
      type: 'GAME_STATE',
      payload: {
        currentPhase: this.gameState.currentPhase,
        timeRemaining: this.gameState.timeRemaining,
        roundNumber: this.gameState.roundNumber,
        lordCard: this.gameState.currentPhase === 'REVEALING' || this.gameState.currentPhase === 'SETTLEMENT' 
          ? this.gameState.lordCard 
          : null,
        generalsCards: this.gameState.currentPhase === 'REVEALING' || this.gameState.currentPhase === 'SETTLEMENT'
          ? this.gameState.generalsCards
          : { east: null, south: null, west: null, north: null },
        totalBets: this.getTotalBets(),
        totalBetsByPosition: this.gameState.totalBetsByPosition,
        revealStep: this.gameState.revealStep,
        betLimit: this.calculateBetLimit()
      }
    };
    this.clients.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN) {
        const userBets = this.gameState.bets.get(userId) || [];
        ws.send(JSON.stringify({
          ...message,
          payload: { ...message.payload, userBets }
        }));
      }
    });
  }

  startGameLoop() {
    const phases = [
      { name: 'PREPARE', duration: 5 },
      { name: 'BETTING', duration: 30 },
      { name: 'LOCKING', duration: 3 },
      { name: 'REVEALING', duration: 6 },
      { name: 'SETTLEMENT', duration: 5 },
      { name: 'INTERVAL', duration: 2 }
    ];
    let currentPhaseIndex = 0;
    const runPhase = () => {
      const phase = phases[currentPhaseIndex];
      this.gameState.currentPhase = phase.name;
      this.gameState.timeRemaining = phase.duration;
      this.executePhaseLogic(phase.name);
      this.broadcastGameState();
      this.timers.phaseTimer = setTimeout(() => {
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
        if (currentPhaseIndex === 0) this.gameState.roundNumber++;
        runPhase();
      }, phase.duration * 1000);
    };
    runPhase();
  }

  executePhaseLogic(phaseName) {
    switch(phaseName) {
      case 'PREPARE': this.prepareNewRound(); break;
      case 'LOCKING': this.lockBets(); break;
      case 'REVEALING': this.startRevealAnimation(); break;
      case 'SETTLEMENT': this.settleBets(); break;
    }
  }

  prepareNewRound() {
    console.log('🔄 准备新一轮游戏');
    this.gameState.bets.clear();
    this.gameState.totalBetsByPosition = { east: 0, south: 0, west: 0, north: 0 };
    this.gameState.revealStep = 0;

    // 🔧 修复：使用权重算法生成卡牌
    this.gameState.finalCards = {
      lord: this.generateLordCard(), // 使用概率算法
      generals: {
        east: this.generateGeneralCard(), // 使用概率算法
        south: this.generateGeneralCard(),
        west: this.generateGeneralCard(),
        north: this.generateGeneralCard(),
      }
    };
    
    this.gameState.lordCard = null;
    this.gameState.generalsCards = { east: null, south: null, west: null, north: null };
    console.log('🎴 卡牌已生成:', this.gameState.roundNumber, this.gameState.finalCards);
  }

  lockBets() { console.log('🔒 锁定下注'); }

  startRevealAnimation() {
    console.log('👀 开始翻牌动画...');
    this.gameState.revealStep = 0;
    this.broadcastGameState();
    const positions = ['east', 'south', 'west', 'north'];
    let delay = 0;
    positions.forEach((pos, index) => {
      delay += 1000;
      this.timers[`reveal_${index}`] = setTimeout(() => {
        this.gameState.revealStep = index + 1;
        this.gameState.generalsCards[pos] = this.gameState.finalCards.generals[pos];
        this.broadcastGameState();
      }, delay);
    });
    delay += 1000;
    this.timers['reveal_lord'] = setTimeout(() => {
      this.gameState.revealStep = 5;
      this.gameState.lordCard = this.gameState.finalCards.lord;
      this.broadcastGameState();
    }, delay);
  }

  async settleBets() {
    console.log('💰 开始领主模式结算');
    
    try {
      const { lord: lordStar, generals } = this.gameState.finalCards;
      let leaderBalanceChange = 0;
      const leader = this.gameState.currentLeader;

      for (const [userId, userBets] of this.gameState.bets) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
          const user = await User.findById(userId).session(session);
          if (!user) continue;

          let totalWinAmount = 0;
          let totalLossAmount = 0;
          const roundResults = [];
          let hasLoss = false;

          for (const bet of userBets) {
            const { general, amount } = bet;
            const generalStar = generals[general];

            let winAmount = 0;
            let result = 'lose';
            let multiplier = 0;
            let extraLoss = 0;

            if (generalStar > lordStar) {
              result = 'win';
              const rewardMultiplier = generalStar === 0 ? 1 : generalStar;
              winAmount = amount * rewardMultiplier;
              multiplier = rewardMultiplier;
              totalWinAmount += winAmount;
              leaderBalanceChange -= winAmount; 
            } else if (generalStar === lordStar) {
              result = 'draw';
              winAmount = amount;
              multiplier = 1;
              totalWinAmount += winAmount;
            } else {
              result = 'lose';
              const lossMultiplier = lordStar === 0 ? 1 : lordStar;
              multiplier = -lossMultiplier;
              extraLoss = amount * (lossMultiplier - 1);
              
              if (extraLoss > 0) {
                if (user.points >= extraLoss) {
                  user.points -= extraLoss;
                  totalLossAmount += extraLoss;
                  hasLoss = true;
                  leaderBalanceChange += extraLoss; 
                } else {
                  totalLossAmount += user.points;
                  user.points = 0;
                  hasLoss = true;
                  leaderBalanceChange += user.points;
                }
              }
              leaderBalanceChange += amount; 
            }

            roundResults.push({ general, amount, result, winAmount, multiplier, generalStar, lordStar, extraLoss });
          }

          if (totalWinAmount > 0) {
            user.points += totalWinAmount;
            await user.save({ session });

            const transaction = new Transaction({
              userId,
              type: 'mystery_win',
              amount: totalWinAmount,
              balance: user.points,
              description: `神秘卡牌结算 - 赢得${totalWinAmount}积分`,
              currency: 'points',
              metadata: {
                betChoice: roundResults.map(r => r.general).join(','),
                rewardAmount: totalWinAmount,
                action: 'win'
              }
            });
            await transaction.save({ session });
          } else if (hasLoss) {
            await user.save({ session });

            const transaction = new Transaction({
              userId,
              type: 'mystery_bet',
              amount: -totalLossAmount,
              balance: user.points,
              description: `神秘卡牌结算 - 损失${totalLossAmount}积分`,
              currency: 'points',
              metadata: {
                betChoice: roundResults.map(r => r.general).join(','),
                action: 'lose'
              }
            });
            await transaction.save({ session });
          }

          await session.commitTransaction();

          this.sendMessage(userId, {
            type: 'SETTLEMENT',
            payload: {
              roundNumber: this.gameState.roundNumber,
              results: roundResults,
              totalWinAmount,
              newBalance: user.points
            }
          });

        } catch (error) {
          await session.abortTransaction();
          console.error(`❌ 结算用户 ${userId} 失败:`, error.message);
        } finally {
          session.endSession();
        }
      }
      
      if (leader && leader.type === 'USER') {
        const leaderSession = await mongoose.startSession();
        leaderSession.startTransaction();
        try {
          const leaderUser = await User.findById(leader.userId).session(leaderSession);
          if (leaderUser) {
            leaderUser.points += leaderBalanceChange;
            leaderUser.lockedPoints += leaderBalanceChange;
            
            if (leaderUser.lockedPoints < 0) leaderUser.lockedPoints = 0;
            if (leaderUser.points < 0) leaderUser.points = 0;

            if (leaderUser.lockedPoints < 10000) {
              console.log(`👑 领主 ${leaderUser.username} 积分不足，强制下庄`);
              leaderUser.lockedPoints = 0; 
              await leaderUser.save({ leaderSession });
              await leaderSession.commitTransaction();
              
              this.rotateLeader();
            } else {
              await leaderUser.save({ leaderSession });
              await leaderSession.commitTransaction();
              
              this.gameState.currentLeader.lockedPoints = leaderUser.lockedPoints;
              this.gameState.currentLeader.roundCount++;
              
              if (leader.requestedDown) {
                console.log(`👑 领主 ${leaderUser.username} 申请下庄`);
                leaderUser.lockedPoints = 0;
                await leaderUser.save({ leaderSession }); 
                await leaderSession.commitTransaction(); 
                this.rotateLeader();
              } else {
                this.sendLeaderStatus();
              }
            }
          } else {
             await leaderSession.abortTransaction();
          }
        } catch (err) {
          await leaderSession.abortTransaction();
          console.error('领主结算失败', err);
        } finally {
          leaderSession.endSession();
        }
      }

      const roundResults = {
        east: generals.east > lordStar ? 'win' : (generals.east < lordStar ? 'lose' : 'draw'),
        south: generals.south > lordStar ? 'win' : (generals.south < lordStar ? 'lose' : 'draw'),
        west: generals.west > lordStar ? 'win' : (generals.west < lordStar ? 'lose' : 'draw'),
        north: generals.north > lordStar ? 'win' : (generals.north < lordStar ? 'lose' : 'draw')
      };

      new MysteryCardGame({
        roundNumber: this.gameState.roundNumber,
        lordCard: lordStar,
        generalsCards: generals,
        results: roundResults, 
        totalBets: Object.values(this.gameState.totalBetsByPosition).reduce((a,b)=>a+b, 0),
        createdAt: new Date()
      }).save().catch(e => console.error('保存历史失败', e));
      
      this.broadcastGameState();
    } catch (error) {
      console.error('❌ 结算错误:', error);
    }
  }

  rotateLeader() {
    if (this.gameState.leaderQueue.length > 0) {
      const next = this.gameState.leaderQueue.shift();
      this.gameState.currentLeader = {
        userId: next.userId,
        username: next.username,
        lockedPoints: next.lockedPoints,
        roundCount: 0,
        requestedDown: false,
        type: 'USER'
      };
    } else {
      this.gameState.currentLeader = { type: 'SYSTEM', username: '系统' };
    }
    this.sendLeaderStatus();
  }

  async sendHistory(userId) {
    try {
      const history = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10);
      this.sendMessage(userId, { type: 'HISTORY', payload: history });
    } catch (error) {
      console.error('❌ 发送历史记录失败:', error);
    }
  }

  async sendGameHistory(userId) {
    try {
      const history = await MysteryCardGame.find({})
        .sort({ roundNumber: -1 })
        .limit(10)
        .sort({ roundNumber: 1 }); 
      this.sendMessage(userId, { type: 'GAME_HISTORY_DATA', payload: history });
    } catch (error) {
      console.error('❌ 获取游戏历史失败:', error);
      this.sendMessage(userId, { type: 'ERROR', message: '获取历史失败' });
    }
  }

  handleDisconnection(userId) {
    this.clients.delete(userId);
    this.userHistoryThrottle.delete(userId);
  }

  startHeartbeat() {
    const heartbeatInterval = 20000;
    const disconnectTimeout = 120000;

    const checkAlive = () => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          const timeSinceLastPong = Date.now() - (ws.lastPongTime || 0);
          if (timeSinceLastPong > disconnectTimeout) {
            console.log(`💔 清理死亡的连接: ${ws.userId}`);
            ws.terminate();
            if (ws.userId) {
              this.clients.delete(ws.userId);
              this.userHistoryThrottle.delete(ws.userId);
            }
          }
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    };

    this.timers.heartbeat = setInterval(checkAlive, heartbeatInterval);
  }
}

module.exports = GameWebSocket;
