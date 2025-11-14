/**
 * API服务层 - 统一处理所有API请求
 * 支持本地存储和远程API切换
 */
class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this.retryAttempts = 3;
        this.useLocalStorage = API_CONFIG.USE_MOCK || false;
    }
    
    /**
     * 切换数据源
     */
    setUseLocalStorage(useLocalStorage) {
        const oldMode = this.useLocalStorage;
        this.useLocalStorage = useLocalStorage;
        
        console.log(`数据源切换: ${oldMode ? '本地存储' : '远程API'} -> ${useLocalStorage ? '本地存储' : '远程API'}`);
        
        // 触发数据源切换事件
        window.dispatchEvent(new CustomEvent('dataSourceChanged', {
            detail: { 
                useLocalStorage,
                oldMode,
                timestamp: new Date().toISOString()
            }
        }));
    }
    
    /**
     * 通用请求方法
     */
    async request(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            ...options
        };
        
        const token = this.getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 根据配置选择请求方式
        if (this.useLocalStorage) {
            return this.requestLocalStorage(endpoint, config);
        } else {
            return this.requestRemote(endpoint, config);
        }
    }
    
    /**
     * 本地存储请求
     */
    async requestLocalStorage(endpoint, config) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const result = this.handleLocalStorageRequest(endpoint, config);
                if (result.success) {
                    resolve(result);
                } else {
                    reject(new Error(result.error || '请求失败'));
                }
            }, Math.random() * 300 + 100);
        });
    }
    
    /**
     * 处理本地存储请求
     */
    handleLocalStorageRequest(endpoint, config) {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        // 根据端点处理不同的本地存储请求
        if (endpoint.includes('/points/')) {
            return this.handlePointsRequest(endpoint, config, user);
        } else if (endpoint.includes('/backpack/')) {
            return this.handleBackpackRequest(endpoint, config, user);
        } else if (endpoint.includes('/orders/')) {
            return this.handleOrderRequest(endpoint, config, user);
        } else if (endpoint.includes('/user/')) {
            return this.handleUserRequest(endpoint, config, user);
        } else if (endpoint.includes('/games/doll-king/')) {
            return this.handleDollKingRequest(endpoint, config, user);
        }
        
        return { success: false, error: '不支持的本地存储请求' };
    }
    
    /**
     * 处理娃娃之王请求
     */
    handleDollKingRequest(endpoint, config, user) {
        const userId = user.id || user.username;
        
        if (config.method === 'GET') {
            if (endpoint.includes('/data')) {
                const savedData = localStorage.getItem(`kingGame_${userId}`);
                if (savedData) {
                    return {
                        success: true,
                        data: JSON.parse(savedData)
                    };
                }
            }
        } else if (config.method === 'POST') {
            if (endpoint.includes('/save')) {
                if (config.body) {
                    localStorage.setItem(`kingGame_${userId}`, JSON.stringify(config.body));
                    return {
                        success: true,
                        data: config.body
                    };
                }
            } else if (endpoint.includes('/sync')) {
                // 模拟同步到服务器
                return {
                    success: true,
                    message: '数据同步成功'
                };
            }
        }
        
        return { success: false, error: '娃娃之王请求处理失败' };
    }
    
    /**
     * 处理积分相关请求
     */
    handlePointsRequest(endpoint, config, user) {
        if (config.method === 'GET') {
            if (endpoint.includes('/balance')) {
                return {
                    success: true,
                    data: {
                        balance: window.pointsSystem ? window.pointsSystem.getPoints() : (user.points || 0)
                    }
                };
            }
        } else if (config.method === 'POST') {
            if (endpoint.includes('/update')) {
                if (window.pointsSystem && config.body) {
                    return window.pointsSystem.updatePoints(
                        config.body.amount,
                        config.body.reason,
                        config.body.metadata
                    );
                }
            }
        }
        
        return { success: false, error: '积分请求处理失败' };
    }
    
    /**
     * 处理背包相关请求
     */
    handleBackpackRequest(endpoint, config, user) {
        const backpackKey = `backpack_${user.id}`;
        let backpackData = JSON.parse(localStorage.getItem(backpackKey) || '{}');
        
        if (config.method === 'GET') {
            if (endpoint.includes('/items')) {
                return {
                    success: true,
                    data: {
                        items: backpackData.gameItems || []
                    }
                };
            }
        } else if (config.method === 'POST') {
            if (endpoint.includes('/items')) {
                const item = config.body;
                if (!backpackData.gameItems) {
                    backpackData.gameItems = [];
                }
                
                const existingIndex = backpackData.gameItems.findIndex(i => i.id === item.id);
                if (existingIndex >= 0) {
                    backpackData.gameItems[existingIndex].quantity += item.quantity;
                } else {
                    backpackData.gameItems.push(item);
                }
                
                localStorage.setItem(backpackKey, JSON.stringify(backpackData));
                
                return {
                    success: true,
                    data: { item: backpackData.gameItems[existingIndex] || item }
                };
            }
        }
        
        return { success: false, error: '背包请求处理失败' };
    }
    
    /**
     * 处理订单相关请求
     */
    handleOrderRequest(endpoint, config, user) {
        const ordersKey = `orders_${user.id}`;
        let orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
        
        if (config.method === 'GET') {
            if (endpoint.includes('/user')) {
                return {
                    success: true,
                    data: {
                        orders: orders
                    }
                };
            }
        } else if (config.method === 'POST') {
            if (endpoint.includes('/create')) {
                const order = {
                    id: 'ORDER' + Date.now(),
                    ...config.body,
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
                
                return {
                    success: true,
                    data: { order }
                };
            }
        }
        
        return { success: false, error: '订单请求处理失败' };
    }
    
    /**
     * 处理用户相关请求
     */
    handleUserRequest(endpoint, config, user) {
        if (config.method === 'GET') {
            if (endpoint.includes('/info')) {
                return {
                    success: true,
                    data: {
                        user: user
                    }
                };
            }
        } else if (config.method === 'PUT') {
            if (endpoint.includes('/info')) {
                const updatedUser = { ...user, ...config.body };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                
                const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
                const userIndex = allUsers.findIndex(u => u.id === user.id);
                if (userIndex >= 0) {
                    allUsers[userIndex] = updatedUser;
                    localStorage.setItem('allUsers', JSON.stringify(allUsers));
                }
                
                return {
                    success: true,
                    data: {
                        user: updatedUser
                    }
                };
            }
        }
        
        return { success: false, error: '用户请求处理失败' };
    }
    
    /**
     * 远程API请求
     */
    async requestRemote(endpoint, config) {
        const url = `${this.baseURL}${endpoint}`;
        
        let lastError;
        
        // 重试机制
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, {
                    ...config,
                    signal: AbortSignal.timeout(this.timeout)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // 检查业务状态码
                if (data.code !== undefined && data.code !== API_CONFIG.STATUS_CODES.SUCCESS) {
                    throw new Error(data.message || '请求失败');
                }
                
                // 记录成功请求
                console.log(`API请求成功: ${endpoint}`, data);
                return data;
                
            } catch (error) {
                lastError = error;
                console.warn(`API请求失败 (尝试 ${attempt + 1}/${this.retryAttempts}):`, error);
                
                if (attempt < this.retryAttempts - 1) {
                    // 等待后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * 获取认证token
     */
    getAuthToken() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.token || '';
    }
    
    /**
     * 设置认证token
     */
    setAuthToken(token) {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        user.token = token;
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    /**
     * 清除认证token
     */
    clearAuthToken() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        delete user.token;
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    // ==================== 用户相关API方法 ====================
    
    /**
     * 用户登录
     */
    async login(credentials) {
        return this.request(API_CONFIG.ENDPOINTS.USER.LOGIN, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }
    
    /**
     * 获取用户信息
     */
    async getUserInfo() {
        return this.request(API_CONFIG.ENDPOINTS.USER.GET_INFO);
    }
    
    /**
     * 更新用户信息
     */
    async updateUserInfo(userData) {
        return this.request(API_CONFIG.ENDPOINTS.USER.UPDATE_INFO, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    /**
     * 退出登录
     */
    async logout() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.USER.LOGOUT, {
                method: 'POST'
            });
            
            this.clearAuthToken();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            
            return result;
        } catch (error) {
            console.error('退出登录失败:', error);
            // 即使API失败也要清除本地数据
            this.clearAuthToken();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
        }
    }
    
    // ==================== 积分相关API方法 ====================
    
    /**
     * 获取积分余额
     */
    async getPointsBalance() {
        return this.request(API_CONFIG.ENDPOINTS.POINTS.GET_BALANCE);
    }
    
    /**
     * 更新积分
     */
    async updatePoints(amount, reason, metadata = {}) {
        return this.request(API_CONFIG.ENDPOINTS.POINTS.UPDATE_POINTS, {
            method: 'POST',
            body: JSON.stringify({
                amount,
                reason,
                metadata
            })
        });
    }
    
    // ==================== 背包相关API方法 ====================
    
    /**
     * 获取背包物品
     */
    async getBackpackItems() {
        return this.request(API_CONFIG.ENDPOINTS.BACKPACK.GET_ITEMS);
    }
    
    /**
     * 添加物品到背包
     */
    async addBackpackItem(itemData) {
        return this.request(API_CONFIG.ENDPOINTS.BACKPACK.ADD_ITEM, {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
    }
    
    /**
     * 使用背包物品
     */
    async useBackpackItem(itemId, quantity = 1) {
        return this.request(`${API_CONFIG.ENDPOINTS.BACKPACK.USE_ITEM}/${itemId}`, {
            method: 'POST',
            body: JSON.stringify({ quantity })
        });
    }
    
    // ==================== 订单相关API方法 ====================
    
    /**
     * 创建订单
     */
    async createOrder(orderData) {
        return this.request(API_CONFIG.ENDPOINTS.ORDERS.CREATE, {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }
    
    /**
     * 获取用户订单
     */
    async getUserOrders() {
        return this.request(API_CONFIG.ENDPOINTS.ORDERS.GET_USER_ORDERS);
    }
    
    // ==================== 游戏相关API方法 ====================
    
    /**
     * 玩骰子游戏
     */
    async playDiceGame(gameData) {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.DICE_PLAY, {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }
    
    /**
     * 恐怖奶奶游戏
     */
    async playGrandmaGame(gameData) {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.GRANDMA_PLAY, {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }
    
    /**
     * 购买娃娃
     */
    async buyDoll(dollData) {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.DOLL_BUY, {
            method: 'POST',
            body: JSON.stringify(dollData)
        });
    }
    
    /**
     * 获取娃娃列表
     */
    async getDollList() {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.DOLL_LIST);
    }
    
    // ==================== 娃娃之王相关API方法 ====================
    
    /**
     * 获取娃娃之王数据
     */
    async getDollKingData() {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.DOLL_KING_GET_DATA);
    }
    
    /**
     * 保存娃娃之王数据
     */
    async saveDollKingData(gameData) {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.DOLL_KING_SAVE_DATA, {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }
    
    /**
     * 同步娃娃之王数据
     */
    async syncDollKingData() {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.DOLL_KING_SYNC_DATA, {
            method: 'POST'
        });
    }
    
    // ==================== 通用API方法 ====================
    
    /**
     * 健康检查
     */
    async healthCheck() {
        return this.request(API_CONFIG.ENDPOINTS.COMMON.HEALTH_CHECK);
    }
    
    /**
     * 获取版本信息
     */
    async getVersion() {
        return this.request(API_CONFIG.ENDPOINTS.COMMON.VERSION);
    }
}

// 创建全局API服务实例
window.apiService = new ApiService();
