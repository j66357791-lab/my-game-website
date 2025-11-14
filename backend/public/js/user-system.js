/**
 * 用户系统模块 - 修复版
 */
class UserSystem {
    constructor() {
        this.userInfo = null;
        this.pointsDisplay = null;
        this.userName = null;
        this.userPoints = null;
        this.currentUser = null;
        this.isLoggedIn = false;
        this.init();
    }
    
    /**
     * 初始化用户系统
     */
    init() {
        console.log('用户系统：初始化开始');
        
        this.checkLoginStatus();
        this.findElements();
        this.bindEvents();
        this.updateUserInfo();
        this.initPointsSystem();
        this.initOrderSystem();
        this.startAutoUpdate();
        
        console.log('用户系统：初始化完成');
    }
    
    /**
     * 检查登录状态
     */
    checkLoginStatus() {
        this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const currentUser = localStorage.getItem('currentUser');
        
        if (!this.isLoggedIn || !currentUser) {
            console.log('用户系统：用户未登录');
            this.redirectToLogin();
            return false;
        }
        
        try {
            this.currentUser = JSON.parse(currentUser);
            if (!this.currentUser || !this.currentUser.name) {
                console.log('用户系统：用户数据格式错误');
                this.redirectToLogin();
                return false;
            }
        } catch (error) {
            console.error('用户系统：用户数据解析失败', error);
            this.redirectToLogin();
            return false;
        }
        
        return true;
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
        if (this.userInfo) {
            this.userInfo.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
            
            document.addEventListener('click', () => {
                this.closeDropdown();
            });
        }
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }
    
    /**
     * 初始化积分系统
     */
    initPointsSystem() {
        console.log('用户系统：初始化积分系统');
        
        if (window.pointsSystem) {
            // 订阅积分变动事件
            window.pointsSystem.subscribe((data) => {
                console.log('用户系统：积分系统订阅事件', data);
                this.updatePointsDisplay(data.newPoints);
            });
            
            // 监听积分更新事件
            window.addEventListener('pointsUpdated', (e) => {
                console.log('用户系统：积分更新事件', e.detail);
                this.updatePointsDisplay(e.detail.newPoints);
            });
            
            // 监听积分显示更新事件
            window.addEventListener('pointsDisplayUpdated', (e) => {
                console.log('用户系统：积分显示更新事件', e.detail);
                this.updatePointsDisplay(e.detail.points);
            });
            
            // 初始更新积分显示
            const currentPoints = window.pointsSystem.getPoints();
            this.updatePointsDisplay(currentPoints);
        } else {
            console.error('用户系统：积分系统未找到');
        }
    }
    
    /**
     * 初始化订单系统
     */
    initOrderSystem() {
        console.log('用户系统：初始化订单系统');
        this.loadOrders();
        this.initOrderNotifications();
    }
    
    /**
     * 加载订单数据
     */
    loadOrders() {
        const savedOrders = localStorage.getItem('userOrders');
        if (savedOrders) {
            try {
                this.orders = JSON.parse(savedOrders);
                console.log('用户系统：加载订单数据', this.orders.length, '条');
            } catch (error) {
                console.error('用户系统：加载订单数据失败', error);
                this.orders = [];
            }
        } else {
            this.orders = [];
        }
    }
    
    /**
     * 保存订单数据
     */
    saveOrders() {
        try {
            localStorage.setItem('userOrders', JSON.stringify(this.orders));
            console.log('用户系统：保存订单数据', this.orders.length, '条');
        } catch (error) {
            console.error('用户系统：保存订单数据失败', error);
        }
    }
    
    /**
     * 初始化订单通知
     */
    initOrderNotifications() {
        this.checkPendingOrders();
        
        setInterval(() => {
            this.checkPendingOrders();
        }, 30000);
    }
    
    /**
     * 检查待处理订单
     */
    checkPendingOrders() {
        const pendingOrders = this.orders.filter(order => 
            order.status === 'pending' || order.status === 'processing'
        );
        
        if (pendingOrders.length > 0) {
            console.log('用户系统：发现待处理订单', pendingOrders.length, '条');
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
    updateUserInfo() {
        if (!this.checkLoginStatus()) {
            return;
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
        
        this.dispatchEvent('userInfoUpdated', {
            user: this.currentUser,
            points: window.pointsSystem ? window.pointsSystem.getPoints() : (this.currentUser.points || 0)
        });
    }
    
    /**
     * 更新积分显示 - 修复版
     */
    updatePointsDisplay(points) {
        console.log('用户系统：更新积分显示', points);
        
        if (this.userPoints) {
            this.userPoints.textContent = points;
        }
        
        // 更新所有积分显示元素
        const allPointsElements = document.querySelectorAll('.user-points-display');
        allPointsElements.forEach(element => {
            element.textContent = points;
        });
        
        // 触发积分显示更新事件
        this.dispatchEvent('pointsDisplayUpdated', { points });
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
    createOrder(orderData) {
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
        this.saveOrders();
        
        // 使用数据适配器同步到后端
        if (window.dataAdapter) {
            window.dataAdapter.createOrder(order).catch(error => {
                console.error('用户系统：同步订单到后端失败', error);
            });
        }
        
        console.log('用户系统：创建订单', order);
        this.showMessage('success', '订单创建成功', `订单 ${order.id} 已创建`);
        
        return order;
    }
    
    /**
     * 更新订单状态
     */
    updateOrderStatus(orderId, status, note = '') {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            order.updatedAt = new Date().toISOString();
            if (note) {
                order.note = note;
            }
            
            this.saveOrders();
            
            // 使用数据适配器同步到后端
            if (window.dataAdapter) {
                window.dataAdapter.updateOrderStatus(orderId, { status }).catch(error => {
                    console.error('用户系统：同步订单状态到后端失败', error);
                });
            }
            
            console.log('用户系统：更新订单状态', { orderId, status, note });
            this.showMessage('info', '订单状态更新', `订单 ${orderId} 状态已更新为: ${status}`);
            
            return true;
        }
        return false;
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
            // 使用数据适配器退出登录
            if (window.dataAdapter) {
                await window.dataAdapter.logout();
            } else {
                // 备用方案
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('currentUser');
            }
            
            this.showMessage('info', '退出登录', '您已成功退出登录');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } catch (error) {
            console.error('用户系统：退出登录失败', error);
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
     * 重定向到登录页面
     */
    redirectToLogin() {
        window.location.href = 'login.html';
    }
    
    /**
     * 开始自动更新
     */
    startAutoUpdate() {
        setInterval(() => {
            this.updateUserInfo();
        }, 5000);
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
    console.log('用户系统：页面加载完成');
    
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
