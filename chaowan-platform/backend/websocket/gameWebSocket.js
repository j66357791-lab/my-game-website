// backend/websocket/gameWebSocket.js - 增强容错版 + 集成智能管控
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const MysteryCardControl = require('../models/MysteryCardControl');
const MysteryCardGame = require('../models/MysteryCardGame');
// 🔧 引入控制器以使用其概率算法
const mysteryCardController = require('../controllers/mysteryCardController');

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
      revealStep: 0
    };
    this.timers = {};
    this.userHistoryThrottle = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.startGameLoop();
    this.startHeartbeat();
    console.log('🎮 神秘卡牌WebSocket服务器启动成功 (集成智能管控版)');
  }

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
        revealStep: this.gameState.revealStep
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
      
      if (type === 'BET') {
        console.log(`📨 收到用户 ${userId} 的消息: ${type}`);
      }
      
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
          if (now - lastRequestTime < 3000) {
            return;
          }
          this.userHistoryThrottle.set(userId, now);
          this.sendHistory(userId);
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

      const existingBets = this.gameState.bets.get(userId) || [];
      const existingTotal = existingBets.reduce((sum, b) => sum + b.amount, 0);
      const totalAvailableFunds = user.points + existingTotal;
      const maxBetLimit = Math.floor(totalAvailableFunds * 0.1);
      
      if (existingTotal + amount > maxBetLimit) {
        throw new Error(`本轮下注总额已超限 (已投${existingTotal} + 本次${amount} > 限额${maxBetLimit})`);
      }
      
      if (amount < 1) throw new Error('下注金额必须大于0');

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

      const verifyUser = await User.findById(userId);
      console.log(`[DEBUG] 用户 ${userId} 下注后 DB 真实余额: ${verifyUser.points}`);

      if (!this.gameState.bets.has(userId)) this.gameState.bets.set(userId, []);
      this.gameState.bets.get(userId).push({ general, amount });
      if (this.gameState.totalBetsByPosition[general] !== undefined) {
        this.gameState.totalBetsByPosition[general] += amount;
      }

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
        revealStep: this.gameState.revealStep
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

  // 🔧 修改：准备新的一轮 (集成智能防亏 + 管理员控制)
  async prepareNewRound() {
    console.log(`🔄 准备新一轮游戏: Round ${this.gameState.roundNumber}`);
    this.gameState.bets.clear();
    this.gameState.totalBetsByPosition = { east: 0, south: 0, west: 0, north: 0 };
    this.gameState.revealStep = 0;

    let lordValue;

    // ==================== 1. 智能防亏检查 (最高优先级) ====================
    const autoResult = await this.checkAutoBalance();
    if (autoResult) {
      lordValue = autoResult.fixedLordValue;
      console.log(`🤖 [智能防亏] 触发！强制领主点数为: ${lordValue}`);
    } else {
      // ==================== 2. 管理员手动控制 ====================
      try {
        let config = await MysteryCardControl.findOne();
        if (!config) {
          config = await MysteryCardControl.create({});
        }

        if (config.mode === 'FIXED') {
          lordValue = config.fixedLordValue;
          console.log(`🎯 [管理员控制] 强制领主点数: ${lordValue}`);
        } else {
          // ==================== 3. 正常概率生成 ====================
          // 使用控制器的概率算法
          lordValue = mysteryCardController.generateLordCard();
          console.log(`🎲 [概率生成] 领主点数: ${lordValue}`);
        }
      } catch (err) {
        console.error('❌ 读取控制配置失败，使用默认随机:', err);
        lordValue = mysteryCardController.generateLordCard();
      }
    }

    const generateGeneral = () => mysteryCardController.generateGeneralCard();

    this.gameState.finalCards = {
      lord: lordValue,
      generals: {
        east: generateGeneral(),
        south: generateGeneral(),
        west: generateGeneral(),
        north: generateGeneral(),
      }
    };
    
    this.gameState.lordCard = null;
    this.gameState.generalsCards = { east: null, south: null, west: null, north: null };
  }

  // 🔧 新增：智能防亏检查逻辑
  async checkAutoBalance() {
    try {
      // 从现有的 MysteryCardControl 模型读取自动控制配置
      const config = await MysteryCardControl.findOne();
      
      // 检查是否开启了自动控制，且配置中包含 autoControl 字段
      // 注意：这里我们复用现有的模型，假设你在前端更新配置时，已经把 autoControl 写入了这个 model
      // 如果没有，代码会走 else 分支（默认关闭）
      if (!config || !config.autoControl || !config.autoControl.enabled) {
        return null;
      }

      const threshold = config.autoControl.threshold || 2000;

      // 计算今日净赚
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayGames = await MysteryCardGame.find({ createdAt: { $gte: today } });
      let todayFlow = 0;
      let todayPayout = 0;

      todayGames.forEach(game => {
        todayFlow += game.totalBets || 0;
        todayPayout += game.totalWins || 0;
      });

      const todayNetProfit = todayFlow - todayPayout;

      console.log(`🤖 [防亏检查] 今日流水=${todayFlow}, 派发=${todayPayout}, 净赚=${todayNetProfit}, 阈值=${threshold}`);

      if (todayNetProfit < -threshold) {
        const highCards = [8, 9, 10];
        const randomHighCard = highCards[Math.floor(Math.random() * highCards.length)];
        return {
          mode: 'FIXED',
          fixedLordValue: randomHighCard,
          reason: 'Auto-Balance'
        };
      }

      return null;
    } catch (error) {
      console.error('❌ 智能防亏检查失败:', error);
      return null;
    }
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

  // 🔧 修改：结算 (修复记录保存和结果计算)
  async settleBets() {
    console.log('💰 开始结算所有下注');
    
    let totalRoundWins = 0;
    let totalRoundLosses = 0; // 这里定义总亏损，用于记录

    // 计算本局胜负结果
    const lordStar = this.gameState.finalCards.lord;
    const results = {};
    ['east', 'south', 'west', 'north'].forEach(pos => {
      const generalStar = this.gameState.finalCards.generals[pos];
      if (generalStar > lordStar) {
        results[pos] = 'win';
      } else if (generalStar === lordStar) {
        results[pos] = 'draw';
      } else {
        results[pos] = 'lose';
      }
    });

    try {
      for (const [userId, userBets] of this.gameState.bets) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
          const user = await User.findById(userId).session(session);
          if (!user) continue;

          let totalWinAmount = 0;
          let totalLossAmount = 0; // 用户本局实际扣除（含输的倍率）
          const roundResults = [];
          let hasWin = false;

          for (const bet of userBets) {
            const { general, amount } = bet;
            const generalStar = this.gameState.finalCards.generals[general];
            const result = results[general];

            let winAmount = 0;
            let multiplier = 0;
            let extraLoss = 0;

            if (result === 'win') {
              // 赢：倍率 * 金额
              // 0星按1倍算
              const rewardMultiplier = generalStar === 0 ? 1 : generalStar;
              winAmount = amount * rewardMultiplier;
              multiplier = rewardMultiplier;
              totalWinAmount += winAmount;
              hasWin = true;
            } else if (result === 'draw') {
              // 平：退还本金
              winAmount = amount;
              multiplier = 1;
              totalWinAmount += winAmount;
              hasWin = true;
            } else {
              // 输：不仅输本金，还要扣 倍率
              const lossMultiplier = lordStar === 0 ? 1 : lordStar;
              multiplier = -lossMultiplier;
              // 计算额外扣除部分：(倍率-1) * 本金
              extraLoss = amount * (lossMultiplier - 1);
              
              if (extraLoss > 0) {
                if (user.points >= extraLoss) {
                  user.points -= extraLoss;
                  totalLossAmount += extraLoss;
                } else {
                  totalLossAmount += user.points;
                  user.points = 0;
                }
              }
            }

            roundResults.push({ general, amount, result, winAmount, multiplier, generalStar, lordStar, extraLoss });
          }

          if (totalWinAmount > 0) {
            user.points += totalWinAmount;
            await user.save({ session });
            totalRoundWins += totalWinAmount; // 系统视角的派发

            const transaction = new Transaction({
              userId,
              type: 'mystery_win',
              amount: totalWinAmount,
              balance: user.points,
              description: `神秘卡牌结算 - 赢得${totalWinAmount}积分`,
              currency: 'points',
              metadata: {
                betChoice: roundResults.map(r => r.general).join(','),
                betAmount: roundResults.reduce((s, r) => s + r.amount, 0),
                rewardAmount: totalWinAmount,
                balanceChange: totalWinAmount,
                action: 'win'
              }
            });
            await transaction.save({ session });
            
            console.log(`💰 用户 ${userId} 结算: 赢得 ${totalWinAmount} 积分, 余额: ${user.points}`);
          } else if (totalLossAmount > 0) {
            // 扣除逻辑已在上面处理，这里只保存记录
            // 系统视角的净赚 = 系统收取的 - 系统派发的
            // 这里我们只记录用户的损失，系统总盈亏在最后计算
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
                betAmount: roundResults.reduce((s, r) => s + r.amount, 0),
                rewardAmount: 0,
                balanceChange: -totalLossAmount,
                action: 'lose'
              }
            });
            await transaction.save({ session });
            
            console.log(`💸 用户 ${userId} 结算: 损失 ${totalLossAmount} 积分, 余额: ${user.points}`);
          }

          await session.commitTransaction();

          this.sendMessage(userId, {
            type: 'SETTLEMENT',
            payload: {
              roundNumber: this.gameState.roundNumber,
              results: roundResults,
              totalWinAmount,
              totalLossAmount,
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

      // 🔧 修复：保存本局历史记录到数据库
      try {
        let roundTotalBet = 0;
        for (const userBets of this.gameState.bets.values()) {
           for (const bet of userBets) {
             roundTotalBet += bet.amount;
           }
        }
        
        // 计算系统总派发
        // 注意：这里需要重新遍历 bets 计算总派发，或者上面累加 totalRoundWins
        // 上面的循环中 totalRoundWins 已经累加了所有用户的 winAmount

        await MysteryCardGame.create({
          roundNumber: this.gameState.roundNumber,
          lordCard: this.gameState.finalCards.lord,
          generalsCards: this.gameState.finalCards.generals,
          results: results, // 使用上面计算出的真实 results
          totalBets: roundTotalBet,
          totalWins: totalRoundWins
        });
        console.log('📝 本局历史记录已保存至 DB');
      } catch (historyErr) {
        console.error('❌ 保存历史记录失败:', historyErr);
      }

      this.broadcastGameState();
    } catch (error) {
      console.error('❌ 结算错误:', error);
    }
  }

  async sendHistory(userId) {
    try {
      const history = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10);
      this.sendMessage(userId, { type: 'HISTORY', payload: history });
    } catch (error) {
      console.error('❌ 发送历史记录失败:', error);
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
            console.log(`💔 清理死亡的连接 (2分钟无响应): ${ws.userId}`);
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
