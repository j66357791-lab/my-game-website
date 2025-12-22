// frontend/src/services/websocketService.js
class WebSocketService {
  constructor(token) {
    this.ws = null;
    this.token = token;
    this.listeners = new Map();
  }

  connect() {
    const wsUrl = `wss://tianchuang.onrender.com/?token=${this.token}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('🔗 WebSocket连接成功');
      this.notifyListeners({ type: 'CONNECTED' });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.notifyListeners(message);
    };

    this.ws.onclose = () => {
      console.log('❌ WebSocket连接关闭');
      this.notifyListeners({ type: 'DISCONNECTED' });
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket错误:', error);
      this.notifyListeners({ type: 'ERROR', error });
    };
  }

  addListener(listener) {
    this.listeners.set(listener, listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  notifyListeners(message) {
    this.listeners.forEach(listener => {
      listener(message);
    });
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default WebSocketService;
