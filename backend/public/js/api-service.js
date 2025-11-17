/**
 * API服务层 - 修复认证问题版
 */
class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this.abortController = new AbortController();
        
        // 🔧 修复：支持本地和云端模式
        this.useLocalStorage = false;
        
        // 🔧 修复：初始化时检测环境
        this.detectEnvironment();
    }
    
    /**
     * 🔧 修复：检测环境并设置模式
     */
    detectEnvironment() {
        // 检查是否强制云端模式
        const forceCloudMode = localStorage.getItem('forceCloudMode') === 'true';
        if (forceCloudMode) {
            this.useLocalStorage = false;
            console.log('🌐 API服务：检测到强制云端模式');
            return;
        }
        
        // 检查是否强制本地模式
        const forceLocalMode = localStorage.getItem('useLocalStorage') === 'true';
        if (forceLocalMode) {
            this.useLocalStorage = true;
            console.log('💾 API服务：检测到强制本地模式');
            return;
        }
        
        // 默认使用云端模式
        this.useLocalStorage = false;
        console.log('🌐 API服务：使用默认云端模式');
    }
    
    /**
     * 🔧 修复：切换数据源
     */
    setUseLocalStorage(useLocalStorage) {
        this.useLocalStorage = useLocalStorage;
        localStorage.setItem('useLocalStorage', useLocalStorage.toString());
        
        // 🔧 修复：清除强制云端模式
        if (useLocalStorage) {
            localStorage.removeItem('forceCloudMode');
        }
        
        console.log(`🔧 API服务：切换到${useLocalStorage ? '本地' : '云端'}模式`);
        
        // 🔧 修复：通知所有组件切换数据源
        window.dispatchEvent(new CustomEvent('dataSourceChanged', {
            detail: { useLocalStorage: useLocalStorage }
        }));
    }
    
    /**
     * 🔧 修复：通用请求方法
     */
    async request(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json'
            },
            ...options
        };
        
        // 🔧 修复：添加认证头
        const token = API_CONFIG.getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 🔧 修复：根据模式选择请求方式
        if (this.useLocalStorage) {
            return this.requestLocal(endpoint, config);
        } else {
            return this.requestRemote(endpoint, config);
        }
    }
    
    /**
     * 🔧 修复：本地API请求
     */
    async requestLocal(endpoint, config) {
        console.log(`💾 发送本地请求: ${endpoint}`);
        
        // 🔧 修复：本地模式使用模拟数据
        return this.simulateLocalResponse(endpoint, config);
    }
    
    /**
     * 🔧 修复：模拟本地响应
     */
    simulateLocalResponse(endpoint, config) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResponses = {
                    '/login': { success: true, message: '本地登录成功' },
                    '/user': { success: true, data: { user: JSON.parse(localStorage.getItem('currentUser') || '{}') } },
                    '/points/balance': { success: true, data: { balance: JSON.parse(localStorage.getItem('currentUser') || '{}').points || 0 } },
                    '/points/update': { success: true, data: { newPoints: JSON.parse(localStorage.getItem('currentUser') || '{}').points || 0 } },
                    '/backpack/items': { success: true, data: { items: JSON.parse(localStorage.getItem('backpackItems') || '[]') } },
                    '/orders/user': { success: true, data: { orders: JSON.parse(localStorage.getItem('userOrders') || '[]') } },
                    '/health': { success: true, message: '本地服务正常' }
                };
                
                const response = mockResponses[endpoint] || { success: false, error: '本地模式：未实现的端点' };
                resolve(response);
            }, 100);
        });
    }
    
    /**
     * 🔧 修复：远程API请求
     */
    async requestRemote(endpoint, config) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            console.log(`🌐 发送云端请求: ${url}`);
            
            const response = await fetch(url, {
                ...config,
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'same-origin',
                signal: this.abortController.signal
            });
            
            // 🔧 修复：处理认证错误
            if (response.status === 401 || response.status === 403) {
                console.log('🔐 API服务：认证失败');
                API_CONFIG.clearAuthToken();
                
                // 触发认证错误事件
                window.dispatchEvent(new CustomEvent('authError', {
                    detail: { 
                        status: response.status,
                        endpoint: endpoint
                    }
                }));
                
                throw new Error(`Authentication failed: ${response.status}`);
            }
            
            // 🔧 修复：处理服务器错误
            if (response.status === 502 || response.status === 503) {
                console.log('🔧 API服务：服务器不可用');
                
                // 触发服务器错误事件
                window.dispatchEvent(new CustomEvent('serverError', {
                    detail: { 
                        status: response.status,
                        endpoint: endpoint
                    }
                }));
                
                throw new Error(`Server unavailable: ${response.status}`);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseText = await response.text();
            
            // 🔧 修复：检查响应内容类型
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                console.log('🔧 API服务：服务器返回HTML错误页面');
                throw new Error(`Server returned HTML error page`);
            }
            
            // 🔧 修复：检查响应是否为HTML
            if (responseText.trim().startsWith('<')) {
                console.log('🔧 API服务：服务器返回HTML响应');
                throw new Error(`Server returned HTML response`);
            }
            
            // 🔧 修复：安全的JSON解析
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.log('🔧 API服务：JSON解析失败');
                throw new Error(`Invalid JSON response`);
            }
            
            console.log(`✅ 云端请求成功: ${endpoint}`);
            return data;
            
        } catch (error) {
            console.error(`❌ 云端API请求失败: ${endpoint}`, error);
            throw error;
        }
    }
    
    /**
     * 🔧 修复：处理认证错误
     */
    handleAuthError() {
        console.log('🔐 API服务：处理认证错误');
        
        // 清除认证信息
        API_CONFIG.clearAuthToken();
        localStorage.setItem('isLoggedIn', 'false');
        localStorage.removeItem('currentUser');
        
        // 停止所有进行中的请求
        this.abortController.abort();
        this.abortController = new AbortController();
        
        // 显示错误提示
        if (window.APP && window.APP.showNotification) {
            window.APP.showNotification('error', '登录已过期', '请重新登录');
        } else {
            alert('登录已过期，请重新登录');
        }
        
        // 延迟跳转，避免循环
        setTimeout(() => {
            if (!window.location.href.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }, 2000);
    }
    
    /**
     * 🔧 修复：处理服务器错误
     */
    handleServerError() {
        console.log('🔧 API服务：处理服务器错误');
        
        // 设置服务器维护模式
        localStorage.setItem('serverMaintenance', 'true');
        localStorage.setItem('serverMaintenanceTime', new Date().toISOString());
        
        // 停止所有进行中的请求
        this.abortController.abort();
        this.abortController = new AbortController();
        
        // 显示错误提示
        if (window.APP && window.APP.showNotification) {
            window.APP.showNotification('error', '服务器暂时不可用', '请稍后重试');
        } else {
            alert('服务器暂时不可用，请稍后重试');
        }
        
        // 触发服务器维护事件
        window.dispatchEvent(new CustomEvent('serverMaintenance', {
            detail: { 
                error: 'Server temporarily unavailable',
                timestamp: new Date().toISOString()
            }
        }));
    }
    
    // 🔧 修复：用户相关API方法
    async login(credentials) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.USER.LOGIN, {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            // 🔧 修复：保存认证信息
            if (result.success && result.token) {
                API_CONFIG.setAuthToken(result.token);
                
                // 设置token过期时间
                const expiryTime = new Date();
                expiryTime.setHours(expiryTime.getHours() + 24);
                localStorage.setItem('tokenExpiry', expiryTime.toISOString());
            }
            
            return result;
        } catch (error) {
            console.error('API服务：登录失败', error);
            return { success: false, error: error.message };
        }
    }
    
    async getUserInfo() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.USER.GET_INFO);
            return result;
        } catch (error) {
            console.error('API服务：获取用户信息失败', error);
            return { success: false, error: error.message };
        }
    }
    
    async logout() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.USER.LOGOUT, {
                method: 'POST'
            });
            
            // 🔧 修复：清除认证信息
            API_CONFIG.clearAuthToken();
            localStorage.setItem('isLoggedIn', 'false');
            localStorage.removeItem('currentUser');
            
            return result;
        } catch (error) {
            console.error('API服务：退出登录失败', error);
            // 即使失败也要清除认证信息
            API_CONFIG.clearAuthToken();
            localStorage.setItem('isLoggedIn', 'false');
            localStorage.removeItem('currentUser');
        }
    }
    
    // 🔧 修复：积分相关API方法
    async getPointsBalance() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.POINTS.GET_BALANCE);
            return result;
        } catch (error) {
            console.error('API服务：获取积分余额失败', error);
            return { success: false, error: error.message };
        }
    }
    
    async updatePoints(amount, reason, metadata = {}) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.POINTS.UPDATE_POINTS, {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    reason,
                    metadata
                })
            });
            return result;
        } catch (error) {
            console.error('API服务：更新积分失败', error);
            return { success: false, error: error.message };
        }
    }
    
    // 🔧 修复：背包相关API方法
    async getBackpackItems() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.BACKPACK.GET_ITEMS);
            return result;
        } catch (error) {
            console.error('API服务：获取背包物品失败', error);
            return { success: false, error: error.message };
        }
    }
    
    // 🔧 修复：订单相关API方法
    async createOrder(orderData) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.ORDERS.CREATE, {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
            return result;
        } catch (error) {
            console.error('API服务：创建订单失败', error);
            return { success: false, error: error.message };
        }
    }
    
    async getUserOrders() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.ORDERS.GET_USER_ORDERS);
            return result;
        } catch (error) {
            console.error('API服务：获取用户订单失败', error);
            return { success: false, error: error.message };
        }
    }
    
    // 🔧 修复：游戏相关API方法
    async playDiceGame(gameData) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.GAMES.DICE_PLAY, {
                method: 'POST',
                body: JSON.stringify(gameData)
            });
            return result;
        } catch (error) {
            console.error('API服务：骰子游戏失败', error);
            return { success: false, error: error.message };
        }
    }
    
    async playGrandmaGame(gameData) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.GAMES.GRANDMA_PLAY, {
                method: 'POST',
                body: JSON.stringify(gameData)
            });
            return result;
        } catch (error) {
            console.error('API服务：恐怖奶奶游戏失败', error);
            return { success: false, error: error.message };
        }
    }
    
    async buyDoll(dollData) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.GAMES.DOLL_BUY, {
                method: 'POST',
                body: JSON.stringify(dollData)
            });
            return result;
        } catch (error) {
            console.error('API服务：购买娃娃失败', error);
            return { success: false, error: error.message };
        }
    }
    
    // 🔧 修复：通用API方法
    async healthCheck() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.COMMON.HEALTH_CHECK);
            return result;
        } catch (error) {
            console.error('API服务：健康检查失败', error);
            return { success: false, error: error.message };
        }
    }
}

// 🔧 修复：创建全局API服务实例
window.apiService = new ApiService();

// 🔧 修复：页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 API服务：页面加载完成，开始初始化');
    
    // 🔧 修复：监听认证错误事件
    window.addEventListener('authError', (e) => {
        console.log('🔧 API服务：收到认证错误事件', e.detail);
        if (window.apiService) {
            window.apiService.handleAuthError();
        }
    });
    
    // 🔧 修复：监听服务器错误事件
    window.addEventListener('serverError', (e) => {
        console.log('🔧 API服务：收到服务器错误事件', e.detail);
        if (window.apiService) {
            window.apiService.handleServerError();
        }
    });
    
    // 🔧 修复：监听数据源切换事件
    window.addEventListener('dataSourceChanged', (e) => {
        console.log('🔧 API服务：收到数据源切换事件', e.detail);
        if (window.apiService) {
            window.apiService.setUseLocalStorage(e.detail.useLocalStorage);
        }
    });
    
    console.log('🔧 API服务：初始化完成');
});
