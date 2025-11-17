/**
 * 用户系统模块 - 修复认证问题版
 */
class UserSystem {
    constructor() {
        this.userInfo = null;
        this.pointsDisplay = null;
        this.userName = null;
        this.userPoints = null;
        this.currentUser = null;
        this.isLoggedIn = false;
        this.autoUpdateTimer = null;
        this.orderNotificationTimer = null;
        this.orders = [];
        
        // 防止循环调用的标志
        this.isUpdatingPoints = false;
        this.lastPointsUpdate = 0;
        
        // 云端同步相关
        this.syncEnabled = false; // 🔧 临时禁用同步，避免403错误
        this.syncInterval = 30000; // 30秒
        this.syncTimer = null;
        this.lastSyncTime = localStorage.getItem('lastSyncTime') || null;
        this.isSyncing = false;
        
        this.init();
    }
    
    /**
     * 初始化用户系统 - 修复认证问题版
     */
    init() {
        console.log('🌐 用户系统：初始化开始（本地模式）');
        
        // 检查登录状态
        if (!this.checkLoginStatus()) {
            console.log('🌐 用户系统：用户未登录，跳转到登录页面');
            this.redirectToLogin();
            return;
        }
        
        this.findElements();
        this.bindEvents();
        this.updateUserInfo();
        this.initPointsSystem();
        this.initOrderSystem();
        
        // 🔧 临时禁用云端同步，避免403错误
        // this.startCloudSync();
        
        console.log('✅ 用户系统：初始化完成（本地模式）');
    }
    
    /**
     * 🔧 获取认证Token - 修复认证问题
     */
    getAuthToken() {
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
        
        console.log('🔑 获取到的Token:', token ? '有效' : '无效');
        return token || '';
    }
    
    /**
     * 安全的登录状态检查
     */
    checkLoginStatus() {
        try {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const currentUser = localStorage.getItem('currentUser');
            
            if (!isLoggedIn || !currentUser) {
                return false;
            }
            
            let user = null;
            try {
                user = JSON.parse(currentUser);
            } catch (e) {
                console.error('解析用户数据失败:', e);
                return false;
            }
            
            // 验证用户数据
            if (!user || typeof user !== 'object') {
                return false;
            }
            
            if (!user.isActive) {
                return false;
            }
            
            // 检查token是否过期
            const tokenExpiry = localStorage.getItem('tokenExpiry');
            if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
                console.log('🔐 Token已过期');
                this.handleAuthError();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('检查登录状态失败:', error);
            return false;
        }
    }
    
    /**
     * 🔧 处理认证错误 - 修复认证问题
     */
    handleAuthError() {
        console.log('🔐 处理认证错误');
        
        // 清除认证信息
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.setItem('isLoggedIn', 'false');
        localStorage.removeItem('currentUser');
        
        // 停止所有进行中的请求
        if (window.apiService && window.apiService.abortController) {
            window.apiService.abortController.abort();
        }
        
        // 停止所有定时器
        if (this.autoUpdateTimer) {
            clearInterval(this.autoUpdateTimer);
            this.autoUpdateTimer = null;
        }
        
        if (this.orderNotificationTimer) {
            clearInterval(this.orderNotificationTimer);
            this.orderNotificationTimer = null;
        }
        
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
        
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
     * 🔧 安全的跳转到登录页面
     */
    redirectToLogin() {
        try {
            console.log('🔐 正在跳转到登录页面...');
            
            // 防止无限循环跳转
            const currentUrl = window.location.href;
            const targetUrl = 'login.html';
            
            if (!currentUrl.includes(targetUrl)) {
                window.location.href = targetUrl;
            } else {
                console.log('⚠️ 已在登录页面，避免循环跳转');
            }
        } catch (error) {
            console.error('跳转失败:', error);
            // 备用跳转方式，避免无限循环
            setTimeout(() => {
                if (!window.location.href.includes('login.html')) {
                    window.location.href = 'login.html';
                }
            }, 100);
        }
    }
    
    /**
     * 查找DOM元素
     */
    findElements() {
        this.userInfo = document.getElementById('userInfo');
        this.pointsDisplay = document.getElementById('userPoints');
        this.userName = document.getElementById('userName');
        this.userPoints = document.getElementById('userPoints');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        try {
            // 用户下拉菜单
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                // 移除现有事件监听器
                const newUserInfo = userInfo.cloneNode(true);
                userInfo.parentNode.replaceChild(newUserInfo, userInfo);
                
                newUserInfo.addEventListener('click', (e) => {
                    e.stopPropagation();
                    newUserInfo.classList.toggle('active');
                });
                
                // 点击其他地方关闭用户下拉菜单
                document.addEventListener('click', () => {
                    newUserInfo.classList.remove('active');
                });
            }
            
            // 退出登录
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                const newLogoutBtn = logoutBtn.cloneNode(true);
                logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
                
                newLogoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        } catch (error) {
            console.error('绑定事件失败:', error);
        }
    }
    
    /**
     * 初始化积分系统
     */
    initPointsSystem() {
        console.log('🌐 用户系统：初始化积分系统');
        
        if (window.pointsSystem) {
            // 防止循环调用，只订阅一次
            if (!this.pointsSystemSubscribed) {
                // 订阅积分变动事件
                window.pointsSystem.subscribe((data) => {
                    console.log('🌐 用户系统：积分系统订阅事件', data);
                    this.updatePointsDisplay(data.newPoints);
                });
                
                // 监听积分更新事件
                window.addEventListener('pointsUpdated', (e) => {
                    console.log('🌐 用户系统：积分更新事件', e.detail);
                    this.updatePointsDisplay(e.detail.newPoints);
                    
                    // 🔧 临时禁用云端同步，避免403错误
                    // this.syncPointsData();
                });
                
                this.pointsSystemSubscribed = true;
            }
            
            // 初始更新积分显示
            const currentPoints = window.pointsSystem.getPoints();
            this.updatePointsDisplay(currentPoints);
        } else {
            console.error('🌐 用户系统：积分系统未找到');
        }
    }
    
    /**
     * 初始化订单系统
     */
    async initOrderSystem() {
        console.log('🌐 用户系统：初始化订单系统');
        await this.loadOrders();
        this.initOrderNotifications();
    }
    
    /**
     * 加载订单数据
     */
    async loadOrders() {
        try {
            // 检查服务器维护状态
            const serverMaintenance = localStorage.getItem('serverMaintenance');
            if (serverMaintenance === 'true') {
                console.log('🔧 服务器维护中，使用本地数据');
                const savedOrders = localStorage.getItem('userOrders');
                if (savedOrders) {
                    try {
                        this.orders = JSON.parse(savedOrders);
                        console.log('⚠️ 用户系统：降级使用本地订单数据', this.orders.length, '条');
                    } catch (error) {
                        console.error('🌐 用户系统：加载订单数据失败', error);
                        this.orders = [];
                    }
                } else {
                    this.orders = [];
                }
                return;
            }
            
            // 🔧 临时禁用云端加载，避免403错误
            // 强制从云端加载
            if (this.forceCloudMode && window.dataAdapter) {
                try {
                    const result = await window.dataAdapter.getUserOrders();
                    if (result.success && result.data) {
                        this.orders = result.data.orders || [];
                        console.log('🌐 用户系统：从云端加载订单数据', this.orders.length, '条');
                        localStorage.setItem('userOrders', JSON.stringify(this.orders));
                        return;
                    }
                } catch (cloudError) {
                    console.error('🌐 用户系统：云端加载订单失败', cloudError);
                }
            }
            
            // 降级到本地数据
            const savedOrders = localStorage.getItem('userOrders');
            if (savedOrders) {
                try {
                    this.orders = JSON.parse(savedOrders);
                    console.log('⚠️ 用户系统：降级使用本地订单数据', this.orders.length, '条');
                } catch (error) {
                    console.error('🌐 用户系统：加载订单数据失败', error);
                    this.orders = [];
                }
            } else {
                this.orders = [];
            }
        } catch (error) {
            console.error('🌐 用户系统：加载订单数据失败', error);
            this.orders = [];
        }
    }
    
    /**
     * 初始化订单通知
     */
    initOrderNotifications() {
        this.checkPendingOrders();
        
        // 安全的定时器，避免无限循环
        if (this.orderNotificationTimer) {
            clearInterval(this.orderNotificationTimer);
        }
        
        this.orderNotificationTimer = setInterval(() => {
            this.checkPendingOrders();
        }, 30000); // 30秒检查一次
    }
    
    /**
     * 检查待处理订单
     */
    checkPendingOrders() {
        if (!this.orders) return;
        
        const pendingOrders = this.orders.filter(order => 
            order.status === 'pending' || order.status === 'processing'
        );
        
        if (pendingOrders.length > 0) {
            console.log('🌐 用户系统：发现待处理订单', pendingOrders.length, '条');
            this.showOrderNotification(pendingOrders);
        }
    }
    
    /**
     * 显示订单通知
     */
    showOrderNotification(orders) {
        const notification = document.createElement('div');
        notification.className = 'order-notification';
        notification.innerHTML = `
            <div class="notification-header">
                <i class="fas fa-shopping-cart"></i>
                <span>订单提醒</span>
            </div>
            <div class="notification-content">
                您有 ${orders.length} 个订单待处理
            </div>
            <div class="notification-actions">
                <button onclick="window.userSystem.viewOrders()">查看订单</button>
                <button onclick="this.parentElement.parentElement.remove()">稍后处理</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FF69B4, #FF1493);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 250px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    /**
     * 切换下拉菜单
     */
    toggleDropdown() {
        if (this.userInfo) {
            this.userInfo.classList.toggle('active');
        }
    }
    
    /**
     * 关闭下拉菜单
     */
    closeDropdown() {
        if (this.userInfo) {
            this.userInfo.classList.remove('active');
        }
    }
    
    /**
     * 更新用户信息
     */
    async updateUserInfo() {
        try {
            // 安全的登录状态检查
            if (!this.checkLoginStatus()) {
                return;
            }
            
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                this.currentUser = JSON.parse(currentUser);
            }
            
            if (this.userName) {
                this.userName.textContent = this.currentUser.name || '未知用户';
            }
            
            if (window.pointsSystem) {
                const points = window.pointsSystem.getPoints();
                this.updatePointsDisplay(points);
            } else {
                if (this.userPoints) {
                    this.userPoints.textContent = this.currentUser.points || 0;
                }
            }
            
            // 触发用户信息更新事件
            window.dispatchEvent(new CustomEvent('userInfoUpdated', {
                detail: {
                    user: this.currentUser,
                    points: window.pointsSystem ? window.pointsSystem.getPoints() : (this.currentUser.points || 0)
                }
            }));
        } catch (error) {
            console.error('更新用户信息失败:', error);
        }
    }
    
    /**
     * 🔧 更新积分显示 - 修复循环调用版
     */
    updatePointsDisplay(points) {
        // 防止循环调用
        const now = Date.now();
        if (this.isUpdatingPoints || (now - this.lastPointsUpdate) < 100) {
            console.log('🔧 防止循环调用 updatePointsDisplay');
            return;
        }
        
        this.isUpdatingPoints = true;
        this.lastPointsUpdate = now;
        
        try {
            console.log('🌐 用户系统：更新积分显示', points);
            
            if (this.userPoints) {
                this.userPoints.textContent = points;
            }
            
            // 更新所有积分显示元素
            const allPointsElements = document.querySelectorAll('.user-points-display');
            allPointsElements.forEach(element => {
                element.textContent = points;
            });
            
        } catch (error) {
            console.error('🔧 更新积分显示失败:', error);
        } finally {
            // 延迟重置标志，防止快速连续调用
            setTimeout(() => {
                this.isUpdatingPoints = false;
            }, 200);
        }
    }
    
    /**
     * 打开用户中心
     */
    openUserCenter() {
        window.location.href = 'user-center.html';
    }
    
    /**
     * 查看订单
     */
    viewOrders() {
        window.location.href = 'user-center.html?tab=orders';
    }
    
    /**
     * 创建订单
     */
    async createOrder(orderData) {
        try {
            const order = {
                id: 'ORDER' + Date.now(),
                userId: this.currentUser.id,
                username: this.currentUser.name,
                ...orderData,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            this.orders.unshift(order);
            
            // 保存到本地
            localStorage.setItem('userOrders', JSON.stringify(this.orders));
            
            // 🔧 临时禁用云端同步，避免403错误
            // 同步到云端
            // this.syncOrdersData();
            
            console.log('🌐 用户系统：创建订单', order);
            this.showMessage('success', '订单创建成功', `订单 ${order.id} 已创建`);
            
            return order;
        } catch (error) {
            console.error('🌐 用户系统：创建订单失败', error);
            this.showMessage('error', '订单创建失败', error.message);
            return null;
        }
    }
    
    /**
     * 更新订单状态
     */
    async updateOrderStatus(orderId, status, note = '') {
        try {
            const order = this.orders.find(o => o.id === orderId);
            if (order) {
                order.status = status;
                order.updatedAt = new Date().toISOString();
                if (note) {
                    order.note = note;
                }
                
                // 保存到本地
                localStorage.setItem('userOrders', JSON.stringify(this.orders));
                
                // 🔧 临时禁用云端同步，避免403错误
                // 同步到云端
                // this.syncOrdersData();
                
                console.log('🌐 用户系统：更新订单状态', { orderId, status, note });
                this.showMessage('info', '订单状态更新', `订单 ${orderId} 状态已更新为: ${status}`);
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('🌐 用户系统：更新订单状态失败', error);
            this.showMessage('error', '订单状态更新失败', error.message);
            return false;
        }
    }
    
    /**
     * 获取用户订单
     */
    getUserOrders(status = null) {
        if (status) {
            return this.orders.filter(order => order.status === status);
        }
        return this.orders;
    }
    
    /**
     * 获取用户统计
     */
    getUserStats() {
        const stats = {
            totalOrders: this.orders.length,
            pendingOrders: this.orders.filter(o => o.status === 'pending').length,
            processingOrders: this.orders.filter(o => o.status === 'processing').length,
            completedOrders: this.orders.filter(o => o.status === 'completed').length,
            cancelledOrders: this.orders.filter(o => o.status === 'cancelled').length,
            totalSpent: this.calculateTotalSpent(),
            currentPoints: window.pointsSystem ? window.pointsSystem.getPoints() : (this.currentUser.points || 0)
        };
        
        return stats;
    }
    
    /**
     * 计算总消费
     */
    calculateTotalSpent() {
        return this.orders
            .filter(order => order.status === 'completed')
            .reduce((total, order) => total + (order.totalAmount || 0), 0);
    }
    
    /**
     * 退出登录
     */
    async logout() {
        try {
            // 停止所有定时器
            if (this.autoUpdateTimer) {
                clearInterval(this.autoUpdateTimer);
                this.autoUpdateTimer = null;
            }
            
            if (this.orderNotificationTimer) {
                clearInterval(this.orderNotificationTimer);
                this.orderNotificationTimer = null;
            }
            
            if (this.syncTimer) {
                clearInterval(this.syncTimer);
                this.syncTimer = null;
            }
            
            // 重置循环调用标志
            this.isUpdatingPoints = false;
            this.lastPointsUpdate = 0;
            
            // 使用数据适配器退出登录
            if (window.dataAdapter) {
                await window.dataAdapter.logout();
            } else {
                // 备用方案
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                localStorage.removeItem('tokenExpiry');
            }
            
            this.showMessage('info', '退出登录', '您已成功退出登录');
            
            // 安全的跳转
            setTimeout(() => {
                if (!window.location.href.includes('login.html')) {
                    window.location.href = 'login.html';
                }
            }, 1000);
        } catch (error) {
            console.error('退出登录失败:', error);
        }
    }
    
    /**
     * 显示消息
     */
    showMessage(text, type, description = '') {
        const existingMessage = document.querySelector('.user-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const message = document.createElement('div');
        message.className = `user-message ${type}`;
        message.innerHTML = `
            <div class="message-content">
                <div class="message-text">${text}</div>
                ${description ? `<div class="message-description">${description}</div>` : ''}
            </div>
        `;
        
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 350px;
            backdrop-filter: blur(10px);
        `;
        
        const colors = {
            success: 'linear-gradient(135deg, #28a745, #20c997)',
            error: 'linear-gradient(135deg, #dc3545, #c82333)',
            info: 'linear-gradient(135deg, #17a2b8, #138496)',
            warning: 'linear-gradient(135deg, #ffc107, #e0a800)'
        };
        
        message.style.background = colors[type] || colors.info;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
    }
    
    /**
     * 🔧 安全的自动更新
     */
    startSafeAutoUpdate() {
        // 清除现有定时器
        if (this.autoUpdateTimer) {
            clearInterval(this.autoUpdateTimer);
        }
        
        // 设置较长的更新间隔，避免频繁请求
        this.autoUpdateTimer = setInterval(() => {
            if (!this.checkLoginStatus()) {
                console.log('🔐 自动检测到登录状态失效');
                this.logout();
            }
        }, 120000); // 2分钟检查一次
    }
    
    /**
     * 触发自定义事件
     */
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }
    
    /**
     * 监听自定义事件
     */
    on(eventName, callback) {
        document.addEventListener(eventName, callback);
    }
    
    /**
     * 移除自定义事件监听
     */
    off(eventName, callback) {
        document.removeEventListener(eventName, callback);
    }
}

// 创建全局实例
window.userSystem = new UserSystem();

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 用户系统：页面加载完成（本地模式）');
    
    // 延迟初始化，确保DOM完全加载
    setTimeout(() => {
        if (!window.userSystem.isLoggedIn) {
            window.userSystem.init();
        }
    }, 100);
});

// 添加CSS样式
const userSystemStyles = `
    .user-message {
        animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .order-notification {
        font-family: 'Noto Sans SC', sans-serif;
    }
    
    .notification-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-weight: bold;
    }
    
    .notification-content {
        margin-bottom: 15px;
        line-height: 1.4;
    }
    
    .notification-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }
    
    .notification-actions button {
        padding: 8px 15px;
        border: none;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.3s ease;
    }
    
    .notification-actions button:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    
    .user-points-display {
        font-weight: bold;
        color: #FFA500;
    }
`;

// 动态添加样式
const styleSheet = document.createElement('style');
styleSheet.textContent = userSystemStyles;
document.head.appendChild(styleSheet);
