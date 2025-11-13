/**
 * 数据适配器 - 统一管理本地存储和远程API的数据切换
 */
class DataAdapter {
    constructor() {
        this.useLocalStorage = true;
        this.apiService = window.apiService;
        this.subscribers = new Map();
        
        this.init();
    }
    
    /**
     * 初始化数据适配器
     */
    init() {
        console.log('数据适配器初始化完成');
        
        // 监听数据源切换事件
        window.addEventListener('dataSourceChanged', (e) => {
            this.setUseLocalStorage(e.detail.useLocalStorage);
        });
    }
    
    /**
     * 切换数据源
     */
    setUseLocalStorage(useLocalStorage) {
        const oldMode = this.useLocalStorage;
        this.useLocalStorage = useLocalStorage;
        
        console.log(`数据源切换: ${oldMode ? '本地存储' : '远程API'} -> ${useLocalStorage ? '本地存储' : '远程API'}`);
        
        this.notifySubscribers('dataSourceChanged', {
            useLocalStorage,
            oldMode,
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
                    console.error('订阅者回调执行失败:', error);
                }
            });
        }
    }
    
    // ==================== 用户系统适配 ====================
    
    /**
     * 用户登录
     */
    async login(credentials) {
        try {
            if (this.useLocalStorage) {
                return await this.loginLocalStorage(credentials);
            } else {
                return await this.loginRemote(credentials);
            }
        } catch (error) {
            console.error('登录失败:', error);
            throw error;
        }
    }
    
    /**
     * 本地存储登录
     */
    async loginLocalStorage(credentials) {
        const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
        const user = allUsers.find(u => 
            (u.username === credentials.username || u.phone === credentials.username) && 
            u.password === credentials.password &&
            u.isActive
        );
        
        if (user) {
            user.lastLoginTime = new Date().toISOString();
            const userIndex = allUsers.findIndex(u => u.id === user.id);
            allUsers[userIndex] = user;
            localStorage.setItem('allUsers', JSON.stringify(allUsers));
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('isLoggedIn', 'true');
            
            if (window.pointsSystem) {
                window.pointsSystem.currentUser = user;
                window.pointsSystem.loadHistory();
                window.pointsSystem.loadAuditLog();
                window.pointsSystem.calculateDashboard();
            }
            
            this.notifySubscribers('userLoggedIn', { user });
            
            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    points: user.points,
                    phone: user.phone
                }
            };
        } else {
            throw new Error('用户名或密码错误');
        }
    }
    
    /**
     * 远程API登录
     */
    async loginRemote(credentials) {
        const result = await this.apiService.login(credentials);
        
        if (result.success) {
            localStorage.setItem('currentUser', JSON.stringify(result.data.user));
            localStorage.setItem('isLoggedIn', 'true');
            this.apiService.setAuthToken(result.token);
            
            if (window.pointsSystem) {
                window.pointsSystem.currentUser = result.data.user;
                await this.loadRemotePointsData(result.data.user.id);
            }
            
            this.notifySubscribers('userLoggedIn', { user: result.data.user });
        }
        
        return result;
    }
    
    /**
     * 从远程加载积分数据
     */
    async loadRemotePointsData(userId) {
        try {
            const balanceResult = await this.apiService.getPointsBalance();
            if (balanceResult.success) {
                window.pointsSystem.currentUser.points = balanceResult.data.balance;
            }
            
            const historyResult = await this.apiService.getPointsHistory();
            if (historyResult.success) {
                window.pointsSystem.history = historyResult.data.history;
                window.pointsSystem.saveHistory();
            }
            
            const dashboardResult = await this.apiService.getPointsDashboard();
            if (dashboardResult.success) {
                window.pointsSystem.dashboard = dashboardResult.data.dashboard;
            }
        } catch (error) {
            console.error('加载远程积分数据失败:', error);
        }
    }
    
    /**
     * 获取用户信息
     */
    async getUserInfo() {
        try {
            if (this.useLocalStorage) {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                return user;
            } else {
                const result = await this.apiService.getUserInfo();
                return result.data ? result.data.user : null;
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }
    }
    
    /**
     * 更新用户信息
     */
    async updateUserInfo(userData) {
        try {
            if (this.useLocalStorage) {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const updatedUser = { ...currentUser, ...userData };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                
                const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
                const userIndex = allUsers.findIndex(u => u.id === updatedUser.id);
                if (userIndex >= 0) {
                    allUsers[userIndex] = updatedUser;
                    localStorage.setItem('allUsers', JSON.stringify(allUsers));
                }
                
                this.notifySubscribers('userInfoUpdated', { user: updatedUser });
                
                return { success: true, user: updatedUser };
            } else {
                const result = await this.apiService.updateUserInfo(userData);
                if (result.success) {
                    localStorage.setItem('currentUser', JSON.stringify(result.data.user));
                    this.notifySubscribers('userInfoUpdated', { user: result.data.user });
                }
                return result;
            }
        } catch (error) {
            console.error('更新用户信息失败:', error);
            throw error;
        }
    }
    
    /**
     * 退出登录
     */
    async logout() {
        try {
            if (this.useLocalStorage) {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('currentUser');
                this.apiService.clearAuthToken();
            } else {
                await this.apiService.logout();
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('currentUser');
                this.apiService.clearAuthToken();
            }
            
            this.notifySubscribers('userLoggedOut', {});
        } catch (error) {
            console.error('退出登录失败:', error);
        }
    }
    
    // ==================== 积分系统适配 ====================
    
    /**
     * 获取积分余额
     */
    async getPointsBalance() {
        try {
            if (this.useLocalStorage) {
                return window.pointsSystem ? window.pointsSystem.getPoints() : 0;
            } else {
                const result = await this.apiService.getPointsBalance();
                return result.data ? result.data.balance : 0;
            }
        } catch (error) {
            console.error('获取积分余额失败:', error);
            return 0;
        }
    }
    
    /**
     * 更新积分
     */
    async updatePoints(amount, reason, metadata = {}) {
        try {
            if (this.useLocalStorage) {
                if (window.pointsSystem) {
                    const result = await window.pointsSystem.updatePoints(amount, reason, metadata);
                    
                    this.notifySubscribers('pointsUpdated', {
                        newPoints: result.newPoints,
                        amount: amount,
                        reason: reason,
                        balance: result.newPoints
                    });
                    
                    return result;
                }
            } else {
                const result = await this.apiService.updatePoints(amount, reason, metadata);
                
                if (window.pointsSystem) {
                    window.pointsSystem.currentUser.points = result.data.newPoints;
                    const record = {
                        id: Date.now(),
                        userId: window.pointsSystem.currentUser.id,
                        timestamp: new Date().toISOString(),
                        reason: reason,
                        amount: amount,
                        oldPoints: result.data.oldPoints,
                        newPoints: result.data.newPoints,
                        type: amount > 0 ? 'earn' : 'spend',
                        metadata: metadata
                    };
                    window.pointsSystem.history.unshift(record);
                    window.pointsSystem.saveHistory();
                }
                
                this.notifySubscribers('pointsUpdated', {
                    newPoints: result.data.newPoints,
                    amount: amount,
                    reason: reason,
                    balance: result.data.newPoints
                });
                
                return result;
            }
        } catch (error) {
            console.error('更新积分失败:', error);
            throw error;
        }
    }
    
    // ==================== 背包系统适配 ====================
    
    /**
     * 获取背包物品
     */
    async getBackpackItems() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const backpackKey = `backpack_${user.id}`;
            let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
            
            if (this.useLocalStorage) {
                return {
                    success: true,
                    data: {
                        items: backpackData.gameItems || [],
                        dollMaterials: backpackData.dollMaterials || [],
                        orders: backpackData.orders || []
                    }
                };
            } else {
                const result = await this.apiService.getBackpackItems();
                return result;
            }
        } catch (error) {
            console.error('获取背包物品失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 添加物品到背包
     */
    async addBackpackItem(itemData) {
        try {
            if (this.useLocalStorage) {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const backpackKey = `backpack_${user.id}`;
                let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
                
                if (!backpackData.gameItems) {
                    backpackData.gameItems = [];
                }
                
                const existingIndex = backpackData.gameItems.findIndex(item => item.id === itemData.id);
                if (existingIndex >= 0) {
                    backpackData.gameItems[existingIndex].quantity += itemData.quantity;
                } else {
                    backpackData.gameItems.push({
                        ...itemData,
                        addedAt: new Date().toISOString()
                    });
                }
                
                localStorage.setItem(backpackKey, JSON.stringify(backpackData));
                
                this.notifySubscribers('backpackItemAdded', { item: backpackData.gameItems[existingIndex] || itemData });
                
                return { success: true, item: backpackData.gameItems[existingIndex] || itemData };
            } else {
                const result = await this.apiService.addBackpackItem(itemData);
                return result;
            }
        } catch (error) {
            console.error('添加背包物品失败:', error);
            throw error;
        }
    }
    
    /**
     * 使用背包物品
     */
    async useBackpackItem(itemId, quantity = 1) {
        try {
            if (this.useLocalStorage) {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const backpackKey = `backpack_${user.id}`;
                let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
                
                const itemIndex = backpackData.gameItems.findIndex(item => item.id === itemId);
                if (itemIndex < 0) {
                    throw new Error('物品不存在');
                }
                
                const item = backpackData.gameItems[itemIndex];
                if (item.quantity < quantity) {
                    throw new Error('物品数量不足');
                }
                
                item.quantity -= quantity;
                item.lastUsed = new Date().toISOString();
                
                if (item.quantity <= 0) {
                    backpackData.gameItems.splice(itemIndex, 1);
                }
                
                localStorage.setItem(backpackKey, JSON.stringify(backpackData));
                
                this.notifySubscribers('backpackItemUsed', { item, quantity });
                
                return { success: true, item };
            } else {
                const result = await this.apiService.useBackpackItem(itemId, quantity);
                return result;
            }
        } catch (error) {
            console.error('使用背包物品失败:', error);
            throw error;
        }
    }
    
    // ==================== 订单系统适配 ====================
    
    /**
     * 创建订单
     */
    async createOrder(orderData) {
        try {
            if (this.useLocalStorage) {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const ordersKey = `orders_${user.id}`;
                let orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
                
                const order = {
                    id: 'ORDER' + Date.now(),
                    ...orderData,
                    userId: user.id,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                orders.unshift(order);
                
                if (orders.length > 1000) {
                    orders = orders.slice(0, 1000);
                }
                
                localStorage.setItem(ordersKey, JSON.stringify(orders));
                
                this.notifySubscribers('orderCreated', { order });
                
                return { success: true, order };
            } else {
                const result = await this.apiService.createOrder(orderData);
                return result;
            }
        } catch (error) {
            console.error('创建订单失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取用户订单
     */
    async getUserOrders() {
        try {
            if (this.useLocalStorage) {
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const ordersKey = `orders_${user.id}`;
                const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
                
                return {
                    success: true,
                    data: { orders }
                };
            } else {
                const result = await this.apiService.getUserOrders();
                return result;
            }
        } catch (error) {
            console.error('获取用户订单失败:', error);
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
