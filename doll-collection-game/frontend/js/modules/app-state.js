// 应用状态管理模块
const AppState = {
    // 全局状态
    currentUser: null,
    userDolls: [],
    allUsers: [],
    selectedDollsForSynthesis: [null, null],
    API_BASE: '',

    // 初始化应用状态
    init() {
        // 自动检测环境并设置API基础地址
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // 开发环境：localhost或127.0.0.1
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            this.API_BASE = 'http://localhost:3000/api';
        } else {
            // 生产环境：使用相对路径
            this.API_BASE = '/api';
        }
        
        console.log('🌐 API基础地址:', this.API_BASE);
        console.log('🚀 当前环境:', window.location.hostname);
    },

    // 更新状态
    updateState(updates) {
        Object.assign(this, updates);
        console.log('状态更新:', updates);
    },

    // 获取当前状态
    getState() {
        return {
            currentUser: this.currentUser,
            userDolls: this.userDolls,
            allUsers: this.allUsers,
            selectedDollsForSynthesis: this.selectedDollsForSynthesis,
            API_BASE: this.API_BASE
        };
    }
};

// 初始化应用状态
AppState.init();

// 导出到全局作用域
window.AppState = AppState;
