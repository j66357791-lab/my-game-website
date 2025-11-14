/**
 * API服务层 - 修复版
 */
class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this.useLocalStorage = true;
    }
    
    /**
     * 切换数据源
     */
    setUseLocalStorage(useLocalStorage) {
        this.useLocalStorage = useLocalStorage;
        console.log(`API服务：数据源切换为: ${useLocalStorage ? '本地存储' : '远程API'}`);
        
        window.dispatchEvent(new CustomEvent('dataSourceChanged', {
            detail: { useLocalStorage }
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
        
        if (endpoint.includes('/points/')) {
            return this.handlePointsRequest(endpoint, config, user);
        } else if (endpoint.includes('/backpack/')) {
            return this.handleBackpackRequest(endpoint, config, user);
        } else if (endpoint.includes('/orders/')) {
            return this.handleOrderRequest(endpoint, config, user);
        } else if (endpoint.includes('/user/')) {
            return this.handleUserRequest(endpoint, config, user);
        }
        
        return { success: false, error: '不支持的本地存储请求' };
    }
    
    /**
     * 处理积分相关请求 - 修复版
     */
    handlePointsRequest(endpoint, config, user) {
        console.log('API服务：处理积分请求', { endpoint, config });
        
        if (config.method === 'GET') {
            if (endpoint.includes('/balance')) {
                const points = window.pointsSystem ? window.pointsSystem.getPoints() : (user.points || 0);
                console.log('API服务：获取积分余额', points);
                return {
                    success: true,
                    data: {
                        balance: points
                    }
                };
            }
        } else if (config.method === 'POST') {
            if (endpoint.includes('/update')) {
                if (window.pointsSystem && config.body) {
                    console.log('API服务：更新积分', config.body);
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
                    createdAt: new Date().toISOString()
                };
                
                orders.unshift(order);
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
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.code !== API_CONFIG.STATUS_CODES.SUCCESS) {
                throw new Error(data.message || '请求失败');
            }
            
            return data;
        } catch (error) {
            console.error('API服务：远程API请求失败', error);
            throw error;
        }
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
    
    // 用户相关API方法
    async login(credentials) {
        return this.request(API_CONFIG.ENDPOINTS.USER.LOGIN, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }
    
    async getUserInfo() {
        return this.request(API_CONFIG.ENDPOINTS.USER.GET_INFO);
    }
    
    async updateUserInfo(userData) {
        return this.request(API_CONFIG.ENDPOINTS.USER.UPDATE_INFO, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
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
            console.error('API服务：退出登录失败', error);
            this.clearAuthToken();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
        }
    }
    
    // 积分相关API方法
    async getPointsBalance() {
        return this.request(API_CONFIG.ENDPOINTS.POINTS.GET_BALANCE);
    }
    
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
    
    // 背包相关API方法
    async getBackpackItems() {
        return this.request(API_CONFIG.ENDPOINTS.BACKPACK.GET_ITEMS);
    }
    
    async addBackpackItem(itemData) {
        return this.request(API_CONFIG.ENDPOINTS.BACKPACK.ADD_ITEM, {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
    }
    
    async useBackpackItem(itemId, quantity = 1) {
        return this.request(`${API_CONFIG.ENDPOINTS.BACKPACK.USE_ITEM}/${itemId}`, {
            method: 'POST',
            body: JSON.stringify({ quantity })
        });
    }
    
    // 订单相关API方法
    async createOrder(orderData) {
        return this.request(API_CONFIG.ENDPOINTS.ORDERS.CREATE, {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }
    
    async getUserOrders() {
        return this.request(API_CONFIG.ENDPOINTS.ORDERS.GET_USER_ORDERS);
    }
    
    // 游戏相关API方法
    async playDiceGame(gameData) {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.DICE_PLAY, {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }
    
    async playGrandmaGame(gameData) {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.GRANDMA_PLAY, {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }
    
    async buyDoll(dollData) {
        return this.request(API_CONFIG.ENDPOINTS.GAMES.DOLL_BUY, {
            method: 'POST',
            body: JSON.stringify(dollData)
        });
    }
    
    // 通用API方法
    async healthCheck() {
        return this.request(API_CONFIG.ENDPOINTS.COMMON.HEALTH_CHECK);
    }
}

// 创建全局API服务实例
window.apiService = new ApiService();
