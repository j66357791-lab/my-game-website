// frontend/src/services/websocketService.js - 完整修复版
class WebSocketService {
  constructor(token) {
    this.ws = null;
    this.token = token;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectInterval = 3000;
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.connectionStatus = 'disconnected';
    this.isDestroyed = false;
    this.isConnecting = false;
  }

  connect() {
    if (this.isDestroyed || this.isConnecting) {
      console.log('⚠️ 服务已销毁或正在连接，跳过');
      return;
    }

    this.isConnecting = true;
    const wsUrl = `wss://tianchuang.onrender.com/?token=${this.token}`;
    console.log('🔗 连接WebSocket:', wsUrl);
    
    try {
      this.connectionStatus = 'connecting';
      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketEvents();
    } catch (error) {
      console.error('❌ 创建WebSocket连接失败:', error);
      this.connectionStatus = 'error';
      this.isConnecting = false;
    }
  }

  setupWebSocketEvents() {
    this.ws.onopen = () => {
      if (this.isDestroyed) return;
      
      console.log('✅ WebSocket连接成功');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.startHeartbeat();
      this.notifyListeners({ type: 'CONNECTED' });
      
      // 🔧 只在连接成功时发送一次GET_STATE
      this.sendMessage({
        type: 'GET_STATE'
      });
    };

    this.ws.onmessage = (event) => {
      if (this.isDestroyed) return;
      
      try {
        const message = JSON.parse(event.data);
        console.log('📨 收到WebSocket消息:', message);
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ 解析WebSocket消息失败:', error);
      }
    };

    this.ws.onclose = (event) => {
      if (this.isDestroyed) return;
      
      console.log('❌ WebSocket连接关闭:', event.code, event.reason);
      this.connectionStatus = 'disconnected';
      this.isConnecting = false;
      this.stopHeartbeat();
      this.notifyListeners({ type: 'DISCONNECTED', code: event.code });
      
      // 🔧 只在异常断开时重连
      if (event.code === 1006 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 计划重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };

    this.ws.onerror = (error) => {
      if (this.isDestroyed) return;
      
      console.error('❌ WebSocket错误:', error);
      this.connectionStatus = 'error';
      this.isConnecting = false;
      this.notifyListeners({ type: 'ERROR', error: '连接错误' });
    };
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected() && !this.isDestroyed) {
        this.sendMessage({ type: 'HEARTBEAT' });
        
        // 设置超时，如果没收到PONG就认为连接有问题
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('⚠️ 心跳超时，重新连接');
          this.reconnect();
        }, 5000);
      }
    }, 30000); // 30秒一次心跳
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  reconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.connect();
  }

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
      case 'PONG':
        console.log('📨 收到 PONG 心跳响应');
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
        }
        break;
      default:
        console.log('📨 未知消息类型:', message);
        this.notifyListeners(message);
    }
  }

  sendMessage(message) {
    if (this.isDestroyed) return false;
    
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

  placeBet(general, amount) {
    return this.sendMessage({
      type: 'BET',
      payload: {
        general,
        amount
      }
    });
  }

  getGameState() {
    return this.sendMessage({
      type: 'GET_STATE'
    });
  }

  getHistory() {
    return this.sendMessage({
      type: 'GET_HISTORY'
    });
  }

  addListener(listener) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, listener);
    return id;
  }

  removeListener(id) {
    if (id) {
      this.listeners.delete(id);
    }
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

  disconnect() {
    console.log('🔌 断开WebSocket连接');
    this.isDestroyed = true;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.listeners.clear();
  }

  getReadyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  isConnected() {
    return this.getReadyState() === WebSocket.OPEN;
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }
}

export default WebSocketService;
