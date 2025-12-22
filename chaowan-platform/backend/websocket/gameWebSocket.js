// backend/websocket/gameWebSocket.js - 完整修复版
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 引入必要的模型
const User = require('../models/User');
const Transaction = require('../models/Transaction');

class GameWebSocket {
  constructor() {
    this.clients = new Map(); // userId -> WebSocket
    this.gameState = {
      currentPhase: 'PREPARE',
      timeRemaining: 5,
      roundNumber: 1,
      lordCard: null,
      generalsCards: { east: null, south: null, west: null, north: null },
      bets: new Map(), // userId -> [{ general, amount }]
      // 新增：记录每个位置的总下注额
      totalBetsByPosition: { east: 0, south: 0, west: 0, north: 0 },
      // 新增：用于控制翻牌动画步骤
      revealStep: 0 // 0:未开始, 1:东, 2:南, 3:西, 4:北, 5:领主
    };
    this.timers = {};
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // 启动游戏循环
    this.startGameLoop();
    console.log('🎮 神秘卡牌WebSocket服务器启动成功 (完整修复版)');
  }

  handleConnection(ws, req) {
    console.log('🔗 新的WebSocket连接尝试');
    
    // 获取token
    const url = new URL(req.url, 'http://localhost:5000');
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.log('❌ 连接被拒绝：缺少token');
      ws.close(1008, '缺少认证token');
      return;
    }

    try {
      // 验证token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const userId = decoded.userId;
      
      // 存储客户端连接
      this.clients.set(userId, ws);
      ws.userId = userId;
      ws.isAlive = true;
      
      console.log(`✅ 用户 ${userId} 连接成功`);
      
      // 发送当前游戏状态
      this.sendGameState(userId);
      
      // 设置心跳检测
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
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
      // 发送给特定用户
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
      // 广播给所有用户
      this.broadcast(gameStateData);
    }
  }

  sendMessage(userId, message) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ 发送消息失败 (${userId}):`, error);
      }
    }
  }

  broadcast(message) {
    this.clients.forEach((ws, userId) => {
      this.sendMessage(userId, message);
    });
  }

  getTotalBets() {
    let total = 0;
    for (const userBets of this.gameState.bets.values()) {
      for (const bet of userBets) {
        total += bet.amount;
      }
    }
    return total;
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;
      
      console.log(`📨 收到用户 ${ws.userId} 的消息:`, type);
      
      switch(type) {
        case 'BET':
          this.handleBet(ws.userId, payload);
          break;
        case 'GET_STATE':
          this.sendGameState(ws.userId);
          break;
        case 'GET_HISTORY':
          this.sendHistory(ws.userId);
          break;
        case 'HEARTBEAT':
          // 收到心跳，立即回复PONG
          ws.send(JSON.stringify({ type: 'PONG' }));
          console.log(`💓 收到用户 ${ws.userId} 的心跳，已回复 PONG`);
          break;
        default:
          console.warn('⚠️ 未知消息类型:', type);
      }
    } catch (error) {
      console.error('❌ 消息处理错误:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: '消息格式错误'
      }));
    }
  }

  // 【核心修复 1 & 2 & 5】下注逻辑：增加10%限制与原子性操作，防止误扣费
  async handleBet(userId, { general, amount }) {
    if (this.gameState.currentPhase !== 'BETTING') {
      this.sendMessage(userId, {
        type: 'ERROR',
        message: '当前不在下注阶段'
      });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. 获取用户最新数据（带锁）
      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return this.sendMessage(userId, { type: 'ERROR', message: '用户不存在' });
      }

      // 2. 校验：余额是否足够
      if (user.points < amount) {
        await session.abortTransaction();
        return this.sendMessage(userId, { type: 'ERROR', message: '积分不足' });
      }

      // 3. 校验：10% 限制 (单次下注不能超过总积分的10%)
      const maxBet = Math.floor(user.points * 0.1);
      if (amount > maxBet) {
        await session.abortTransaction();
        return this.sendMessage(userId, { 
          type: 'ERROR', 
          message: `下注失败：单次下注不能超过总积分的10% (最大可投 ${maxBet})` 
        });
      }
      
      // 4. 校验：下注区间
      if (amount < 1) {
        await session.abortTransaction();
        return this.sendMessage(userId, { type: 'ERROR', message: '下注金额必须大于0' });
      }

      // 5. 扣除积分
      user.points -= amount;
      await user.save({ session });

      // 6. 记录交易流水
      const transaction = new Transaction({
        userId,
        type: 'game_bet',
        amount: -amount,
        balance: user.points,
        description: `神秘卡牌下注 - ${general}`,
        metadata: { 
          round: this.gameState.roundNumber, 
          general, 
          amount,
          userBalanceBefore: user.points + amount
        }
      });
      await transaction.save({ session });

      // 7. 提交事务
      await session.commitTransaction();

      // 8. 更新内存中的游戏状态
      if (!this.gameState.bets.has(userId)) {
        this.gameState.bets.set(userId, []);
      }
      this.gameState.bets.get(userId).push({ general, amount });
      
      // 更新位置总下注额
      if (this.gameState.totalBetsByPosition[general] !== undefined) {
        this.gameState.totalBetsByPosition[general] += amount;
      }

      // 9. 发送成功消息（包含最新余额）
      this.sendMessage(userId, {
        type: 'BET_SUCCESS',
        payload: { 
          general, 
          amount, 
          newBalance: user.points,
          totalBetsByPosition: this.gameState.totalBetsByPosition,
          roundNumber: this.gameState.roundNumber
        }
      });

      // 10. 广播状态更新（为了显示实时总下注）
      this.broadcastGameState();
      console.log(`💰 用户 ${userId} 下注成功: ${general} ${amount}, 新余额: ${user.points}`);

    } catch (error) {
      await session.abortTransaction();
      console.error('❌ 下注异常:', error);
      this.sendMessage(userId, { type: 'ERROR', message: '下注服务异常' });
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

    // 广播给所有连接的客户端
    for (const [userId, ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        // 发送用户自己的下注信息
        const userBets = this.gameState.bets.get(userId) || [];
        const messageForUser = {
          ...message,
          payload: {
            ...message.payload,
            userBets
          }
        };
        ws.send(JSON.stringify(messageForUser));
      }
    }
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

      console.log(`🎮 游戏阶段: ${phase.name} (${phase.duration}秒) - 第${this.gameState.roundNumber}轮`);

      // 执行阶段特定逻辑
      this.executePhaseLogic(phase.name);

      // 广播状态
      this.broadcastGameState();

      // 设置下一阶段
      this.timers.phaseTimer = setTimeout(() => {
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
        if (currentPhaseIndex === 0) {
          this.gameState.roundNumber++;
        }
        runPhase();
      }, phase.duration * 1000);
    };

    runPhase();
  }

  executePhaseLogic(phaseName) {
    switch(phaseName) {
      case 'PREPARE':
        this.prepareNewRound();
        break;
      case 'LOCKING':
        this.lockBets();
        break;
      case 'REVEALING':
        this.startRevealAnimation();
        break;
      case 'SETTLEMENT':
        this.settleBets();
        break;
    }
  }

  prepareNewRound() {
    console.log('🔄 准备新一轮游戏');
    
    // 清空上轮下注
    this.gameState.bets.clear();
    this.gameState.totalBetsByPosition = { east: 0, south: 0, west: 0, north: 0 };
    this.gameState.revealStep = 0;
    
    // 生成最终结果并暂存
    this.gameState.finalCards = {
      lord: Math.floor(Math.random() * 10) + 1, // 1-10点
      generals: {
        east: Math.floor(Math.random() * 10) + 1,
        south: Math.floor(Math.random() * 10) + 1,
        west: Math.floor(Math.random() * 10) + 1,
        north: Math.floor(Math.random() * 10) + 1,
      }
    };
    
    // 初始化卡牌为null（隐藏状态）
    this.gameState.lordCard = null;
    this.gameState.generalsCards = { east: null, south: null, west: null, north: null };
    
    console.log('🎴 卡牌已生成（本轮结果已确定）:', {
      round: this.gameState.roundNumber,
      final: this.gameState.finalCards
    });
  }

  lockBets() {
    console.log('🔒 锁定下注，停止接受新的下注');
    // 锁定阶段，不再接受新的下注
  }

  // 【核心修复 3】翻牌动画逻辑：依次翻开东南西北，最后领主
  startRevealAnimation() {
    console.log('👀 开始翻牌动画...');
    this.gameState.revealStep = 0; // 重置步骤
    this.broadcastGameState(); // 发送初始状态（全盖住）

    const positions = ['east', 'south', 'west', 'north'];
    let delay = 0;

    // 依次翻开东南西北，每个间隔1秒
    positions.forEach((pos, index) => {
      delay += 1000; // 每张牌间隔1秒
      this.timers[`reveal_${index}`] = setTimeout(() => {
        this.gameState.revealStep = index + 1;
        // 从预生成的结果中恢复值
        this.gameState.generalsCards[pos] = this.gameState.finalCards.generals[pos];
        console.log(`👁️ 翻开 ${pos}: ${this.gameState.generalsCards[pos]}`);
        this.broadcastGameState();
      }, delay);
    });

    // 最后翻开领主
    delay += 1000;
    this.timers['reveal_lord'] = setTimeout(() => {
      this.gameState.revealStep = 5;
      this.gameState.lordCard = this.gameState.finalCards.lord;
      console.log(`👁️ 翻开 领主: ${this.gameState.lordCard}`);
      this.broadcastGameState();
    }, delay);
  }

  // 【核心修复 4】结算逻辑：正确计算并返还积分
  async settleBets() {
    console.log('💰 开始结算所有下注');
    
    try {
      // 遍历所有用户的下注
      for (const [userId, userBets] of this.gameState.bets) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
          const user = await User.findById(userId).session(session);
          if (!user) continue;

          let totalWinAmount = 0;
          const roundResults = [];

          for (const bet of userBets) {
            const { general, amount } = bet;
            const generalStar = this.gameState.finalCards.generals[general];
            const lordStar = this.gameState.finalCards.lord;

            let winAmount = 0;
            let result = 'lose';
            let multiplier = 0;

            // 游戏规则：战将 > 领主 则赢，反之则输
            // 假设赔率规则：赢了返还本金 + 等额奖励 (1赔1)，即总返还 2倍
            if (generalStar > lordStar) {
              result = 'win';
              winAmount = amount * 2; // 本金 + 奖励
              multiplier = 2;
              totalWinAmount += winAmount;
            } else if (generalStar === lordStar) {
              result = 'draw';
              winAmount = amount; // 平局返还本金
              multiplier = 1;
              totalWinAmount += winAmount;
            } else {
              result = 'lose';
              winAmount = 0;
              multiplier = 0;
            }

            roundResults.push({ 
              general, 
              amount, 
              result, 
              winAmount,
              multiplier,
              generalStar,
              lordStar 
            });
          }

          // 如果有赢钱或平局，更新用户积分
          if (totalWinAmount > 0) {
            const oldPoints = user.points;
            user.points += totalWinAmount;
            await user.save({ session });

            // 记录赢取交易
            const transaction = new Transaction({
              userId,
              type: 'game_win',
              amount: totalWinAmount,
              balance: user.points,
              description: `神秘卡牌结算 - 第${this.gameState.roundNumber}轮 - 赢得${totalWinAmount}积分`,
              metadata: { 
                round: this.gameState.roundNumber, 
                results: roundResults,
                oldBalance: oldPoints
              }
            });
            await transaction.save({ session });
            
            console.log(`💰 用户 ${userId} 结算成功: 赢得 ${totalWinAmount} 积分, 新余额: ${user.points}`);
          }

          await session.commitTransaction();

          // 发送个人结算消息（包含更新后的余额，前端强制刷新）
          this.sendMessage(userId, {
            type: 'SETTLEMENT',
            payload: {
              roundNumber: this.gameState.roundNumber,
              results: roundResults,
              totalWinAmount,
              newBalance: user.points // 关键：发送最新余额
            }
          });

        } catch (error) {
          await session.abortTransaction();
          console.error(`❌ 结算用户 ${userId} 失败:`, error);
        } finally {
          session.endSession();
        }
      }
      
      // 广播结算完成状态
      this.broadcastGameState();
      
    } catch (error) {
      console.error('❌ 结算错误:', error);
    }
  }

  async sendHistory(userId) {
    try {
      // 获取最近的交易记录作为历史
      const history = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20);
      
      this.sendMessage(userId, {
        type: 'HISTORY',
        payload: history
      });
    } catch (error) {
      console.error('❌ 发送历史记录失败:', error);
    }
  }

  handleDisconnection(userId) {
    console.log(`❌ 用户 ${userId} 断开连接`);
    this.clients.delete(userId);
  }

  // 心跳检测
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          console.log('💔 清理死亡的连接');
          ws.terminate();
          if (ws.userId) {
            this.clients.delete(ws.userId);
          }
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }
}

module.exports = GameWebSocket;
