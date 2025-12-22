// frontend/src/services/websocketService.js - 完整修复版
class WebSocketService {
  constructor(token) {
    this.ws = null;
    this.token = token;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 2; // 🔧 减少重连次数
    this.reconnectInterval = 5000;
    this.heartbeatInterval = null;
    this.connectionStatus = 'disconnected';
    this.isDestroyed = false; // 🔧 防止销毁后继续操作
  }

  connect() {
    if (this.isDestroyed) {
      console.log('⚠️ 服务已销毁，跳过连接');
      return;
    }

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
      if (this.isDestroyed) return; // 🔧 防止销毁后执行
      
      console.log('✅ WebSocket连接成功');
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifyListeners({ type: 'CONNECTED' });
      
      // 🔧 只在连接成功时发送一次GET_STATE
      this.sendMessage({
        type: 'GET_STATE'
      });
    };

    this.ws.onmessage = (event) => {
      if (this.isDestroyed) return; // 🔧 防止销毁后执行
      
      try {
        const message = JSON.parse(event.data);
        console.log('📨 收到WebSocket消息:', message);
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ 解析WebSocket消息失败:', error);
      }
    };

    this.ws.onclose = (event) => {
      if (this.isDestroyed) return; // 🔧 防止销毁后执行
      
      console.log('❌ WebSocket连接关闭:', event.code, event.reason);
      this.connectionStatus = 'disconnected';
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
      if (this.isDestroyed) return; // 🔧 防止销毁后执行
      
      console.error('❌ WebSocket错误:', error);
      this.connectionStatus = 'error';
      this.notifyListeners({ type: 'ERROR', error: '连接错误' });
    };
  }

  // 🔧 修复心跳机制 - 降低频率
  startHeartbeat() {
    this.stopHeartbeat(); // 🔧 先停止之前的心跳
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected() && !this.isDestroyed) {
        this.sendMessage({ type: 'HEARTBEAT' });
      }
    }, 30000); // 30秒一次心跳
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
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

  // 监听器管理
  addListener(listener) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, listener);
    return id;
  }

  // ✅【新增】精确移除监听器
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

  // 🔧 关键修复：正确的断开连接
  disconnect() {
    console.log('🔌 断开WebSocket连接');
    this.isDestroyed = true; // 🔧 标记为已销毁
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // 清理监听器
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
