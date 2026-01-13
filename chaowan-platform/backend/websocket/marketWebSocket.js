const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class MarketWebSocket {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  initialize(server) {
    // 注意：这里我们选择路径为 /market，和 /game 区分开
    this.wss = new WebSocket.Server({ server, path: '/market' });
    
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) return ws.close();

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const userId = decoded.userId || decoded.id; // 兼容不同token结构
        this.clients.set(userId, ws);
        ws.userId = userId;
        ws.on('close', () => this.clients.delete(userId));
      } catch (error) {
        ws.close();
      }
    });

    console.log('📈 星源币市场 WebSocket 服务已启动 (路径: /market)');
  }

  // 广播最新成交
  broadcastTrade(trade) {
    const message = JSON.stringify({ type: 'NEW_TRADE', data: trade });
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    });
  }

  // 广播深度变化
  broadcastDepth(depth) {
    const message = JSON.stringify({ type: 'DEPTH_UPDATE', data: depth });
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    });
  }
}

module.exports = new MarketWebSocket();
