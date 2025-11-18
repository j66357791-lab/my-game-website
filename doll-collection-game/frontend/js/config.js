// 配置文件
const CONFIG = {
    // API配置 - 修复版本
    API_BASE: getApiBase(),
    
    // 转增设置
    TRANSFER_SETTINGS: {
        userFeeRate: 5, // 普通用户手续费率 (%)
        merchantBonusRate: 1, // 商人奖励率 (%)
        baseBonusRate: 1 // 基础奖励率 (%)
    },
    
    // 娃娃价格
    DOLL_PRICES: {
        1: 50,
        2: 200,
        3: 500
    },
    
    // 动画设置
    ANIMATION_DURATION: 3000,
    DEBOUNCE_DELAY: 500
};

// 自动检测环境并设置API基础地址 - 修复版本
function getApiBase() {
    // 检查是否在本地开发环境
    const isLocalDevelopment = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1' ||
                                  window.location.hostname === '0.0.0.0' ||
                                  window.location.port === '3000' ||
                                  window.location.protocol === 'http:';
    
    console.log('🌐 环境检测:', {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        port: window.location.port,
        isLocalDevelopment: isLocalDevelopment
    });
    
    // 开发环境：使用localhost
    if (isLocalDevelopment) {
        return 'http://localhost:3000/api';
    }
    
    // 生产环境：使用相对路径
    return '/api';
}

// 全局变量
let currentUser = null;
let userDolls = [];
let allUsers = [];
let selectedDollsForSynthesis = [null, null];
let autoIncomeTimer = null;
let lastPayoutTime = null;
let selectedRecipient = null;

// 导出配置
window.CONFIG = CONFIG;
window.currentUser = currentUser;
window.userDolls = userDolls;
window.allUsers = allUsers;
window.selectedDollsForSynthesis = selectedDollsForSynthesis;
window.autoIncomeTimer = autoIncomeTimer;
window.lastPayoutTime = lastPayoutTime;
window.selectedRecipient = selectedRecipient;
