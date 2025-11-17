/**
 * API接口配置文件 - 修复认证问题版
 */
const API_CONFIG = {
    // 🔧 修复：支持本地和云端模式
    BASE_URL: 'https://tianchuang.onrender.com/api',
    
    TIMEOUT: 15000,
    VERSION: '1.0.0',
    
    // 🔧 修复：动态环境检测
    ENV: 'production',
    
    // 接口端点 - 修复认证问题
    ENDPOINTS: {
        // 用户相关接口
        USER: {
            LOGIN: '/login',
            REGISTER: '/register',
            GET_INFO: '/user',
            UPDATE_INFO: '/user',
            LOGOUT: '/logout',
            SYNC: '/user/sync', // 🔧 添加同步端点
            GET_ALL: '/users',
            UPDATE_POINTS: '/user/points',
            GET_HISTORY: '/user/points/history',
            GET_STATS: '/user/stats'
        },
        
        // 积分相关接口
        POINTS: {
            GET_BALANCE: '/points/balance',
            GET_HISTORY: '/points/history',
            UPDATE_POINTS: '/points/update',
            SYNC: '/points/sync', // 🔧 添加同步端点
            GET_DASHBOARD: '/points/dashboard',
            GET_AUDIT_LOG: '/points/audit-log',
            GET_STATISTICS: '/points/statistics'
        },
        
        // 背包相关接口
        BACKPACK: {
            GET_ITEMS: '/backpack/items',
            ADD_ITEM: '/backpack/items',
            USE_ITEM: '/backpack/items/use',
            DELETE_ITEM: '/backpack/items/:id',
            GET_STATS: '/backpack/stats',
            SYNC: '/backpack/sync' // 🔧 添加同步端点
        },
        
        // 订单相关接口
        ORDERS: {
            GET_LIST: '/orders',
            CREATE: '/orders',
            GET_DETAIL: '/orders/:id',
            UPDATE_STATUS: '/orders/:id/status',
            CANCEL: '/orders/:id/cancel',
            GET_USER_ORDERS: '/orders/user',
            SYNC: '/orders/sync' // 🔧 添加同步端点
        },
        
        // 游戏相关接口
        GAMES: {
            DICE_PLAY: '/games/dice/new',
            DICE_LEADERBOARD: '/games/dice/leaderboard',
            GRANDMA_PLAY: '/games/grandma/play',
            DOLL_BUY: '/dolls/buy',
            DOLL_LIST: '/dolls'
        },
        
        // 通用接口
        COMMON: {
            HEALTH_CHECK: '/health',
            VERSION: '/version'
        }
    },
    
    // HTTP状态码
    STATUS_CODES: {
        SUCCESS: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_ERROR: 500
    },
    
    // 业务错误码
    ERROR_CODES: {
        UNKNOWN_ERROR: 1000,
        INVALID_PARAMS: 1001,
        NETWORK_ERROR: 1002,
        USER_NOT_FOUND: 2001,
        INVALID_CREDENTIALS: 2002,
        INSUFFICIENT_POINTS: 3001,
        ITEM_NOT_FOUND: 4001,
        ORDER_NOT_FOUND: 5001,
        AUTH_FAILED: 2003, // 🔧 添加认证失败错误码
        SERVER_UNAVAILABLE: 2004 // 🔧 添加服务器不可用错误码
    },
    
    // 🔧 修复：认证Token管理
    getAuthToken: function() {
        // 尝试多种方式获取token
        let token = localStorage.getItem('authToken');
        
        if (!token) {
            // 从用户数据中获取
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                const user = JSON.parse(currentUser);
                token = user.token;
            }
        }
        
        if (!token) {
            // 从URL参数中获取
            const urlParams = new URLSearchParams(window.location.search);
            token = urlParams.get('token');
        }
        
        console.log('🔑 API配置：获取到的Token:', token ? '有效' : '无效');
        return token || '';
    },
    
    // 🔧 修复：设置认证Token
    setAuthToken: function(token) {
        localStorage.setItem('authToken', token);
        
        // 同时保存到用户数据中
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            user.token = token;
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    },
    
    // 🔧 修复：清除认证Token
    clearAuthToken: function() {
        localStorage.removeItem('authToken');
        
        // 同时从用户数据中清除
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            delete user.token;
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    },
    
    // 🔧 修复：检查Token有效性
    isTokenValid: function() {
        const token = this.getAuthToken();
        if (!token) return false;
        
        // 检查token是否过期
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
            console.log('🔐 API配置：Token已过期');
            return false;
        }
        
        return true;
    },
    
    // 便捷方法
    getUrl: function(endpoint) {
        return this.BASE_URL + endpoint;
    },
    
    // 🔧 修复：动态检测环境
    isDevelopment: function() {
        // 检查是否强制云端模式
        const forceCloudMode = localStorage.getItem('forceCloudMode') === 'true';
        if (forceCloudMode) {
            return false;
        }
        
        // 检查是否强制本地模式
        const forceLocalMode = localStorage.getItem('useLocalStorage') === 'true';
        if (forceLocalMode) {
            return true;
        }
        
        // 默认使用云端模式
        return false;
    },
    
    // 🔧 修复：获取完整API地址
    getFullUrl: function(path) {
        return this.BASE_URL + path;
    },
    
    // 🔧 修复：安全请求包装器
    safeRequest: async function(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json'
            },
            ...options
        };
        
        // 🔧 添加认证头
        const token = this.getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(this.getFullUrl(endpoint), config);
            
            // 🔧 处理认证错误
            if (response.status === 401 || response.status === 403) {
                console.log('🔐 API配置：认证失败，清除token');
                this.clearAuthToken();
                
                // 触发认证错误事件
                window.dispatchEvent(new CustomEvent('authError', {
                    detail: { 
                        status: response.status,
                        endpoint: endpoint
                    }
                }));
                
                throw new Error(`Authentication failed: ${response.status}`);
            }
            
            // 🔧 处理服务器错误
            if (response.status === 502 || response.status === 503) {
                console.log('🔧 API配置：服务器不可用');
                
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
            
            // 🔧 检查响应是否为HTML
            if (responseText.trim().startsWith('<')) {
                console.log('🔧 API配置：服务器返回HTML错误页面');
                throw new Error(`Server returned HTML error page`);
            }
            
            // 🔧 安全的JSON解析
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.log('🔧 API配置：JSON解析失败');
                throw new Error(`Invalid JSON response`);
            }
            
            return data;
            
        } catch (error) {
            console.error('API配置：请求失败', error);
            throw error;
        }
    }
};

// 🔧 修复：导出配置
window.API_CONFIG = API_CONFIG;

// 🔧 修复：控制台提示
console.log(`🔧 API配置：修复版本`);
console.log(`🔗 API配置：地址: ${API_CONFIG.BASE_URL}`);
console.log(`📱 API配置：域名: tianchuang.onrender.com`);
console.log(`⚡ API配置：版本: ${API_CONFIG.VERSION}`);
console.log(`🔧 API配置：认证Token: ${API_CONFIG.getAuthToken() ? '有效' : '无效'}`);
console.log(`🌐 API配置：环境: ${API_CONFIG.isDevelopment() ? '开发' : '生产'}`);
