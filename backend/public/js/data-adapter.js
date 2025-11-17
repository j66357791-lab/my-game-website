/**
 * 数据适配器 - 强制云端同步版
 */
class DataAdapter {
    constructor() {
        // 强制禁用本地存储
        this.useLocalStorage = false;
        this.apiService = window.apiService;
        this.subscribers = new Map();
        
        this.init();
    }
    
    /**
     * 初始化数据适配器 - 强制云端模式
     */
    init() {
        console.log('🌐 数据适配器：初始化开始（强制云端模式）');
        
        // 强制设置云端模式
        this.forceCloudMode();
        
        // 监听数据源切换事件（但会忽略本地模式请求）
        window.addEventListener('dataSourceChanged', (e) => {
            if (e.detail.useLocalStorage) {
                console.log('⚠️ 数据适配器：忽略本地模式请求，保持云端模式');
                this.setUseLocalStorage(false);
            } else {
                this.setUseLocalStorage(false);
            }
        });
        
        // 监听积分更新事件
        window.addEventListener('pointsUpdated', (e) => {
            console.log('🌐 数据适配器：收到积分更新事件', e.detail);
            this.syncPointsToCloud(e.detail);
        });
        
        console.log('🌐 数据适配器：初始化完成（云端模式）');
    }
    
    /**
     * 强制启用云端模式
     */
    forceCloudMode() {
        this.useLocalStorage = false;
        localStorage.setItem('forceCloudMode', 'true');
        localStorage.removeItem('useLocalStorage');
        
        console.log('🌐 数据适配器：已强制启用云端模式');
        
        this.notifySubscribers('dataSourceChanged', {
            useLocalStorage: false,
            forced: true,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * 同步积分到云端
     */
    async syncPointsToCloud(pointsData) {
        try {
            console.log('🌐 数据适配器：同步积分到云端', pointsData);
            
            // 通过API服务同步到云端
            if (this.apiService) {
                await this.apiService.updatePoints(
                    pointsData.amount || 0,
                    pointsData.reason || '云端同步',
                    pointsData.metadata || {}
                );
            }
            
            // 同时更新本地缓存作为备份
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            currentUser.points = pointsData.newPoints;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
        } catch (error) {
            console.error('🌐 数据适配器：云端同步失败', error);
        }
    }
    
    /**
     * 切换数据源 - 强制云端
     */
    setUseLocalStorage(useLocalStorage) {
        // 忽略本地模式请求，强制使用云端
        this.useLocalStorage = false;
        
        console.log(`🌐 数据适配器：强制云端模式，忽略本地模式请求`);
        
        this.notifySubscribers('dataSourceChanged', {
            useLocalStorage: false,
            forced: true,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * 订阅数据变化事件
     */
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }
    
    /**
     * 通知订阅者
     */
    notifySubscribers(event, data) {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('数据适配器：订阅者回调执行失败', error);
                }
            });
        }
    }
    
    // ==================== 用户系统适配 - 云端版 ====================
    
    /**
     * 用户登录 - 强制云端
     */
    async login(credentials) {
        try {
            console.log('🌐 数据适配器：云端登录请求');
            return await this.loginRemote(credentials);
        } catch (error) {
            console.error('数据适配器：云端登录失败', error);
            throw error;
        }
    }
    
    /**
     * 远程API登录
     */
    async loginRemote(credentials) {
        const result = await this.apiService.login(credentials);
        
        if (result.success || result.user) {
            localStorage.setItem('currentUser', JSON.stringify(result.user || result.data.user));
            localStorage.setItem('isLoggedIn', 'true');
            
            if (result.token) {
                this.apiService.setAuthToken(result.token);
            }
            
            // 初始化积分系统
            if (window.pointsSystem) {
                window.pointsSystem.currentUser = result.user || result.data.user;
                await this.loadRemotePointsData((result.user || result.data.user).id);
            }
            
            this.notifySubscribers('userLoggedIn', { user: result.user || result.data.user });
        }
        
        return result;
    }
    
    /**
     * 从远程加载积分数据
     */
    async loadRemotePointsData(userId) {
        try {
            console.log('🌐 数据适配器：从云端加载积分数据');
            
            // 这里可以调用云端API获取积分数据
            // 暂时使用本地数据作为备份
            if (window.pointsSystem) {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                window.pointsSystem.currentUser.points = currentUser.points || 0;
            }
        } catch (error) {
            console.error('数据适配器：加载远程积分数据失败', error);
        }
    }
    
    /**
     * 获取用户信息 - 强制云端
     */
    async getUserInfo() {
        try {
            const result = await this.apiService.getUserInfo();
            return result.data ? result.data.user : null;
        } catch (error) {
            console.error('数据适配器：获取云端用户信息失败', error);
            // 降级到本地缓存
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return user;
        }
    }
    
    /**
     * 更新用户信息 - 强制云端
     */
    async updateUserInfo(userData) {
        try {
            const result = await this.apiService.updateUserInfo(userData);
            if (result.success || result.data) {
                const updatedUser = result.data ? result.data.user : userData;
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                this.notifySubscribers('userInfoUpdated', { user: updatedUser });
            }
            return result;
        } catch (error) {
            console.error('数据适配器：云端更新用户信息失败', error);
            throw error;
        }
    }
    
    /**
     * 退出登录 - 强制云端
     */
    async logout() {
        try {
            await this.apiService.logout();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            this.notifySubscribers('userLoggedOut', {});
        } catch (error) {
            console.error('数据适配器：云端退出登录失败', error);
        }
    }
    
    // ==================== 积分系统适配 - 云端版 ====================
    
    /**
     * 获取积分余额 - 强制云端
     */
    async getPointsBalance() {
        try {
            const result = await this.apiService.getPointsBalance();
            return result.data ? result.data.balance : 0;
        } catch (error) {
            console.error('数据适配器：获取云端积分余额失败', error);
            // 降级到本地缓存
            if (window.pointsSystem) {
                return window.pointsSystem.getPoints();
            }
            return 0;
        }
    }
    
    /**
     * 更新积分 - 强制云端
     */
    async updatePoints(amount, reason, metadata = {}) {
        try {
            console.log('🌐 数据适配器：云端更新积分', { amount, reason });
            
            const result = await this.apiService.updatePoints(amount, reason, metadata);
            
            if (window.pointsSystem) {
                const newPoints = result.data ? result.data.newPoints : amount;
                window.pointsSystem.currentUser.points = newPoints;
                
                const record = {
                    id: Date.now(),
                    userId: window.pointsSystem.currentUser.id,
                    timestamp: new Date().toISOString(),
                    reason: reason,
                    amount: amount,
                    oldPoints: (result.data && result.data.oldPoints) || 0,
                    newPoints: newPoints,
                    type: amount > 0 ? 'earn' : 'spend',
                    metadata: metadata
                };
                window.pointsSystem.history.unshift(record);
                window.pointsSystem.saveHistory();
            }
            
            this.notifySubscribers('pointsUpdated', {
                newPoints: result.data ? result.data.newPoints : amount,
                amount: amount,
                reason: reason,
                balance: result.data ? result.data.newPoints : amount
            });
            
            return result;
        } catch (error) {
            console.error('数据适配器：云端更新积分失败', error);
            throw error;
        }
    }
    
    // ==================== 背包系统适配 - 云端版 ====================
    
    /**
     * 获取背包物品 - 强制云端
     */
    async getBackpackItems() {
        try {
            const result = await this.apiService.getBackpackItems();
            return result;
        } catch (error) {
            console.error('数据适配器：获取云端背包物品失败', error);
            // 降级到本地缓存
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const backpackKey = `backpack_${user.id}`;
            let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
            
            return {
                success: true,
                data: {
                    items: backpackData.gameItems || [],
                    dollMaterials: backpackData.dollMaterials || [],
                    orders: backpackData.orders || []
                }
            };
        }
    }
    
    /**
     * 添加物品到背包 - 强制云端
     */
    async addBackpackItem(itemData) {
        try {
            const result = await this.apiService.addBackpackItem(itemData);
            
            this.notifySubscribers('backpackItemAdded', { 
                item: result.data ? result.data.item : itemData 
            });
            
            return result;
        } catch (error) {
            console.error('数据适配器：云端添加背包物品失败', error);
            throw error;
        }
    }
    
    /**
     * 使用背包物品 - 强制云端
     */
    async useBackpackItem(itemId, quantity = 1) {
        try {
            const result = await this.apiService.useBackpackItem(itemId, quantity);
            
            this.notifySubscribers('backpackItemUsed', { 
                item: result.data ? result.data.item : itemId, 
                quantity 
            });
            
            return result;
        } catch (error) {
            console.error('数据适配器：云端使用背包物品失败', error);
            throw error;
        }
    }
    
    // ==================== 订单系统适配 - 云端版 ====================
    
    /**
     * 创建订单 - 强制云端
     */
    async createOrder(orderData) {
        try {
            const result = await this.apiService.createOrder(orderData);
            
            this.notifySubscribers('orderCreated', { 
                order: result.data ? result.data.order : orderData 
            });
            
            return result;
        } catch (error) {
            console.error('数据适配器：云端创建订单失败', error);
            throw error;
        }
    }
    
    /**
     * 获取用户订单 - 强制云端
     */
    async getUserOrders() {
        try {
            const result = await this.apiService.getUserOrders();
            return result;
        } catch (error) {
            console.error('数据适配器：获取云端用户订单失败', error);
            return { success: false, error: error.message };
        }
    }
    
    // ==================== 事件管理 ====================
    
    /**
     * 触发事件
     */
    emit(eventName, data) {
        this.notifySubscribers(eventName, data);
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
    
    /**
     * 监听事件
     */
    on(eventName, callback) {
        this.subscribe(eventName, callback);
        window.addEventListener(eventName, callback);
    }
    
    /**
     * 移除事件监听
     */
    off(eventName, callback) {
        this.unsubscribe(eventName, callback);
        window.removeEventListener(eventName, callback);
    }
}

// 创建全局数据适配器实例
window.dataAdapter = new DataAdapter();

// 页面加载完成后强制启用云端模式
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.dataAdapter.forceCloudMode();
    }, 100);
});
