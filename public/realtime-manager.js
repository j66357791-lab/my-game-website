/**
 * 实时通信管理器 - 统一管理WebSocket连接和事件
 */
class RealtimeManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
        this.currentUser = null;
        this.connectionPromise = null;
        
        this.init();
    }
    
    /**
     * 初始化实时通信管理器
     */
    init() {
        // 监听用户登录事件
        window.addEventListener('userLoggedIn', (e) => {
            this.connect(e.detail.user);
        });
        
        // 监听用户登出事件
        window.addEventListener('userLoggedOut', () => {
            this.disconnect();
        });
        
        // 页面卸载时断开连接
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
        
        console.log('实时通信管理器初始化完成');
    }
    
    /**
     * 连接到WebSocket服务器
     */
    async connect(user) {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        
        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                // 动态加载socket.io客户端
                this.loadSocketIO().then(() => {
                    this.socket = io({
                        timeout: 20000,
                        forceNew: true,
                        reconnection: true,
                        reconnectionAttempts: this.maxReconnectAttempts,
                        reconnectionDelay: this.reconnectDelay
                    });
                    
                    this.currentUser = user;
                    this.setupEventHandlers();
                    
                    this.socket.on('connect', () => {
                        console.log('🔗 WebSocket连接成功');
                        this.isConnected = true;
                        this.reconnectAttempts = 0;
                        
                        // 发送用户登录信息
                        this.socket.emit('userLogin', {
                            userId: user.id || user.username,
                            username: user.username,
                            name: user.name,
                            role: user.role,
                            points: user.points
                        });
                        
                        resolve(this.socket);
                    });
                    
                    this.socket.on('disconnect', (reason) => {
                        console.log('🔌 WebSocket连接断开:', reason);
                        this.isConnected = false;
                        this.handleDisconnect(reason);
                    });
                    
                    this.socket.on('connect_error', (error) => {
                        console.error('❌ WebSocket连接失败:', error);
                        this.handleConnectionError(error);
                        reject(error);
                    });
                    
                }).catch(reject);
                
            } catch (error) {
                console.error('❌ 初始化WebSocket失败:', error);
                reject(error);
            }
        });
        
        return this.connectionPromise;
    }
    
    /**
     * 动态加载socket.io客户端
     */
    loadSocketIO() {
        return new Promise((resolve, reject) => {
            if (window.io) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        // 积分更新事件
        this.socket.on('pointsUpdated', (data) => {
            console.log('💰 积分更新:', data);
            this.updateLocalPoints(data);
            this.emit('pointsUpdated', data);
        });
        
        // 用户上线事件
        this.socket.on('userOnline', (user) => {
            console.log('👤 用户上线:', user.username);
            this.emit('userOnline', user);
        });
        
        // 用户下线事件
        this.socket.on('userOffline', (user) => {
            console.log('👤 用户下线:', user.username);
            this.emit('userOffline', user);
        });
        
        // 在线用户列表更新
        this.socket.on('onlineUsers', (users) => {
            console.log('👥 在线用户更新:', users.length, '人');
            this.emit('onlineUsers', users);
        });
        
        // 排行榜更新
        this.socket.on('leaderboardUpdate', (leaderboard) => {
            console.log('🏆 排行榜更新');
            this.emit('leaderboardUpdate', leaderboard);
        });
        
        // 游戏房间相关事件
        this.socket.on('gameRoomCreated', (data) => {
            console.log('🎮 游戏房间创建:', data.gameRoom.id);
            this.emit('gameRoomCreated', data);
        });
        
        this.socket.on('playerJoined', (data) => {
            console.log('🎮 玩家加入房间:', data.player.username);
            this.emit('playerJoined', data);
        });
        
        this.socket.on('playerLeft', (data) => {
            console.log('🎮 玩家离开房间:', data.player.username);
            this.emit('playerLeft', data);
        });
        
        this.socket.on('gameStart', (data) => {
            console.log('🎮 游戏开始:', data.gameRoom.id);
            this.emit('gameStart', data);
        });
        
        this.socket.on('gameEnd', (data) => {
            console.log('🎮 游戏结束:', data.gameRoom.id);
            this.emit('gameEnd', data);
        });
        
        this.socket.on('gameResult', (data) => {
            console.log('🎮 游戏结果:', data.result);
            this.emit('gameResult', data);
        });
        
        this.socket.on('gameRoomsList', (rooms) => {
            console.log('🎮 游戏房间列表更新:', rooms.length, '个房间');
            this.emit('gameRoomsList', rooms);
        });
        
        this.socket.on('gameError', (error) => {
            console.error('🎮 游戏错误:', error);
            this.emit('gameError', error);
        });
        
        // 聊天消息事件
        this.socket.on('newMessage', (message) => {
            console.log('💬 新消息:', message.username, ':', message.message);
            this.emit('newMessage', message);
        });
    }
    
    /**
     * 更新本地积分数据
     */
    updateLocalPoints(data) {
        // 更新积分系统
        if (window.pointsSystem) {
            window.pointsSystem.currentUser.points = data.newPoints;
            window.pointsSystem.updatePointsDisplay(data.newPoints);
            
            // 添加积分变动记录
            const record = {
                id: Date.now(),
                userId: this.currentUser.id || this.currentUser.username,
                timestamp: new Date().toISOString(),
                reason: data.reason || '实时同步',
                amount: data.amount || 0,
                oldPoints: data.oldPoints || data.newPoints - (data.amount || 0),
                newPoints: data.newPoints,
                type: (data.amount || 0) > 0 ? 'earn' : 'spend',
                metadata: { ...data.metadata, realtime: true }
            };
            
            window.pointsSystem.history.unshift(record);
            window.pointsSystem.saveHistory();
        }
        
        // 更新用户系统
        if (window.userSystem) {
            window.userSystem.updatePointsDisplay(data.newPoints);
        }
        
        // 更新本地存储
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        currentUser.points = data.newPoints;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    /**
     * 处理连接断开
     */
    handleDisconnect(reason) {
        if (reason === 'io server disconnect') {
            // 服务器主动断开，需要重连
            this.reconnect();
        }
        
        this.emit('disconnect', { reason });
    }
    
    /**
     * 处理连接错误
     */
    handleConnectionError(error) {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.reconnect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('❌ 重连失败，已达到最大重试次数');
            this.emit('connectionFailed', error);
        }
    }
    
    /**
     * 重连
     */
    async reconnect() {
        if (this.isConnected) {
            return;
        }
        
        try {
            if (this.socket) {
                this.socket.disconnect();
            }
            
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (currentUser) {
                await this.connect(currentUser);
            }
        } catch (error) {
            console.error('❌ 重连失败:', error);
        }
    }
    
    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.connectionPromise = null;
        this.currentUser = null;
        
        console.log('🔌 WebSocket连接已断开');
    }
    
    /**
     * 发送事件
     */
    emit(event, data) {
        // 触发本地事件处理器
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('事件处理器执行失败:', error);
                }
            });
        }
        
        // 触发全局事件
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
    
    /**
     * 监听事件
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    /**
     * 移除事件监听
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * 发送消息到服务器
     */
    send(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.warn('⚠️ WebSocket未连接，无法发送消息:', event);
        }
    }
    
    /**
     * 更新积分
     */
    updatePoints(amount, reason, metadata = {}) {
        this.send('updatePoints', {
            userId: this.currentUser?.id || this.currentUser?.username,
            amount,
            reason,
            metadata
        });
    }
    
    /**
     * 创建游戏房间
     */
    createGameRoom(roomId, betAmount) {
        this.send('createGameRoom', {
            userId: this.currentUser?.id || this.currentUser?.username,
            roomId,
            betAmount
        });
    }
    
    /**
     * 加入游戏房间
     */
    joinGameRoom(roomId, betAmount) {
        this.send('joinGameRoom', {
            roomId,
            userId: this.currentUser?.id || this.currentUser?.username,
            betAmount
        });
    }
    
    /**
     * 开始游戏
     */
    startGame(roomId) {
        this.send('startGame', roomId);
    }
    
    /**
     * 离开游戏房间
     */
    leaveGameRoom() {
        this.send('leaveGameRoom');
    }
    
    /**
     * 获取游戏房间列表
     */
    getGameRooms() {
        this.send('getGameRooms');
    }
    
    /**
     * 发送聊天消息
     */
    sendMessage(message, roomId = null) {
        this.send('sendMessage', {
            userId: this.currentUser?.id || this.currentUser?.username,
            message,
            roomId
        });
    }
    
    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            currentUser: this.currentUser
        };
    }
}

// 创建全局实例
window.realtimeManager = new RealtimeManager();

// 页面加载完成后检查登录状态
document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUser = localStorage.getItem('currentUser');
    
    if (isLoggedIn && currentUser) {
        try {
            const user = JSON.parse(currentUser);
            window.realtimeManager.connect(user);
        } catch (error) {
            console.error('解析用户数据失败:', error);
        }
    }
});
