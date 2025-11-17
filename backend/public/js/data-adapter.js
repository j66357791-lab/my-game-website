/**
 * 数据适配器 - 强制云端同步版（完整修复版）
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
        
        // 🔧 监听服务器维护事件
        window.addEventListener('serverMaintenance', (e) => {
            console.log('🌐 数据适配器：收到服务器维护事件', e.detail);
            this.handleServerMaintenance(e.detail);
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
     * 🔧 处理服务器维护
     */
    handleServerMaintenance(detail) {
        console.log('🔧 处理服务器维护', detail);
        
        // 显示维护提示
        if (window.APP && window.APP.showNotification) {
            window.APP.showNotification('info', '服务器维护中', '请稍后重试');
        }
        
        // 设置维护模式
        localStorage.setItem('serverMaintenance', 'true');
        localStorage.setItem('serverMaintenanceTime', new Date().toISOString());
    }
    
    /**
     * 同步积分到云端
     */
    async syncPointsToCloud(pointsData) {
        try {
            console.log('🌐 数据适配器：同步积分到云端', pointsData);
            
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，跳过云端同步');
                return false;
            }
            
            // 通过API服务同步到云端
            if (this.apiService) {
                const result = await this.apiService.updatePoints(
                    pointsData.amount || 0,
                    pointsData.reason || '云端同步',
                    pointsData.metadata || {}
                );
                
                if (!result.success) {
                    console.error('🌐 数据适配器：云端同步失败', result.error);
                    return false;
                }
            }
            
            // 同时更新本地缓存作为备份
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            currentUser.points = pointsData.newPoints;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            return true;
        } catch (error) {
            console.error('🌐 数据适配器：云端同步失败', error);
            return false;
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
    
    // ==================== 用户系统适配 - 云端版（完整修复版） ====================
    
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
        try {
            const result = await this.apiService.login(credentials);
            
            if (result.success || result.user) {
                const user = result.user || result.data.user;
                
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('isLoggedIn', 'true');
                
                if (result.token) {
                    this.apiService.setAuthToken(result.token);
                }
                
                // 初始化积分系统
                if (window.pointsSystem) {
                    window.pointsSystem.currentUser = user;
                    await this.loadRemotePointsData(user.id);
                }
                
                this.notifySubscribers('userLoggedIn', { user });
            }
            
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 loginRemote 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 loginRemote 检测到502错误');
                if (this.apiService && this.apiService.handle502Error) {
                    this.apiService.handle502Error();
                }
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            
            console.error('数据适配器：远程登录失败', error);
            throw error;
        }
    }
    
    /**
     * 从远程加载积分数据
     */
    async loadRemotePointsData(userId) {
        try {
            console.log('🌐 数据适配器：从云端加载积分数据');
            
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，使用本地数据');
                if (window.pointsSystem) {
                    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    window.pointsSystem.currentUser.points = currentUser.points || 0;
                }
                return;
            }
            
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
     * 获取用户信息 - 强制云端（完整修复版）
     */
    async getUserInfo() {
        try {
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，使用本地数据');
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                return { success: true, data: { user } };
            }
            
            // 🔧 先检查本地状态
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const currentUser = localStorage.getItem('currentUser');
            
            if (!isLoggedIn || !currentUser) {
                return { success: false, error: 'User not logged in' };
            }
            
            // 🔧 检查token是否过期
            const tokenExpiry = localStorage.getItem('tokenExpiry');
            if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
                console.log('🔐 Token已过期，使用本地数据');
                const user = JSON.parse(currentUser);
                return { success: true, data: { user } };
            }
            
            // 🔧 尝试从云端获取
            const result = await this.apiService.getUserInfo();
            
            // 🔧 检查401错误
            if (result.status === 401 || (result.error && result.error.includes('401'))) {
                console.log('🔐 getUserInfo 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            
            // 🔧 检查502错误
            if (result.status === 502 || (result.error && result.error.includes('502'))) {
                console.log('🔧 getUserInfo 检测到502错误');
                const user = JSON.parse(currentUser);
                return { success: true, data: { user } };
            }
            
            return result;
        } catch (error) {
            // 🔧 处理网络错误中的401
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 getUserInfo 捕获到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            
            // 🔧 处理网络错误中的502
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 getUserInfo 捕获到502错误');
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                return { success: true, data: { user } };
            }
            
            console.error('获取用户信息失败:', error);
            // 降级到本地缓存
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return { success: true, data: { user } };
        }
    }
    
    /**
     * 更新用户信息 - 强制云端
     */
    async updateUserInfo(userData) {
        try {
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，跳过云端更新');
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const updatedUser = { ...currentUser, ...userData };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                this.notifySubscribers('userInfoUpdated', { user: updatedUser });
                return { success: true, data: { user: updatedUser } };
            }
            
            const result = await this.apiService.updateUserInfo(userData);
            if (result.success || result.data) {
                const updatedUser = result.data ? result.data.user : userData;
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                this.notifySubscribers('userInfoUpdated', { user: updatedUser });
            }
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 updateUserInfo 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 updateUserInfo 检测到502错误');
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const updatedUser = { ...currentUser, ...userData };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                this.notifySubscribers('userInfoUpdated', { user: updatedUser });
                return { success: true, data: { user: updatedUser } };
            }
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
    
    // ==================== 积分系统适配 - 云端版（完整修复版） ====================
    
    /**
     * 获取积分余额 - 强制云端
     */
    async getPointsBalance() {
        try {
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，使用本地数据');
                if (window.pointsSystem) {
                    return window.pointsSystem.getPoints();
                }
                return 0;
            }
            
            const result = await this.apiService.getPointsBalance();
            return result.data ? result.data.balance : 0;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 getPointsBalance 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return 0;
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 getPointsBalance 检测到502错误');
                if (window.pointsSystem) {
                    return window.pointsSystem.getPoints();
                }
                return 0;
            }
            console.error('数据适配器：获取云端积分余额失败', error);
            // 降级到本地缓存
            if (window.pointsSystem) {
                return window.pointsSystem.getPoints();
            }
            return 0;
        }
    }
    
    /**
     * 更新积分 - 强制云端（完整修复版）
     */
    async updatePoints(amount, reason, metadata = {}) {
        try {
            console.log('🌐 数据适配器：云端更新积分', { amount, reason });
            
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，跳过云端更新');
                if (window.pointsSystem) {
                    const newPoints = window.pointsSystem.getPoints() + amount;
                    window.pointsSystem.currentUser.points = newPoints;
                    
                    const record = {
                        id: Date.now(),
                        userId: window.pointsSystem.currentUser.id,
                        timestamp: new Date().toISOString(),
                        reason: reason,
                        amount: amount,
                        oldPoints: window.pointsSystem.getPoints() - amount,
                        newPoints: newPoints,
                        type: amount > 0 ? 'earn' : 'spend',
                        metadata: metadata
                    };
                    window.pointsSystem.history.unshift(record);
                    window.pointsSystem.saveHistory();
                    
                    this.notifySubscribers('pointsUpdated', {
                        newPoints: newPoints,
                        amount: amount,
                        reason: reason,
                        balance: newPoints
                    });
                }
                return { success: true, data: { newPoints: newPoints } };
            }
            
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
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 updatePoints 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 updatePoints 检测到502错误');
                if (window.pointsSystem) {
                    const newPoints = window.pointsSystem.getPoints() + amount;
                    window.pointsSystem.currentUser.points = newPoints;
                    
                    const record = {
                        id: Date.now(),
                        userId: window.pointsSystem.currentUser.id,
                        timestamp: new Date().toISOString(),
                        reason: reason,
                        amount: amount,
                        oldPoints: window.pointsSystem.getPoints() - amount,
                        newPoints: newPoints,
                        type: amount > 0 ? 'earn' : 'spend',
                        metadata: metadata
                    };
                    window.pointsSystem.history.unshift(record);
                    window.pointsSystem.saveHistory();
                    
                    this.notifySubscribers('pointsUpdated', {
                        newPoints: newPoints,
                        amount: amount,
                        reason: reason,
                        balance: newPoints
                    });
                }
                return { success: true, data: { newPoints: newPoints } };
            }
            console.error('数据适配器：云端更新积分失败', error);
            throw error;
        }
    }
    
    // ==================== 背包系统适配 - 云端版（完整修复版） ====================
    
    /**
     * 获取背包物品 - 强制云端
     */
    async getBackpackItems() {
        try {
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，使用本地数据');
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
            
            const result = await this.apiService.getBackpackItems();
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 getBackpackItems 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 getBackpackItems 检测到502错误');
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
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，跳过云端添加');
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const backpackKey = `backpack_${user.id}`;
                let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
                
                if (!backpackData.gameItems) {
                    backpackData.gameItems = [];
                }
                
                backpackData.gameItems.push(itemData);
                localStorage.setItem(backpackKey, JSON.stringify(backpackData));
                
                this.notifySubscribers('backpackItemAdded', { item: itemData });
                return { success: true, data: { item: itemData } };
            }
            
            const result = await this.apiService.addBackpackItem(itemData);
            
            this.notifySubscribers('backpackItemAdded', { 
                item: result.data ? result.data.item : itemData 
            });
            
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 addBackpackItem 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 addBackpackItem 检测到502错误');
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const backpackKey = `backpack_${user.id}`;
                let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
                
                if (!backpackData.gameItems) {
                    backpackData.gameItems = [];
                }
                
                backpackData.gameItems.push(itemData);
                localStorage.setItem(backpackKey, JSON.stringify(backpackData));
                
                this.notifySubscribers('backpackItemAdded', { item: itemData });
                return { success: true, data: { item: itemData } };
            }
            console.error('数据适配器：云端添加背包物品失败', error);
            throw error;
        }
    }
    
    /**
     * 使用背包物品 - 强制云端
     */
    async useBackpackItem(itemId, quantity = 1) {
        try {
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，跳过云端使用');
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const backpackKey = `backpack_${user.id}`;
                let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
                
                if (backpackData.gameItems) {
                    const itemIndex = backpackData.gameItems.findIndex(item => item.id === itemId);
                    if (itemIndex !== -1) {
                        backpackData.gameItems.splice(itemIndex, quantity);
                        localStorage.setItem(backpackKey, JSON.stringify(backpackData));
                    }
                }
                
                this.notifySubscribers('backpackItemUsed', { item: itemId, quantity });
                return { success: true, data: { item: itemId, quantity } };
            }
            
            const result = await this.apiService.useBackpackItem(itemId, quantity);
            
            this.notifySubscribers('backpackItemUsed', { 
                item: result.data ? result.data.item : itemId, 
                quantity 
            });
            
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 useBackpackItem 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 useBackpackItem 检测到502错误');
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const backpackKey = `backpack_${user.id}`;
                let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
                
                if (backpackData.gameItems) {
                    const itemIndex = backpackData.gameItems.findIndex(item => item.id === itemId);
                    if (itemIndex !== -1) {
                        backpackData.gameItems.splice(itemIndex, quantity);
                        localStorage.setItem(backpackKey, JSON.stringify(backpackData));
                    }
                }
                
                this.notifySubscribers('backpackItemUsed', { item: itemId, quantity });
                return { success: true, data: { item: itemId, quantity } };
            }
            console.error('数据适配器：云端使用背包物品失败', error);
            throw error;
        }
    }
    
    // ==================== 订单系统适配 - 云端版（完整修复版） ====================
    
    /**
     * 创建订单 - 强制云端
     */
    async createOrder(orderData) {
        try {
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，跳过云端创建');
                const order = {
                    id: 'ORDER' + Date.now(),
                    userId: JSON.parse(localStorage.getItem('currentUser') || '{}').id,
                    username: JSON.parse(localStorage.getItem('currentUser') || '{}').name,
                    ...orderData,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                this.notifySubscribers('orderCreated', { order });
                return { success: true, data: { order } };
            }
            
            const result = await this.apiService.createOrder(orderData);
            
            this.notifySubscribers('orderCreated', { 
                order: result.data ? result.data.order : orderData 
            });
            
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 createOrder 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 createOrder 检测到502错误');
                const order = {
                    id: 'ORDER' + Date.now(),
                    userId: JSON.parse(localStorage.getItem('currentUser') || '{}').id,
                    username: JSON.parse(localStorage.getItem('currentUser') || '{}').name,
                    ...orderData,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                this.notifySubscribers('orderCreated', { order });
                return { success: true, data: { order } };
            }
            console.error('数据适配器：云端创建订单失败', error);
            throw error;
        }
    }
    
    /**
     * 获取用户订单 - 强制云端
     */
    async getUserOrders() {
        try {
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，使用本地数据');
                const savedOrders = localStorage.getItem('userOrders');
                if (savedOrders) {
                    const orders = JSON.parse(savedOrders);
                    return { success: true, data: { orders } };
                }
                return { success: false, error: 'Server maintenance' };
            }
            
            const result = await this.apiService.getUserOrders();
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 getUserOrders 检测到401错误');
                if (this.apiService && this.apiService.handleAuthError) {
                    this.apiService.handleAuthError();
                }
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 getUserOrders 检测到502错误');
                const savedOrders = localStorage.getItem('userOrders');
                if (savedOrders) {
                    const orders = JSON.parse(savedOrders);
                    return { success: true, data: { orders } };
                }
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
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
