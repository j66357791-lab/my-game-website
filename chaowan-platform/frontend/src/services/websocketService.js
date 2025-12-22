// frontend/src/services/websocketService.js - 真正的游戏通信版
class WebSocketService {
  constructor(token) {
    this.ws = null;
    this.token = token;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.heartbeatInterval = null;
  }

  connect() {
    const wsUrl = `wss://tianchuang.onrender.com/ws?token=${this.token}`;
    console.log('🔗 连接WebSocket:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket连接成功');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.notifyListeners({ type: 'CONNECTED' });
        
        // 连接成功后，请求当前游戏状态
        this.sendMessage({
          type: 'GET_GAME_STATE',
          gameType: 'MYSTERY_CARD'
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 收到WebSocket消息:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ 解析WebSocket消息失败:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('❌ WebSocket连接关闭:', event.code, event.reason);
        this.stopHeartbeat();
        this.notifyListeners({ type: 'DISCONNECTED', code: event.code });
        
        // 自动重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket错误:', error);
        this.notifyListeners({ type: 'ERROR', error });
      };
    } catch (error) {
      console.error('❌ 创建WebSocket连接失败:', error);
    }
  }

  // 处理不同类型的消息
  handleMessage(message) {
    switch (message.type) {
      case 'GAME_STATE_UPDATE':
        this.notifyListeners({ type: 'GAME_STATE', payload: message.payload });
        break;
      case 'GAME_STARTED':
        this.notifyListeners({ type: 'GAME_STARTED', payload: message.payload });
        break;
      case 'BET_PLACED':
        this.notifyListeners({ type: 'BET_PLACED', payload: message.payload });
        break;
      case 'BETS_LOCKED':
        this.notifyListeners({ type: 'BETS_LOCKED', payload: message.payload });
        break;
      case 'CARDS_REVEALED':
        this.notifyListeners({ type: 'CARDS_REVEALED', payload: message.payload });
        break;
      case 'GAME_SETTLED':
        this.notifyListeners({ type: 'GAME_SETTLED', payload: message.payload });
        break;
      case 'ROUND_STARTED':
        this.notifyListeners({ type: 'ROUND_STARTED', payload: message.payload });
        break;
      case 'ERROR':
        this.notifyListeners({ type: 'GAME_ERROR', payload: message.payload });
        break;
      case 'HEARTBEAT':
        // 心跳响应
        break;
      default:
        console.log('📨 未知消息类型:', message);
        this.notifyListeners(message);
    }
  }

  // 发送消息
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      console.log('📤 发送WebSocket消息:', message);
      this.ws.send(messageStr);
      return true;
    } else {
      console.warn('⚠️ WebSocket未连接，无法发送消息:', message);
      return false;
    }
  }

  // 游戏相关方法
  startGame() {
    return this.sendMessage({
      type: 'START_GAME',
      gameType: 'MYSTERY_CARD'
    });
  }

  placeBet(general, amount) {
    return this.sendMessage({
      type: 'PLACE_BET',
      gameType: 'MYSTERY_CARD',
      payload: {
        general,
        amount
      }
    });
  }

  lockBets() {
    return this.sendMessage({
      type: 'LOCK_BETS',
      gameType: 'MYSTERY_CARD'
    });
  }

  revealCards() {
    return this.sendMessage({
      type: 'REVEAL_CARDS',
      gameType: 'MYSTERY_CARD'
    });
  }

  startNewRound() {
    return this.sendMessage({
      type: 'START_NEW_ROUND',
      gameType: 'MYSTERY_CARD'
    });
  }

  // 心跳机制
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage({ type: 'HEARTBEAT' });
    }, 30000); // 30秒心跳
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 监听器管理
  addListener(listener) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, listener);
    return id;
  }

  removeListener(id) {
    this.listeners.delete(id);
  }

  notifyListeners(message) {
    this.listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('❌ 监听器执行失败:', error);
      }
    });
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // 获取连接状态
  getReadyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  isConnected() {
    return this.getReadyState() === WebSocket.OPEN;
  }
}

export default WebSocketService;
