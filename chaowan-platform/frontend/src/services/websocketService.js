// frontend/src/services/websocketService.js - 匹配后端消息类型
class WebSocketService {
  constructor(token) {
    this.ws = null;
    this.token = token;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectInterval = 5000;
    this.heartbeatInterval = null;
    this.connectionStatus = 'disconnected';
  }

  connect() {
    // 🔧 修复：正确的WebSocket URL
    const wsUrl = `wss://tianchuang.onrender.com/?token=${this.token}`;
    console.log('🔗 连接WebSocket:', wsUrl);
    
    try {
      this.connectionStatus = 'connecting';
      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketEvents();
    } catch (error) {
      console.error('❌ 创建WebSocket连接失败:', error);
      this.connectionStatus = 'error';
    }
  }

  setupWebSocketEvents() {
    this.ws.onopen = () => {
      console.log('✅ WebSocket连接成功');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifyListeners({ type: 'CONNECTED' });
      
      // 🔧 请求当前游戏状态
      this.sendMessage({
        type: 'GET_STATE'  // 🔧 匹配后端期望的消息类型
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
      this.connectionStatus = 'disconnected';
      this.stopHeartbeat();
      this.notifyListeners({ type: 'DISCONNECTED', code: event.code });
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket错误:', error);
      this.connectionStatus = 'error';
      this.notifyListeners({ type: 'ERROR', error: '连接错误' });
    };
  }

  // 🔧 修复：处理后端发送的消息类型
  handleMessage(message) {
    switch (message.type) {
      case 'CONNECTED':
        this.notifyListeners(message);
        break;
      case 'GAME_STATE':
        this.notifyListeners(message);
        break;
      case 'BET_SUCCESS':
        this.notifyListeners(message);
        break;
      case 'SETTLEMENT':
        this.notifyListeners(message);
        break;
      case 'ERROR':
        this.notifyListeners(message);
        break;
      case 'HISTORY':
        this.notifyListeners(message);
        break;
      default:
        console.log('📨 未知消息类型:', message);
        this.notifyListeners(message);
    }
  }

  // 🔧 修复：发送匹配后端的消息
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

  // 🔧 修复：下注方法 - 匹配后端期望
  placeBet(general, amount) {
    return this.sendMessage({
      type: 'BET',  // 🔧 后端期望的是 BET，不是 PLACE_BET
      payload: {
        general,
        amount
      }
    });
  }

  // 🔧 修复：获取游戏状态
  getGameState() {
    return this.sendMessage({
      type: 'GET_STATE'
    });
  }

  // 🔧 修复：获取历史记录
  getHistory() {
    return this.sendMessage({
      type: 'GET_HISTORY'
    });
  }

  // 🔧 心跳机制
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage({ type: 'HEARTBEAT' });
    }, 30000);
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

  // 🔧 获取连接状态
  getConnectionStatus() {
    return this.connectionStatus;
  }
}

export default WebSocketService;
