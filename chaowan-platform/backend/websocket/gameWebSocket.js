// backend/websocket/gameWebSocket.js - 修复版
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const MysteryCardController = require('../controllers/mysteryCardController');

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
      roundHistory: []
    };
    this.timers = {};
    this.mysteryCardController = new MysteryCardController();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // 启动游戏循环
    this.startGameLoop();
    console.log('🎮 神秘卡牌WebSocket服务器启动成功');
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
      
      // 🔧 关键修复：发送当前游戏状态
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

  // 🔧 关键修复：添加 sendGameState 方法
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
        totalBets: this.getTotalBets()
      }
    };

    if (userId) {
      // 发送给特定用户
      this.sendMessage(userId, gameStateData);
    } else {
      // 广播给所有用户
      this.broadcast(gameStateData);
    }
  }

  // 🔧 关键修复：添加 sendMessage 方法
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

  // 🔧 关键修复：添加 broadcast 方法
  broadcast(message) {
    this.clients.forEach((ws, userId) => {
      this.sendMessage(userId, message);
    });
  }

  // 🔧 关键修复：添加 getTotalBets 方法
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

  async handleBet(userId, { general, amount }) {
    if (this.gameState.currentPhase !== 'BETTING') {
      this.sendMessage(userId, {
        type: 'ERROR',
        message: '当前不在下注阶段'
      });
      return;
    }

    try {
      // 验证下注
      const result = await this.mysteryCardController.processBet(userId, general, amount);
      
      if (result.success) {
        // 记录下注
        if (!this.gameState.bets.has(userId)) {
          this.gameState.bets.set(userId, []);
        }
        this.gameState.bets.get(userId).push({ general, amount });
        
        // 发送成功消息
        this.sendMessage(userId, {
          type: 'BET_SUCCESS',
          payload: { general, amount, actualAmount: result.actualAmount }
        });
        
        console.log(`💰 用户 ${userId} 下注成功: ${general}战将 ${amount}积分`);
        
        // 广播游戏状态（更新下注信息）
        this.broadcastGameState();
      } else {
        this.sendMessage(userId, {
          type: 'ERROR',
          message: result.message || '下注失败'
        });
      }
    } catch (error) {
      console.error('❌ 下注处理错误:', error);
      this.sendMessage(userId, {
        type: 'ERROR',
        message: error.message || '下注失败'
      });
    }
  }

  // 🔧 修复：添加 broadcastGameState 方法
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
        totalBets: this.getTotalBets()
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
      { name: 'REVEALING', duration: 5 },
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
        this.revealCards();
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
    
    // 🔧 关键：在轮次开始时就确定所有卡牌点数
    this.gameState.lordCard = this.mysteryCardController.generateLordCard();
    this.gameState.generalsCards = {
      east: this.mysteryCardController.generateGeneralCard(),
      south: this.mysteryCardController.generateGeneralCard(),
      west: this.mysteryCardController.generateGeneralCard(),
      north: this.mysteryCardController.generateGeneralCard()
    };
    
    console.log('🎴 卡牌已生成（本轮结果已确定）:', {
      round: this.gameState.roundNumber,
      lord: this.gameState.lordCard,
      generals: this.gameState.generalsCards
    });
  }

  lockBets() {
    console.log('🔒 锁定下注，停止接受新的下注');
    // 锁定阶段，不再接受新的下注
  }

  revealCards() {
    console.log('👀 翻开所有卡牌（显示已确定的结果）');
    // 翻牌阶段，卡牌已经在PREPARE阶段生成，直接显示
    this.broadcastGameState();
  }

  async settleBets() {
    console.log('💰 开始结算所有下注');
    
    try {
      // 结算所有用户的下注
      for (const [userId, userBets] of this.gameState.bets) {
        for (const bet of userBets) {
          const { general, amount } = bet;
          const generalStar = this.gameState.generalsCards[general];
          const lordStar = this.gameState.lordCard;
          
          // 结算这个下注
          const settlement = await this.mysteryCardController.settleBet(
            userId, general, amount, lordStar, generalStar
          );
          
          // 发送结算结果给用户
          this.sendMessage(userId, {
            type: 'SETTLEMENT',
            payload: {
              roundNumber: this.gameState.roundNumber,
              general,
              amount,
              lordStar,
              generalStar,
              result: settlement.result,
              winAmount: settlement.winAmount,
              multiplier: settlement.multiplier
            }
          });
        }
      }
      
      // 保存本轮游戏记录
      await this.saveRoundRecord();
      
    } catch (error) {
      console.error('❌ 结算错误:', error);
    }
  }

  async saveRoundRecord() {
    try {
      // 计算每个战将的结果
      const results = {};
      for (const [general, generalStar] of Object.entries(this.gameState.generalsCards)) {
        if (generalStar > this.gameState.lordCard) {
          results[general] = 'win';
        } else if (generalStar === this.gameState.lordCard) {
          results[general] = 'draw';
        } else {
          results[general] = 'lose';
        }
      }
      
      // 保存到数据库
      await this.mysteryCardController.saveRoundRecord({
        roundNumber: this.gameState.roundNumber,
        lordCard: this.gameState.lordCard,
        generalsCards: this.gameState.generalsCards,
        results,
        totalBets: this.getTotalBets(),
        totalWins: this.calculateTotalWins(results),
        totalLosses: this.calculateTotalLosses(results)
      });
      
      console.log('💾 本轮游戏记录已保存');
    } catch (error) {
      console.error('❌ 保存游戏记录失败:', error);
    }
  }

  calculateTotalWins(results) {
    let total = 0;
    for (const [userId, userBets] of this.gameState.bets) {
      for (const bet of userBets) {
        if (results[bet.general] === 'win') {
          total += bet.amount;
        }
      }
    }
    return total;
  }

  calculateTotalLosses(results) {
    let total = 0;
    for (const [userId, userBets] of this.gameState.bets) {
      for (const bet of userBets) {
        if (results[bet.general] === 'lose') {
          total += bet.amount;
        }
      }
    }
    return total;
  }

  async sendHistory(userId) {
    try {
      const history = await this.mysteryCardController.getGameHistory(10);
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

  // 🔧 新增：同步轮次方法
  async syncRoundNumber() {
    try {
      const latestGame = await this.mysteryCardController.getLatestRound();
      if (latestGame) {
        this.gameState.roundNumber = latestGame.roundNumber + 1;
        console.log(`🔧 WebSocket轮次同步到: ${this.gameState.roundNumber}`);
      }
    } catch (error) {
      console.error('❌ 轮次同步失败:', error);
    }
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
