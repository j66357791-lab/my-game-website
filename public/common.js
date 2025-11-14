/**
 * 通用页面脚本 - 所有页面共享的功能
 */

// 数据源切换功能
function toggleDataSource() {
    if (window.dataAdapter) {
        const currentMode = window.dataAdapter.useLocalStorage;
        const newMode = !currentMode;
        
        // 切换数据源
        window.dataAdapter.setUseLocalStorage(newMode);
        
        // 更新按钮文本
        const dataSourceText = document.getElementById('dataSourceText');
        if (dataSourceText) {
            dataSourceText.textContent = newMode ? '本地模式' : '在线模式';
        }
        
        // 显示提示
        const message = newMode ? '已切换到本地模式' : '已切换到在线模式';
        showNotification(message, 'info');
        
        // 如果切换到在线模式，需要重新加载数据
        if (!newMode) {
            setTimeout(() => {
                location.reload();
            }, 1000);
        }
    }
}

// 显示通知的函数
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'info' ? 'ℹ️' : '⚠️'}</div>
        <div class="notification-content">
            <div class="notification-title">系统提示</div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        backdrop-filter: blur(10px);
    `;
    
    const colors = {
        success: 'linear-gradient(135deg, #28a745, #20c997)',
        error: 'linear-gradient(135deg, #dc3545, #c82333)',
        info: 'linear-gradient(135deg, #17a2b8, #138496)',
        warning: 'linear-gradient(135deg, #ffc107, #e0a800)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成');
    
    // 初始化数据适配器
    if (window.dataAdapter) {
        console.log('数据适配器已加载');
    }
    
    // 初始化用户系统
    if (window.userSystem) {
        window.userSystem.init();
    }
    
    // 初始化积分系统
    if (window.pointsSystem) {
        window.pointsSystem.init();
    }
    
    // 初始化同步服务
    if (window.syncService) {
        window.syncService.startAutoSync();
    }
    
    // 检查登录状态
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUser = localStorage.getItem('currentUser');
    
    if (!isLoggedIn || !currentUser) {
        console.log('用户未登录，跳转到登录页面');
        window.location.href = 'login.html';
        return;
    }
    
    // 更新用户信息显示
    if (window.userSystem) {
        window.userSystem.updateUserInfo();
    }
    
    // 更新积分显示
    if (window.pointsSystem) {
        const currentPoints = window.pointsSystem.getPoints();
        window.updatePointsDisplay(currentPoints);
    }
});

// 监听积分更新事件
window.addEventListener('pointsUpdated', (e) => {
    const { newPoints } = e.detail;
    window.updatePointsDisplay(newPoints);
});

// 监听用户信息更新事件
window.addEventListener('userInfoUpdated', (e) => {
    const { user } = e.detail;
    if (window.userSystem) {
        window.userSystem.updateUserInfo();
    }
});

// 监听数据源切换事件
window.addEventListener('dataSourceChanged', (e) => {
    console.log('数据源已切换:', e.detail);
});

// 监听数据同步事件
window.addEventListener('dataSynced', (e) => {
    console.log('数据已同步:', e.detail);
    // 更新页面显示
    if (window.DollSystem) {
        window.DollSystem.updateDisplay();
    }
    if (window.DollKingSystem) {
        window.DollKingSystem.updateDisplay();
    }
});

// 监听同步完成事件
window.addEventListener('syncCompleted', (e) => {
    console.log('同步完成:', e.detail);
});

// 全局函数
function updatePointsDisplay(points) {
    const userPoints = document.getElementById('userPoints');
    if (userPoints) {
        userPoints.textContent = points;
    }
    
    // 更新所有积分显示元素
    const allPointsElements = document.querySelectorAll('.user-points-display');
    allPointsElements.forEach(element => {
        element.textContent = points;
    });
}

// 导出全局函数
window.toggleDataSource = toggleDataSource;
window.showNotification = showNotification;
window.updatePointsDisplay = updatePointsDisplay;

// 🌟 新增：实时通信管理器
class RealtimeManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000;
        this.heartbeatInterval = null;
        this.eventListeners = new Map();
        
        this.init();
    }
    
    init() {
        console.log('🔗 初始化实时通信管理器');
        this.connect();
    }
    
    connect() {
        // 这里应该连接到您的WebSocket服务器
        // 暂时使用模拟实现
        console.log('🔗 连接到WebSocket服务器...');
        
        // 模拟连接成功
        setTimeout(() => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.notifyConnected();
            console.log('🔗 WebSocket连接成功');
        }, 1000);
    }
    
    disconnect() {
        this.isConnected = false;
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.close();
        }
        this.notifyDisconnected();
        console.log('🔗 WebSocket连接已断开');
    }
    
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send('heartbeat', { timestamp: Date.now() });
            }
        }, 30000); // 30秒心跳
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    send(event, data) {
        if (!this.isConnected) {
            console.warn('🔗 WebSocket未连接，无法发送消息:', event, data);
            return;
        }
        
        // 模拟发送
        console.log('🔗 发送WebSocket消息:', event, data);
        
        // 模拟服务器响应
        if (event === 'heartbeat') {
            setTimeout(() => {
                this.handleMessage('heartbeat_response', { timestamp: data.timestamp });
            }, 100);
        } else if (event === 'points_update') {
            setTimeout(() => {
                this.handleMessage('points_updated', data);
            }, 100);
        } else if (event === 'chat_message') {
            setTimeout(() => {
                this.handleMessage('new_message', data);
            }, 100);
        }
    }
    
    handleMessage(event, data) {
        console.log('🔗 收到WebSocket消息:', event, data);
        
        // 触发事件监听器
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('🔗 事件监听器执行失败:', error);
                }
            });
        }
    }
    
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    updatePoints(amount, reason, metadata = {}) {
        this.send('points_update', {
            amount,
            reason,
            metadata,
            userId: this.getCurrentUserId(),
            timestamp: Date.now()
        });
    }
    
    sendMessage(message) {
        this.send('chat_message', {
            message,
            username: this.getCurrentUsername(),
            userId: this.getCurrentUserId(),
            timestamp: Date.now()
        });
    }
    
    getCurrentUserId() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.id || user.username;
    }
    
    getCurrentUsername() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.name || user.username;
    }
    
    notifyConnected() {
        window.dispatchEvent(new CustomEvent('online', {
            detail: { connected: true }
        }));
    }
    
    notifyDisconnected() {
        window.dispatchEvent(new CustomEvent('offline', {
            detail: { connected: false }
        }));
    }
}

// 创建全局实时通信管理器实例
window.realtimeManager = new RealtimeManager();

// 添加实时通信样式
const realtimeStyles = `
    .connection-status {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 10px;
        font-size: 0.9rem;
        z-index: 1000;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    }
    
    .connection-status.online {
        background: rgba(40, 167, 69, 0.8);
    }
    
    .connection-status.offline {
        background: rgba(220, 53, 69, 0.8);
    }
`;

// 动态添加样式
const realtimeStyleSheet = document.createElement('style');
realtimeStyleSheet.textContent = realtimeStyles;
document.head.appendChild(realtimeStyleSheet);

// 添加连接状态指示器
function addConnectionStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'connection-status';
    indicator.id = 'connectionStatus';
    indicator.innerHTML = '🔗 连接中...';
    document.body.appendChild(indicator);
    
    // 监听连接状态变化
    window.addEventListener('online', () => {
        const indicator = document.getElementById('connectionStatus');
        if (indicator) {
            indicator.className = 'connection-status online';
            indicator.innerHTML = '🔗 在线';
        }
    });
    
    window.addEventListener('offline', () => {
        const indicator = document.getElementById('connectionStatus');
        if (indicator) {
            indicator.className = 'connection-status offline';
            indicator.innerHTML = '🔗 离线';
        }
    });
}

// 页面加载完成后添加连接状态指示器
document.addEventListener('DOMContentLoaded', () => {
    addConnectionStatusIndicator();
});
