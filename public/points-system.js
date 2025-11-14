/**
 * 天创积分系统 - 集成数据适配器版本
 */
class PointsSystem {
    constructor() {
        this.currentUser = null;
        this.history = [];
        this.auditLog = [];
        this.dashboard = {
            totalPoints: 0,
            todayEarned: 0,
            todaySpent: 0,
            totalEarned: 0,
            totalSpent: 0
        };
        
        this.subscribers = [];
        this.init();
    }
    
    /**
     * 初始化积分系统
     */
    init() {
        console.log('积分系统初始化完成');
        
        // 监听存储变化
        window.addEventListener('storage', (e) => {
            if (e.key === 'currentUser') {
                this.loadCurrentUser();
            }
        });
        
        // 订阅数据适配器事件
        if (window.dataAdapter) {
            window.dataAdapter.subscribe('pointsUpdated', (data) => {
                this.updatePointsDisplay(data.newPoints);
            });
        }
        
        // 🌟 新增：监听实时通信事件
        if (window.realtimeManager) {
            window.realtimeManager.on('pointsUpdated', (data) => {
                console.log('🔄 积分实时同步:', data);
                this.updatePointsDisplay(data.newPoints);
                
                // 更新本地用户数据
                if (this.currentUser) {
                    this.currentUser.points = data.newPoints;
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                }
            });
        }
        
        console.log('积分系统初始化完成');
    }
    
    /**
     * 加载当前用户
     */
    loadCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        } else {
            this.currentUser = { points: 0 };
        }
    }
    
    /**
     * 加载积分历史
     */
    loadHistory() {
        const historyData = localStorage.getItem('pointsHistory');
        if (historyData) {
            this.history = JSON.parse(historyData);
        } else {
            this.history = [];
        }
    }
    
    /**
     * 保存积分历史
     */
    saveHistory() {
        localStorage.setItem('pointsHistory', JSON.stringify(this.history));
    }
    
    /**
     * 加载审计日志
     */
    loadAuditLog() {
        const auditData = localStorage.getItem('pointsAuditLog');
        if (auditData) {
            this.auditLog = JSON.parse(auditData);
        } else {
            this.auditLog = [];
        }
    }
    
    /**
     * 保存审计日志
     */
    saveAuditLog() {
        localStorage.setItem('pointsAuditLog', JSON.stringify(this.auditLog));
    }
    
    /**
     * 计算仪表板数据
     */
    calculateDashboard() {
        const today = new Date().toDateString();
        
        this.dashboard.todayEarned = 0;
        this.dashboard.todaySpent = 0;
        this.dashboard.totalEarned = 0;
        this.dashboard.totalSpent = 0;
        
        this.history.forEach(record => {
            const recordDate = new Date(record.timestamp).toDateString();
            
            if (record.amount > 0) {
                this.dashboard.totalEarned += record.amount;
                if (recordDate === today) {
                    this.dashboard.todayEarned += record.amount;
                }
            } else {
                this.dashboard.totalSpent += Math.abs(record.amount);
                if (recordDate === today) {
                    this.dashboard.todaySpent += Math.abs(record.amount);
                }
            }
        });
        
        this.dashboard.totalPoints = this.dashboard.totalEarned - this.dashboard.totalSpent;
    }
    
    /**
     * 获取当前用户积分
     */
    getPoints() {
        this.loadCurrentUser();
        return this.currentUser ? this.currentUser.points || 0 : 0;
    }
    
    /**
     * 更新积分 - 集成数据适配器
     */
    async updatePoints(amount, reason = '', metadata = {}) {
        try {
            // 验证参数
            if (typeof amount !== 'number' || isNaN(amount)) {
                return { success: false, error: '积分变动量必须是数字' };
            }
            
            // 加载最新的用户数据
            this.loadCurrentUser();
            
            if (!this.currentUser) {
                return { success: false, error: '用户未登录' };
            }
            
            const oldPoints = this.currentUser.points || 0;
            const newPoints = Math.max(0, oldPoints + amount);
            
            // 如果是扣除积分，检查余额是否足够
            if (amount < 0 && oldPoints < Math.abs(amount)) {
                return { success: false, error: '积分不足' };
            }
            
            // 使用数据适配器更新积分
            if (window.dataAdapter) {
                const result = await window.dataAdapter.updatePoints(amount, reason, metadata);
                
                if (result.success) {
                    // 更新本地积分显示
                    this.updatePointsDisplay(result.newPoints);
                    
                    // 🌟 新增：实时同步到其他客户端
                    if (window.realtimeManager && window.realtimeManager.isConnected) {
                        window.realtimeManager.updatePoints(amount, reason, metadata);
                    }
                    
                    // 触发事件
                    this.emit('pointsUpdated', {
                        newPoints: result.newPoints,
                        amount: amount,
                        reason: reason,
                        balance: result.newPoints
                    });
                    
                    return result;
                } else {
                    throw new Error(result.error || '积分更新失败');
                }
            }
            
            // 原有的localStorage逻辑作为备用
            this.currentUser.points = newPoints;
            this.currentUser.lastLogin = new Date().toISOString();
            
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // 🌟 新增：实时同步到其他客户端
            if (window.realtimeManager && window.realtimeManager.isConnected) {
                window.realtimeManager.updatePoints(amount, reason, metadata);
            }
            
            // 记录积分变动历史
            const record = {
                id: Date.now(),
                userId: this.currentUser.id || this.currentUser.username,
                timestamp: new Date().toISOString(),
                reason: reason,
                amount: amount,
                oldPoints: oldPoints,
                newPoints: newPoints,
                type: amount > 0 ? 'earn' : 'spend',
                metadata: metadata || {}
            };
            
            this.history.unshift(record);
            
            if (this.history.length > 1000) {
                this.history = this.history.slice(0, 1000);
            }
            
            this.saveHistory();
            
            // 添加审计日志
            this.addAuditLog({
                action: 'points_update',
                userId: this.currentUser.id || this.currentUser.username,
                timestamp: new Date().toISOString(),
                oldPoints: oldPoints,
                newPoints: newPoints,
                amount: amount,
                reason: reason,
                metadata: metadata || {}
            });
            
            // 重新计算仪表板数据
            this.calculateDashboard();
            
            // 通知订阅者
            this.notifySubscribers({
                newPoints: newPoints,
                amount: amount,
                reason: reason,
                balance: newPoints
            });
            
            // 触发自定义事件
            this.dispatchEvent('pointsUpdated', {
                newPoints: newPoints,
                amount: amount,
                reason: reason,
                balance: newPoints
            });
            
            console.log(`积分更新: ${oldPoints} -> ${newPoints} (${amount > 0 ? '+' : ''}${amount}) - ${reason}`);
            
            return { 
                success: true, 
                newPoints: newPoints,
                oldPoints: oldPoints,
                amount: amount
            };
            
        } catch (error) {
            console.error('积分更新失败:', error);
            return { success: false, error: '积分更新失败: ' + error.message };
        }
    }
    
    /**
     * 检查积分是否足够
     */
    hasEnoughPoints(amount) {
        return this.getPoints() >= amount;
    }
    
    /**
     * 增加积分
     */
    async addPoints(amount, reason = '', metadata = {}) {
        if (amount <= 0) {
            return { success: false, error: '增加的积分数量必须大于0' };
        }
        return this.updatePoints(amount, reason, metadata);
    }
    
    /**
     * 扣除积分
     */
    async deductPoints(amount, reason = '', metadata = {}) {
        if (amount <= 0) {
            return { success: false, error: '扣除的积分数量必须大于0' };
        }
        return this.updatePoints(-amount, reason, metadata);
    }
    
    /**
     * 获取积分历史
     */
    getHistory(limit = 50) {
        return this.history.slice(0, limit);
    }
    
    /**
     * 获取审计日志
     */
    getAuditLog(limit = 100) {
        return this.auditLog.slice(0, limit);
    }
    
    /**
     * 获取仪表板数据
     */
    getDashboard() {
        this.calculateDashboard();
        return { ...this.dashboard };
    }
    
    /**
     * 添加审计日志
     */
    addAuditLog(log) {
        this.auditLog.unshift(log);
        
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(0, 1000);
        }
        
        this.saveAuditLog();
    }
    
    /**
     * 订阅积分变动事件
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.push(callback);
        }
    }
    
    /**
     * 取消订阅
     */
    unsubscribe(callback) {
        const index = this.subscribers.indexOf(callback);
        if (index > -1) {
            this.subscribers.splice(index, 1);
        }
    }
    
    /**
     * 通知所有订阅者
     */
    notifySubscribers(data) {
        this.subscribers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('订阅者回调执行失败:', error);
            }
        });
    }
    
    /**
     * 触发自定义事件
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }
    
    /**
     * 重置用户积分
     */
    async resetPoints(points = 0, reason = '管理员重置') {
        this.loadCurrentUser();
        
        if (!this.currentUser) {
            return { success: false, error: '用户未登录' };
        }
        
        const oldPoints = this.currentUser.points || 0;
        const amount = points - oldPoints;
        
        return this.updatePoints(amount, reason, { 
            reset: true, 
            oldPoints: oldPoints, 
            newPoints: points 
        });
    }
    
    /**
     * 管理员更新用户积分
     */
    async adminUpdateUserPoints(userId, amount, reason = '管理员操作', metadata = {}) {
        try {
            // 获取所有用户数据
            const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
            const userIndex = allUsers.findIndex(u => (u.id && u.id === userId) || (u.username && u.username === userId));
            
            if (userIndex === -1) {
                return { success: false, error: '用户不存在' };
            }

            const user = allUsers[userIndex];
            const oldPoints = user.points || 0;
            const newPoints = Math.max(0, oldPoints + amount);

            // 更新用户积分
            user.points = newPoints;
            user.lastUpdated = new Date().toISOString();
            allUsers[userIndex] = user;
            localStorage.setItem('allUsers', JSON.stringify(allUsers));

            // 如果是当前用户，同步更新currentUser
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if ((currentUser.id && currentUser.id === userId) || (currentUser.username && currentUser.username === userId)) {
                currentUser.points = newPoints;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                this.currentUser = currentUser;
                this.updatePointsDisplay(newPoints);
            }

            // 🌟 新增：实时同步管理员操作
            if (window.realtimeManager && window.realtimeManager.isConnected) {
                window.realtimeManager.updatePoints(amount, reason, { ...metadata, adminOperation: true, targetUserId: userId });
            }

            // 记录积分变动历史
            const record = {
                id: Date.now(),
                userId: userId,
                adminId: this.currentUser ? (this.currentUser.id || this.currentUser.username) : 'admin',
                timestamp: new Date().toISOString(),
                reason: reason,
                amount: amount,
                oldPoints: oldPoints,
                newPoints: newPoints,
                type: amount > 0 ? 'earn' : 'spend',
                metadata: { ...metadata, adminOperation: true }
            };

            this.history.unshift(record);
            if (this.history.length > 1000) {
                this.history = this.history.slice(0, 1000);
            }
            this.saveHistory();

            // 添加审计日志
            this.addAuditLog({
                action: 'admin_points_update',
                adminId: this.currentUser ? (this.currentUser.id || this.currentUser.username) : 'admin',
                targetUserId: userId,
                timestamp: new Date().toISOString(),
                oldPoints: oldPoints,
                newPoints: newPoints,
                amount: amount,
                reason: reason,
                metadata: metadata || {}
            });

            // 触发事件
            this.emit('adminPointsUpdated', {
                userId: userId,
                newPoints: newPoints,
                amount: amount,
                reason: reason,
                balance: newPoints
            });

            return {
                success: true,
                newPoints: newPoints,
                oldPoints: oldPoints,
                amount: amount
            };

        } catch (error) {
            console.error('管理员更新用户积分失败:', error);
            return { success: false, error: '管理员更新用户积分失败: ' + error.message };
        }
    }

    /**
     * 管理员获取用户积分
     */
    adminGetUserPoints(userId) {
        const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
        const user = allUsers.find(u => (u.id && u.id === userId) || (u.username && u.username === userId));
        if (!user) {
            return { success: false, error: '用户不存在' };
        }
        return { success: true, points: user.points || 0 };
    }
    
    /**
     * 更新积分显示
     */
    updatePointsDisplay(points) {
        // 更新所有显示积分的元素
        const pointsElements = document.querySelectorAll('[id*="userPoints"], [class*="user-points"]');
        pointsElements.forEach(element => {
            if (element.tagName === 'SPAN') {
                element.textContent = points;
            } else if (element.tagName === 'DIV') {
                const span = element.querySelector('span');
                if (span) {
                    span.textContent = points;
                } else {
                    element.textContent = `💰 ${points}`;
                }
            }
        });
    }
    
    /**
     * 触发事件
     */
    emit(eventName, data) {
        this.notifySubscribers(data);
        this.dispatchEvent(eventName, data);
    }
}

// 创建全局积分系统实例
window.pointsSystem = new PointsSystem();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('积分系统已加载');
    
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUser = localStorage.getItem('currentUser');
    
    if (!isLoggedIn || !currentUser) {
        console.log('用户未登录，积分系统将不会完全初始化');
        return;
    }
    
    window.pointsSystem.init();
    
    // 添加全局辅助函数
    window.updatePointsDisplay = function(points) {
        window.pointsSystem.updatePointsDisplay(points);
    };
    
    // 监听积分更新事件
    window.addEventListener('pointsUpdated', (event) => {
        const { newPoints } = event.detail;
        window.updatePointsDisplay(newPoints);
    });
    
    // 初始更新积分显示
    const currentPoints = window.pointsSystem.getPoints();
    window.updatePointsDisplay(currentPoints);
});
