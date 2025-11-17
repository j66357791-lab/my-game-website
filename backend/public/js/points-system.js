/**
 * 积分系统 - 修复版
 */
window.pointsSystem = {
    // 强制云端模式标志
    forceCloudModeFlag: false,
    
    /**
     * 🔧 修复：强制云端模式
     */
    forceCloudMode() {
        console.log('🌐 === 积分系统强制云端模式 ===');
        
        this.forceCloudModeFlag = true;
        this.useLocalStorage = false;
        
        // 更新配置
        localStorage.setItem('forceCloudMode', 'true');
        localStorage.removeItem('useLocalStorage');
        
        console.log('✅ 积分系统已强制为云端模式');
    },
    
    /**
     * 🔧 修复：获取积分
     */
    getPoints() {
        try {
            // 优先从云端获取
            if (this.isCloudMode() && window.dataAdapter) {
                return window.dataAdapter.getPointsBalance()
                    .then(response => {
                        if (response.success) {
                            return response.data.balance;
                        } else {
                            // 降级到本地存储
                            return this.getLocalPoints();
                        }
                    })
                    .catch(error => {
                        console.error('🌐 云端获取积分失败:', error);
                        return this.getLocalPoints();
                    });
            }
            
            // 降级到本地存储
            return this.getLocalPoints();
        } catch (error) {
            console.error('🌐 获取积分失败:', error);
            return 0;
        }
    },
    
    /**
     * 🔧 修复：获取本地积分
     */
    getLocalPoints() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return user.points || 0;
        } catch (error) {
            console.error('🌐 获取本地积分失败:', error);
            return 0;
        }
    },
    
    /**
     * 🔧 修复：更新积分
     */
    async updatePoints(amount, reason, metadata = {}) {
        try {
            console.log('🌐 === 更新积分 ===');
            console.log('🌐 积分变化:', amount);
            console.log('🌐 更新原因:', reason);
            console.log('🌐 元数据:', metadata);
            
            const oldPoints = await this.getPoints();
            const newPoints = Math.max(0, oldPoints + amount);
            
            // 优先更新到云端
            if (this.isCloudMode() && window.dataAdapter) {
                try {
                    const response = await window.dataAdapter.updatePoints(amount, reason, metadata);
                    
                    if (response.success) {
                        // 触发积分更新事件
                        this.dispatchPointsUpdate(newPoints, amount, reason, metadata);
                        
                        console.log('✅ 云端积分更新成功:', newPoints);
                        return {
                            success: true,
                            oldPoints: oldPoints,
                            newPoints: newPoints,
                            change: amount
                        };
                    } else {
                        console.log('🔄 云端更新失败，降级到本地存储');
                        return await this.updateLocalPoints(amount, reason, metadata);
                    }
                } catch (error) {
                    console.error('🌐 云端积分更新失败:', error);
                    return await this.updateLocalPoints(amount, reason, metadata);
                }
            } else {
                // 降级到本地存储
                return await this.updateLocalPoints(amount, reason, metadata);
            }
        } catch (error) {
            console.error('🌐 更新积分失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 🔧 修复：更新本地积分
     */
    async updateLocalPoints(amount, reason, metadata = {}) {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const oldPoints = user.points || 0;
            const newPoints = Math.max(0, oldPoints + amount);
            
            // 更新用户数据
            user.points = newPoints;
            user.updatedAt = new Date().toISOString();
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            // 添加到积分历史
            this.addToPointsHistory({
                id: Date.now(),
                timestamp: new Date().toISOString(),
                reason: reason,
                amount: amount,
                oldPoints: oldPoints,
                newPoints: newPoints,
                type: amount > 0 ? 'earn' : 'spend',
                metadata: metadata
            });
            
            // 触发积分更新事件
            this.dispatchPointsUpdate(newPoints, amount, reason, metadata);
            
            console.log('✅ 本地积分更新成功:', newPoints);
            
            return {
                success: true,
                oldPoints: oldPoints,
                newPoints: newPoints,
                change: amount
            };
        } catch (error) {
            console.error('🌐 本地积分更新失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 🔧 修复：添加到积分历史
     */
    addToPointsHistory(record) {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = user.id || user.username;
            
            let history = [];
            const savedHistory = localStorage.getItem(`pointsHistory_${userId}`);
            if (savedHistory) {
                history = JSON.parse(savedHistory);
            }
            
            history.unshift(record);
            
            // 只保留最近1000条记录
            if (history.length > 1000) {
                history = history.slice(0, 1000);
            }
            
            localStorage.setItem(`pointsHistory_${userId}`, JSON.stringify(history));
            
            console.log('✅ 积分历史记录已添加');
        } catch (error) {
            console.error('🌐 添加积分历史失败:', error);
        }
    },
    
    /**
     * 🔧 修复：获取积分历史
     */
    getPointsHistory() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = user.id || user.username;
            
            const savedHistory = localStorage.getItem(`pointsHistory_${userId}`);
            if (savedHistory) {
                return JSON.parse(savedHistory);
            }
            
            return [];
        } catch (error) {
            console.error('🌐 获取积分历史失败:', error);
            return [];
        }
    },
    
    /**
     * 🔧 修复：触发积分更新事件
     */
    dispatchPointsUpdate(newPoints, amount, reason, metadata) {
        try {
            // 触发全局事件
            window.dispatchEvent(new CustomEvent('pointsUpdated', {
                detail: {
                    newPoints: newPoints,
                    change: amount,
                    reason: reason,
                    metadata: metadata,
                    timestamp: new Date().toISOString()
                }
            }));
            
            // 更新所有显示积分的元素
            this.updateAllPointsDisplays(newPoints);
            
            console.log('✅ 积分更新事件已触发:', newPoints);
        } catch (error) {
            console.error('🌐 触发积分更新事件失败:', error);
        }
    },
    
    /**
     * 🔧 修复：更新所有积分显示
     */
    updateAllPointsDisplays(points) {
        try {
            // 更新所有积分显示元素
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
            
            // 更新用户信息显示
            if (window.userSystem && window.userSystem.updateUserInfo) {
                window.userSystem.updateUserInfo();
            }
            
            console.log('✅ 所有积分显示已更新:', points);
        } catch (error) {
            console.error('🌐 更新积分显示失败:', error);
        }
    },
    
    /**
     * 🔧 修复：订阅积分变化
     */
    subscribe(callback) {
        try {
            window.addEventListener('pointsUpdated', callback);
            console.log('✅ 积分变化订阅已添加');
        } catch (error) {
            console.error('🌐 订阅积分变化失败:', error);
        }
    },
    
    /**
     * 🔧 修复：取消订阅积分变化
     */
    unsubscribe(callback) {
        try {
            window.removeEventListener('pointsUpdated', callback);
            console.log('✅ 积分变化订阅已移除');
        } catch (error) {
            console.error('🌐 取消订阅积分变化失败:', error);
        }
    },
    
    /**
     * 🔧 修复：同步积分数据
     */
    async syncPointsData() {
        try {
            console.log('🔄 === 积分数据同步开始 ===');
            
            if (!this.isCloudMode()) {
                console.log('🔄 未强制云端模式，跳过同步');
                return {
                    success: false,
                    message: '未强制云端模式'
                };
            }
            
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = user.id || user.username;
            
            const pointsData = {
                userId: userId,
                points: user.points || 0,
                history: this.getPointsHistory(),
                lastSyncTime: new Date().toISOString()
            };
            
            // 使用通用工具同步数据
            if (window.Common && window.Common.syncData) {
                const response = await window.Common.syncData('points', pointsData);
                return response;
            }
            
            return {
                success: false,
                message: '同步工具不可用'
            };
        } catch (error) {
            console.error('🔄 积分数据同步失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 🔧 修复：检查是否为云端模式
     */
    isCloudMode() {
        return this.forceCloudModeFlag || 
               localStorage.getItem('forceCloudMode') === 'true';
    },
    
    /**
     * 🔧 修复：初始化
     */
    init() {
        console.log('🌐 === 积分系统初始化 ===');
        
        // 强制设置云端模式
        this.forceCloudMode();
        
        // 监听积分更新事件
        window.addEventListener('pointsUpdated', (e) => {
            const { newPoints } = e.detail;
            console.log('🌐 积分系统收到更新事件:', newPoints);
            this.updateAllPointsDisplays(newPoints);
        });
        
        console.log('✅ 积分系统初始化完成');
    }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.pointsSystem.init();
});
