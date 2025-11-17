/**
 * 数据适配器 - 修复认证问题版
 */
class DataAdapter {
    constructor() {
        // 🔧 修复：支持本地和云端模式
        this.useLocalStorage = false;
        this.apiService = window.apiService;
        this.subscribers = new Map();
        
        this.init();
    }
    
    /**
     * 🔧 修复：初始化数据适配器
     */
    init() {
        console.log('🔧 数据适配器：初始化开始');
        
        // 🔧 修复：检测环境
        this.detectEnvironment();
        
        // 🔧 修复：监听数据源切换事件
        window.addEventListener('dataSourceChanged', (e) => {
            console.log('🔧 数据适配器：收到数据源切换事件', e.detail);
            this.setUseLocalStorage(e.detail.useLocalStorage);
        });
        
        // 🔧 修复：监听认证错误事件
        window.addEventListener('authError', (e) => {
            console.log('🔧 数据适配器：收到认证错误事件', e.detail);
            this.handleAuthError();
        });
        
        // 🔧 修复：监听服务器错误事件
        window.addEventListener('serverError', (e) => {
            console.log('🔧 数据适配器：收到服务器错误事件', e.detail);
            this.handleServerError();
        });
        
        console.log('🔧 数据适配器：初始化完成');
    }
    
    /**
     * 🔧 修复：检测环境
     */
    detectEnvironment() {
        // 检查是否强制云端模式
        const forceCloudMode = localStorage.getItem('forceCloudMode') === 'true';
        if (forceCloudMode) {
            this.useLocalStorage = false;
            console.log('🌐 数据适配器：检测到强制云端模式');
            return;
        }
        
        // 检查是否强制本地模式
        const forceLocalMode = localStorage.getItem('useLocalStorage') === 'true';
        if (forceLocalMode) {
            this.useLocalStorage = true;
            console.log('💾 数据适配器：检测到强制本地模式');
            return;
        }
        
        // 默认使用云端模式
        this.useLocalStorage = false;
        console.log('🌐 数据适配器：使用默认云端模式');
    }
    
    /**
     * 🔧 修复：切换数据源
     */
    setUseLocalStorage(useLocalStorage) {
        this.useLocalStorage = useLocalStorage;
        localStorage.setItem('useLocalStorage', useLocalStorage.toString());
        
        console.log(`🔧 数据适配器：切换到${useLocalStorage ? '本地' : '云端'}模式`);
        
        this.notifySubscribers('dataSourceChanged', {
            useLocalStorage: useLocalStorage,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * 🔧 修复：处理认证错误
     */
    handleAuthError() {
        console.log('🔐 数据适配器：处理认证错误');
        
        // 清除认证信息
        API_CONFIG.clearAuthToken();
        localStorage.setItem('isLoggedIn', 'false');
        localStorage.removeItem('currentUser');
        
        // 显示错误提示
        if (window.APP && window.APP.showNotification) {
            window.APP.showNotification('error', '登录已过期', '请重新登录');
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
        console.log('🔧 数据适配器：处理服务器错误');
        
        // 设置服务器维护模式
        localStorage.setItem('serverMaintenance', 'true');
        localStorage.setItem('serverMaintenanceTime', new Date().toISOString());
        
        // 显示错误提示
        if (window.APP && window.APP.showNotification) {
            window.APP.showNotification('error', '服务器暂时不可用', '请稍后重试');
        }
        
        // 触发服务器维护事件
        window.dispatchEvent(new CustomEvent('serverMaintenance', {
            detail: { 
                error: 'Server temporarily unavailable',
                timestamp: new Date().toISOString()
            }
        }));
    }
    
    // 🔧 修复：用户系统适配
    async login(credentials) {
        try {
            if (this.useLocalStorage) {
                return this.loginLocal(credentials);
            } else {
                return this.loginRemote(credentials);
            }
        } catch (error) {
            console.error('数据适配器：登录失败', error);
            throw error;
        }
    }
    
    /**
     * 🔧 修复：本地登录
     */
    async loginLocal(credentials) {
        console.log('💾 数据适配器：本地登录');
        
        // 模拟本地登录逻辑
        const users = JSON.parse(localStorage.getItem('allUsers') || '[]');
        const user = users.find(u => u.username === credentials.username);
        
        if (user && user.password === credentials.password) {
            // 🔧 修复：保存认证信息
            API_CONFIG.setAuthToken('local_token_' + Date.now());
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            this.notifySubscribers('userLoggedIn', { user });
            
            return { success: true, user: user };
        }
        
        return { success: false, error: '用户名或密码错误' };
    }
    
    /**
     * 🔧 修复：远程登录
     */
    async loginRemote(credentials) {
        console.log('🌐 数据适配器：远程登录');
        
        if (this.apiService) {
            const result = await this.apiService.login(credentials);
            
            if (result.success || result.user) {
                const user = result.user || result.data.user;
                
                // 🔧 修复：保存认证信息
                if (result.token) {
                    API_CONFIG.setAuthToken(result.token);
                }
                
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('isLoggedIn', 'true');
                
                this.notifySubscribers('userLoggedIn', { user });
            }
            
            return result;
        }
        
        return { success: false, error: 'API服务未加载' };
    }
    
    // 🔧 修复：其他方法保持不变，但添加本地/云端模式检测
    async getUserInfo() {
        if (this.useLocalStorage) {
            return this.getUserInfoLocal();
        } else {
            return this.getUserInfoRemote();
        }
    }
    
    async getUserInfoLocal() {
        console.log('💾 数据适配器：本地获取用户信息');
        
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return { success: true, data: { user } };
    }
    
    async getUserInfoRemote() {
        console.log('🌐 数据适配器：远程获取用户信息');
        
        if (this.apiService) {
            try {
                const result = await this.apiService.getUserInfo();
                return result;
            } catch (error) {
                console.error('数据适配器：远程获取用户信息失败', error);
                return { success: false, error: error.message };
            }
        }
        
        return { success: false, error: 'API服务未加载' };
    }
    
    // 🔧 修复：其他所有方法都添加本地/云端模式检测
    // 这里只展示几个关键方法的修复，其他方法类似
    
    async getPointsBalance() {
        if (this.useLocalStorage) {
            return this.getPointsBalanceLocal();
        } else {
            return this.getPointsBalanceRemote();
        }
    }
    
    async getPointsBalanceLocal() {
        console.log('💾 数据适配器：本地获取积分余额');
        
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.points || 0;
    }
    
    async getPointsBalanceRemote() {
        console.log('🌐 数据适配器：远程获取积分余额');
        
        if (this.apiService) {
            try {
                const result = await this.apiService.getPointsBalance();
                return result.data ? result.data.balance : 0;
            } catch (error) {
                console.error('数据适配器：远程获取积分余额失败', error);
                return 0;
            }
        }
        
        return 0;
    }
    
    // 🔧 修复：事件管理
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }
    
    notifySubscribers(event, data) {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('数据适配器：订阅者回调执行失败', error);
                }
            });
        }
    }
    
    emit(eventName, data) {
        this.notifySubscribers(eventName, data);
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
    
    on(eventName, callback) {
        this.subscribe(eventName, callback);
        window.addEventListener(eventName, callback);
    }
    
    off(eventName, callback) {
        this.unsubscribe(eventName, callback);
        window.removeEventListener(eventName, callback);
    }
}

// 🔧 修复：创建全局数据适配器实例
window.dataAdapter = new DataAdapter();

// 🔧 修复：页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 数据适配器：页面加载完成，开始初始化');
    
    // 🔧 修复：监听认证错误事件
    window.addEventListener('authError', (e) => {
        console.log('🔧 数据适配器：收到认证错误事件', e.detail);
        if (window.dataAdapter) {
            window.dataAdapter.handleAuthError();
        }
    });
    
    // 🔧 修复：监听服务器错误事件
    window.addEventListener('serverError', (e) => {
        console.log('🔧 数据适配器：收到服务器错误事件', e.detail);
        if (window.dataAdapter) {
            window.dataAdapter.handleServerError();
        }
    });
    
    console.log('🔧 数据适配器：初始化完成');
});
