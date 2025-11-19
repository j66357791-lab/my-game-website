// 配置文件 - 云端部署版本
const CONFIG = {
    // 🔧 云端API配置
    API_BASE: 'https://tianchuang.onrender.com/api',
    
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
