/**
 * API接口配置文件 - 修复版
 */
const API_CONFIG = {
    // 智能环境检测
    isLocalhost: window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1',
    
    // 基础配置 - 自动切换
    BASE_URL: window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : 'https://my-game-backend.onrender.com/api',
    
    TIMEOUT: 10000,
    VERSION: '1.0.0',
    
    // 环境信息
    ENV: window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' ? 'development' : 'production',
    
    // 接口端点
    ENDPOINTS: {
        // 用户相关接口
        USER: {
            LOGIN: '/login',
            REGISTER: '/register',
            GET_INFO: '/user',
            UPDATE_INFO: '/user',
            LOGOUT: '/logout',
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
            GET_STATS: '/backpack/stats'
        },
        
        // 订单相关接口
        ORDERS: {
            GET_LIST: '/orders',
            CREATE: '/orders',
            GET_DETAIL: '/orders/:id',
            UPDATE_STATUS: '/orders/:id/status',
            CANCEL: '/orders/:id/cancel',
            GET_USER_ORDERS: '/orders/user'
        },
        
        // 游戏相关接口
        GAMES: {
            DICE_PLAY: '/games/dice/play',
            DICE_LEADERBOARD: '/games/dice/leaderboard',
            GRANDMA_PLAY: '/games/grandma/play',
            DOLL_BUY: '/games/doll/buy',
            DOLL_LIST: '/games/doll/list'
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
        ORDER_NOT_FOUND: 5001
    },
    
    // 便捷方法
    getUrl: function(endpoint) {
        return this.BASE_URL + endpoint;
    },
    
    // 检查环境
    isDevelopment: function() {
        return this.ENV === 'development';
    },
    
    // 获取完整API地址
    getFullUrl: function(path) {
        return this.BASE_URL + path;
    }
};

// 导出配置
window.API_CONFIG = API_CONFIG;

// 控制台提示 - 帮助调试
console.log(`🔧 API配置：环境: ${API_CONFIG.ENV}`);
console.log(`🌐 API配置：地址: ${API_CONFIG.BASE_URL}`);
console.log(`📱 API配置：域名: ${window.location.hostname}`);
console.log(`⚡ API配置：版本: ${API_CONFIG.VERSION}`);

// 开发环境额外提示
if (API_CONFIG.isDevelopment()) {
    console.log(`🛠️ API配置：开发模式已启用`);
    console.log(`📡 API配置：后端服务: ${API_CONFIG.BASE_URL}`);
}
