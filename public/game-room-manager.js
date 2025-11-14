/**
 * 游戏房间管理器 - 处理多人游戏房间逻辑
 */
class GameRoomManager {
    constructor() {
        this.currentRoom = null;
        this.availableRooms = [];
        this.isInGame = false;
        this.eventHandlers = new Map();
        this.gameHistory = [];
        
        this.init();
    }
    
    /**
     * 初始化游戏房间管理器
     */
    init() {
        if (window.realtimeManager) {
            this.setupRealtimeEvents();
        }
        
        // 监听页面卸载，自动离开房间
        window.addEventListener('beforeunload', () => {
            this.leaveRoom();
        });
        
        console.log('游戏房间管理器初始化完成');
    }
    
    /**
     * 设置实时事件监听
     */
    setupRealtimeEvents() {
        // 游戏房间创建
        window.realtimeManager.on('gameRoomCreated', (data) => {
            console.log('🎮 游戏房间创建:', data.gameRoom.id);
            this.currentRoom = data.gameRoom;
            this.emit('roomCreated', data);
        });
        
        // 玩家加入
        window.realtimeManager.on('playerJoined', (data) => {
            console.log('🎮 玩家加入房间:', data.player.username);
            if (this.currentRoom && this.currentRoom.id === data.gameRoom.id) {
                this.currentRoom = data.gameRoom;
            }
            this.emit('playerJoined', data);
        });
        
        // 玩家离开
        window.realtimeManager.on('playerLeft', (data) => {
            console.log('🎮 玩家离开房间:', data.player.username);
            if (this.currentRoom && this.currentRoom.id === data.gameRoom.id) {
                this.currentRoom = data.gameRoom;
            }
            this.emit('playerLeft', data);
        });
        
        // 游戏开始
        window.realtimeManager.on('gameStart', (data) => {
            console.log('🎮 游戏开始:', data.gameRoom.id);
            if (this.currentRoom && this.currentRoom.id === data.gameRoom.id) {
                this.isInGame = true;
                this.currentRoom = data.gameRoom;
                this.startGameTimer(data.duration || 30000);
            }
            this.emit('gameStart', data);
        });
        
        // 游戏结束
        window.realtimeManager.on('gameEnd', (data) => {
            console.log('🎮 游戏结束:', data.gameRoom.id);
            if (this.currentRoom && this.currentRoom.id === data.gameRoom.id) {
                this.isInGame = false;
                this.stopGameTimer();
                this.recordGameResult(data);
            }
            this.emit('gameEnd', data);
        });
        
        // 游戏结果
        window.realtimeManager.on('gameResult', (data) => {
            console.log('🎮 游戏结果:', data.result);
            this.emit('gameResult', data);
        });
        
        // 房间列表更新
        window.realtimeManager.on('gameRoomsList', (rooms) => {
            console.log('🎮 游戏房间列表更新:', rooms.length, '个房间');
            this.availableRooms = rooms;
            this.emit('roomsUpdated', rooms);
        });
        
        // 游戏错误
        window.realtimeManager.on('gameError', (error) => {
            console.error('🎮 游戏错误:', error);
            this.emit('gameError', error);
            if (window.userSystem) {
                window.userSystem.showMessage('error', '游戏错误', error.message);
            }
        });
    }
    
    /**
     * 创建游戏房间
     */
    createRoom(roomId, betAmount) {
        if (!window.realtimeManager || !window.realtimeManager.isConnected) {
            throw new Error('实时通信未连接，请检查网络连接');
        }
        
        if (this.isInGame) {
            throw new Error('当前已在游戏中，无法创建新房间');
        }
        
        if (this.currentRoom) {
            this.leaveRoom();
        }
        
        // 验证投注金额
        if (betAmount < 5 || betAmount % 5 !== 0) {
            throw new Error('投注金额必须是5的倍数且最小5积分');
        }
        
        // 检查积分是否足够
        const currentPoints = window.pointsSystem ? window.pointsSystem.getPoints() : 0;
        if (currentPoints < betAmount) {
            throw new Error('积分不足，无法创建房间');
        }
        
        window.realtimeManager.createGameRoom(roomId, betAmount);
        
        console.log('🎮 创建游戏房间:', roomId, '投注:', betAmount);
    }
    
    /**
     * 加入游戏房间
     */
    joinRoom(roomId, betAmount) {
        if (!window.realtimeManager || !window.realtimeManager.isConnected) {
            throw new Error('实时通信未连接，请检查网络连接');
        }
        
        if (this.isInGame) {
            throw new Error('当前已在游戏中，无法加入其他房间');
        }
        
        if (this.currentRoom) {
            this.leaveRoom();
        }
        
        // 验证投注金额
        if (betAmount < 5 || betAmount % 5 !== 0) {
            throw new Error('投注金额必须是5的倍数且最小5积分');
        }
        
        // 检查积分是否足够
        const currentPoints = window.pointsSystem ? window.pointsSystem.getPoints() : 0;
        if (currentPoints < betAmount) {
            throw new Error('积分不足，无法加入房间');
        }
        
        window.realtimeManager.joinGameRoom(roomId, betAmount);
        
        console.log('🎮 加入游戏房间:', roomId, '投注:', betAmount);
    }
    
    /**
     * 开始游戏
     */
    startGame() {
        if (!this.currentRoom) {
            throw new Error('未加入任何房间');
        }
        
        // 检查是否是主持人
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const player = this.currentRoom.players.find(p => 
            p.userId === currentUser.id || p.userId === currentUser.username
        );
        
        if (!player || !player.isHost) {
            throw new Error('只有主持人可以开始游戏');
        }
        
        if (this.currentRoom.players.length < 1) {
            throw new Error('至少需要1名玩家才能开始游戏');
        }
        
        window.realtimeManager.startGame(this.currentRoom.id);
        
        console.log('🎮 开始游戏:', this.currentRoom.id);
    }
    
    /**
     * 选择房间（恐怖奶奶游戏）
     */
    selectRoom(roomId) {
        if (!this.isInGame) {
            throw new Error('游戏未开始');
        }
        
        // 这里可以添加房间选择的逻辑
        console.log('🎮 选择房间:', roomId);
        this.emit('roomSelected', { roomId });
    }
    
    /**
     * 离开房间
     */
    leaveRoom() {
        if (this.currentRoom) {
            window.realtimeManager.leaveGameRoom();
            this.currentRoom = null;
            this.isInGame = false;
            this.stopGameTimer();
            
            console.log('🎮 离开游戏房间');
        }
    }
    
    /**
     * 获取房间列表
     */
    getRoomList() {
        if (window.realtimeManager && window.realtimeManager.isConnected) {
            window.realtimeManager.getGameRooms();
        }
        return this.availableRooms;
    }
    
    /**
     * 获取当前房间信息
     */
    getCurrentRoom() {
        return this.currentRoom;
    }
    
    /**
     * 检查是否在游戏中
     */
    isInGameRoom() {
        return this.isInGame;
    }
    
    /**
     * 获取房间状态
     */
    getRoomStatus() {
        if (!this.currentRoom) {
            return { status: 'not_in_room' };
        }
        
        return {
            status: this.currentRoom.status,
            roomId: this.currentRoom.id,
            playerCount: this.currentRoom.players.length,
            maxPlayers: this.currentRoom.maxPlayers,
            betAmount: this.currentRoom.betAmount,
            isHost: this.isHost(),
            isInGame: this.isInGame
        };
    }
    
    /**
     * 检查是否是主持人
     */
    isHost() {
        if (!this.currentRoom) return false;
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const player = this.currentRoom.players.find(p => 
            p.userId === currentUser.id || p.userId === currentUser.username
        );
        
        return player && player.isHost;
    }
    
    /**
     * 开始游戏计时器
     */
    startGameTimer(duration) {
        this.stopGameTimer(); // 清除现有计时器
        
        this.gameStartTime = Date.now();
        this.gameDuration = duration;
        this.gameTimerInterval = setInterval(() => {
            const elapsed = Date.now() - this.gameStartTime;
            const remaining = Math.max(0, this.gameDuration - elapsed);
            
            this.emit('gameTimer', {
                elapsed,
                remaining,
                percentage: (elapsed / this.gameDuration) * 100
            });
            
            if (remaining <= 0) {
                this.stopGameTimer();
            }
        }, 100);
    }
    
    /**
     * 停止游戏计时器
     */
    stopGameTimer() {
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }
    }
    
    /**
     * 记录游戏结果
     */
    recordGameResult(data) {
        const gameRecord = {
            id: 'game_' + Date.now(),
            roomId: data.gameRoom.id,
            gameType: 'grandma', // 可以根据实际情况调整
            players: data.gameRoom.players,
            results: data.results,
            dangerRooms: data.dangerRooms,
            timestamp: new Date().toISOString(),
            duration: this.gameDuration || 30000
        };
        
        this.gameHistory.unshift(gameRecord);
        
        // 限制历史记录数量
        if (this.gameHistory.length > 100) {
            this.gameHistory = this.gameHistory.slice(0, 100);
        }
        
        // 保存到本地存储
        localStorage.setItem('gameHistory', JSON.stringify(this.gameHistory));
        
        console.log('🎮 游戏结果已记录:', gameRecord);
    }
    
    /**
     * 获取游戏历史
     */
    getGameHistory(limit = 20) {
        return this.gameHistory.slice(0, limit);
    }
    
    /**
     * 获取游戏统计
     */
    getGameStats() {
        const stats = {
            totalGames: this.gameHistory.length,
            wins: 0,
            losses: 0,
            totalBet: 0,
            totalWin: 0,
            winRate: 0
        };
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        this.gameHistory.forEach(game => {
            const playerResult = game.results.find(r => 
                r.userId === currentUser.id || r.userId === currentUser.username
            );
            
            if (playerResult) {
                stats.totalGames++;
                stats.totalBet += game.players.find(p => 
                    p.userId === playerResult.userId
                )?.betAmount || 0;
                
                if (playerResult.result === 'win') {
                    stats.wins++;
                    stats.totalWin += playerResult.winAmount || 0;
                } else {
                    stats.losses++;
                }
            }
        });
        
        stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames * 100).toFixed(2) : 0;
        
        return stats;
    }
    
    /**
     * 事件处理
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('游戏房间事件处理器执行失败:', error);
                }
            });
        }
        
        // 触发全局事件
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
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
     * 清理资源
     */
    cleanup() {
        this.leaveRoom();
        this.stopGameTimer();
        this.eventHandlers.clear();
    }
}

// 创建全局实例
window.gameRoomManager = new GameRoomManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('游戏房间管理器已加载');
    
    // 加载游戏历史
    const savedHistory = localStorage.getItem('gameHistory');
    if (savedHistory) {
        try {
            window.gameRoomManager.gameHistory = JSON.parse(savedHistory);
            console.log('加载游戏历史:', window.gameRoomManager.gameHistory.length, '条记录');
        } catch (error) {
            console.error('加载游戏历史失败:', error);
        }
    }
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
        window.gameRoomManager.cleanup();
    });
});
