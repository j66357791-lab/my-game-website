/**
 * API服务层 - 强制云端同步版
 */
class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
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
     * 通用请求方法 - 强制云端
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
     * 远程API请求 - 增强版
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
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // 检查响应格式
            if (data.code !== undefined && data.code !== API_CONFIG.STATUS_CODES.SUCCESS && data.code !== 200) {
                throw new Error(data.message || '云端请求失败');
            }
            
            console.log(`✅ 云端请求成功: ${endpoint}`);
            return data;
            
        } catch (error) {
            console.error(`❌ 云端API请求失败: ${endpoint}`, error);
            
            // 显示云端错误提示
            this.showCloudError(error);
            throw error;
        }
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

// 页面加载完成后强制启用云端模式
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.apiService.forceCloudMode();
    }, 100);
});
