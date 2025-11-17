/**
 * API服务层 - 强制云端同步版（完整修复版）
 */
class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
        this.abortController = new AbortController();
        // 强制禁用本地存储，使用云端API
        this.useLocalStorage = false;
        
        // 初始化时强制设置云端模式
        this.forceCloudMode();
    }
    
    /**
     * 强制启用云端模式
     */
    forceCloudMode() {
        this.useLocalStorage = false;
        localStorage.setItem('forceCloudMode', 'true');
        console.log('🌐 API服务：已强制启用云端模式');
        
        // 通知所有组件切换到云端模式
        window.dispatchEvent(new CustomEvent('dataSourceChanged', {
            detail: { useLocalStorage: false }
        }));
    }
    
    /**
     * 切换数据源 - 已禁用，强制云端
     */
    setUseLocalStorage(useLocalStorage) {
        // 忽略本地模式请求，强制使用云端
        this.useLocalStorage = false;
        console.log(`🌐 API服务：强制云端模式，忽略本地模式请求`);
        
        window.dispatchEvent(new CustomEvent('dataSourceChanged', {
            detail: { useLocalStorage: false }
        }));
    }
    
    /**
     * 通用请求方法 - 强制云端（完整修复版）
     */
    async request(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'X-Force-Cloud': 'true' // 添加云端标识
            },
            ...options
        };
        
        const token = this.getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 强制使用远程API，忽略本地存储
        return this.requestRemote(endpoint, config);
    }
    
    /**
     * 远程API请求 - 完整修复版
     */
    async requestRemote(endpoint, config) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            console.log(`🌐 发送云端请求: ${url}`);
            
            const response = await fetch(url, {
                ...config,
                // 添加额外的云端请求配置
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'same-origin',
                signal: this.abortController.signal
            });
            
            // 🔧 修复401错误处理
            if (response.status === 401) {
                console.log('🔐 检测到401错误，自动处理');
                this.handleAuthError();
                throw new Error(`HTTP ${response.status}: Unauthorized`);
            }
            
            // 🔧 修复502错误处理
            if (response.status === 502) {
                console.log('🔧 检测到502错误，自动处理');
                this.handle502Error();
                throw new Error(`HTTP ${response.status}: Bad Gateway`);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // 🔧 检查响应内容类型
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                console.log('🔧 检测到HTML响应，返回502错误');
                this.handle502Error();
                throw new Error(`HTTP 502: Server returned HTML error page`);
            }
            
            const responseText = await response.text();
            
            // 🔧 检查响应是否为HTML
            if (responseText.trim().startsWith('<')) {
                console.log('🔧 检测到HTML响应，返回502错误');
                this.handle502Error();
                throw new Error(`HTTP 502: Server returned HTML response`);
            }
            
            // 🔧 安全的JSON解析
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.log('🔧 JSON解析失败，返回502错误');
                this.handle502Error();
                throw new Error(`HTTP 502: Invalid JSON response`);
            }
            
            // 检查响应格式
            if (data.code !== undefined && data.code !== API_CONFIG.STATUS_CODES.SUCCESS && data.code !== 200) {
                throw new Error(data.message || '云端请求失败');
            }
            
            console.log(`✅ 云端请求成功: ${endpoint}`);
            return data;
            
        } catch (error) {
            console.error(`❌ 云端API请求失败: ${endpoint}`, error);
            
            // 🔧 处理401错误
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 捕获到401错误，自动处理');
                this.handleAuthError();
            }
            
            // 🔧 处理502错误
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 捕获到502错误，自动处理');
                this.handle502Error();
            }
            
            // 显示云端错误提示
            this.showCloudError(error);
            throw error;
        }
    }
    
    /**
     * 🔧 处理认证错误
     */
    handleAuthError() {
        console.log('🔐 处理认证错误');
        
        // 清除认证信息
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpiry');
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
     * 🔧 处理502错误
     */
    handle502Error() {
        console.log('🔧 处理502错误');
        
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
    
    /**
     * 显示云端错误提示
     */
    showCloudError(error) {
        if (window.showNotification) {
            window.showNotification('云端连接失败，请检查网络', 'error');
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
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.USER.LOGIN, {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 login 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 login 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    async getUserInfo() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.USER.GET_INFO);
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 getUserInfo 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 getUserInfo 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    async updateUserInfo(userData) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.USER.UPDATE_INFO, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 updateUserInfo 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 updateUserInfo 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
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
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.POINTS.GET_BALANCE);
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 getPointsBalance 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 getPointsBalance 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
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
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 updatePoints 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 updatePoints 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    // 背包相关API方法
    async getBackpackItems() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.BACKPACK.GET_ITEMS);
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 getBackpackItems 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 getBackpackItems 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    async addBackpackItem(itemData) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.BACKPACK.ADD_ITEM, {
                method: 'POST',
                body: JSON.stringify(itemData)
            });
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 addBackpackItem 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 addBackpackItem 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    async useBackpackItem(itemId, quantity = 1) {
        try {
            const result = await this.request(`${API_CONFIG.ENDPOINTS.BACKPACK.USE_ITEM}/${itemId}`, {
                method: 'POST',
                body: JSON.stringify({ quantity })
            });
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 useBackpackItem 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 useBackpackItem 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    // 订单相关API方法
    async createOrder(orderData) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.ORDERS.CREATE, {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 createOrder 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 createOrder 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    async getUserOrders() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.ORDERS.GET_USER_ORDERS);
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 getUserOrders 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 getUserOrders 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    // 游戏相关API方法
    async playDiceGame(gameData) {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.GAMES.DICE_PLAY, {
                method: 'POST',
                body: JSON.stringify(gameData)
            });
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 playDiceGame 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 playDiceGame 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
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
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 playGrandmaGame 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 playGrandmaGame 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
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
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 buyDoll 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 buyDoll 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            throw error;
        }
    }
    
    // 通用API方法
    async healthCheck() {
        try {
            const result = await this.request(API_CONFIG.ENDPOINTS.COMMON.HEALTH_CHECK);
            return result;
        } catch (error) {
            // 🔧 401错误处理
            if (error.message.includes('401') || error.status === 401) {
                console.log('🔐 healthCheck 检测到401错误');
                this.handleAuthError();
                return { success: false, error: 'Authentication failed', status: 401 };
            }
            // 🔧 502错误处理
            if (error.message.includes('502') || error.status === 502) {
                console.log('🔧 healthCheck 检测到502错误');
                this.handle502Error();
                return { success: false, error: 'Server temporarily unavailable', status: 502 };
            }
            return { success: false, error: error.message };
        }
    }
}

// 创建全局API服务实例
window.apiService = new ApiService();

// 页面加载完成后强制启用云端模式
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.apiService.forceCloudMode();
    }, 100);
});
