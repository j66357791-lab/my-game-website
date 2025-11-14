/**
 * 用户系统模块 - 集成数据适配器版本
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
        console.log('=== 用户系统初始化 ===');
        this.checkLoginStatus();
        this.findElements();
        this.bindEvents();
        this.updateUserInfo();
        this.initPointsSystem();
        this.initOrderSystem();
        this.initRealtimeEvents(); // 🌟 新增：初始化实时事件
        this.startAutoUpdate();
        console.log('用户系统初始化完成');
    }
    
    /**
     * 初始化实时事件监听
     */
    initRealtimeEvents() {
        if (window.realtimeManager) {
            console.log('🔗 初始化实时事件监听...');
            
            // 监听积分更新事件
            window.realtimeManager.on('pointsUpdated', (data) => {
                console.log('💰 实时积分更新:', data);
                this.updatePointsDisplay(data.newPoints);
                this.showMessage('info', '积分更新', `${data.reason}: ${data.amount > 0 ? '+' : ''}${data.amount}`);
            });
            
            // 监听用户上线事件
            window.realtimeManager.on('userOnline', (user) => {
                console.log('👤 用户上线:', user.username);
                this.showMessage('info', '用户上线', `${user.name || user.username} 已上线`);
            });
            
            // 监听用户下线事件
            window.realtimeManager.on('userOffline', (user) => {
                console.log('👤 用户下线:', user.username);
                this.showMessage('info', '用户下线', `${user.name || user.username} 已下线`);
            });
            
            // 监听在线用户列表更新
            window.realtimeManager.on('onlineUsers', (users) => {
                console.log('👥 在线用户列表更新:', users.length, '人');
                this.updateOnlineUsersDisplay(users);
            });
            
            // 监听排行榜更新
            window.realtimeManager.on('leaderboardUpdate', (leaderboard) => {
                console.log('🏆 排行榜实时更新');
                this.updateLeaderboardDisplay(leaderboard);
            });
            
            // 监听游戏房间事件
            window.realtimeManager.on('gameRoomCreated', (data) => {
                console.log('🎮 游戏房间创建:', data.gameRoom.id);
                this.showMessage('info', '游戏房间', `新房间 ${data.gameRoom.roomId} 已创建`);
            });
            
            window.realtimeManager.on('playerJoined', (data) => {
                console.log('🎮 玩家加入:', data.player.username);
                if (this.isInGameRoom && data.gameRoom.players.some(p => p.userId === this.currentUser?.id)) {
                    this.showMessage('info', '玩家加入', `${data.player.username} 加入了房间`);
                }
            });
            
            window.realtimeManager.on('playerLeft', (data) => {
                console.log('🎮 玩家离开:', data.player.username);
                if (this.isInGameRoom && data.gameRoom.players.some(p => p.userId === this.currentUser?.id)) {
                    this.showMessage('info', '玩家离开', `${data.player.username} 离开了房间`);
                }
            });
            
            window.realtimeManager.on('gameStart', (data) => {
                console.log('🎮 游戏开始:', data.gameRoom.id);
                if (data.gameRoom.players.some(p => p.userId === this.currentUser?.id)) {
                    this.isInGameRoom = true;
                    this.showMessage('success', '游戏开始', '游戏已开始，祝你好运！');
                }
            });
            
            window.realtimeManager.on('gameEnd', (data) => {
                console.log('🎮 游戏结束:', data.gameRoom.id);
                this.isInGameRoom = false;
                this.showMessage('info', '游戏结束', '游戏已结束');
            });
            
            window.realtimeManager.on('gameResult', (data) => {
                console.log('🎮 游戏结果:', data);
                const message = data.result === 'win' ? '恭喜获胜！' : '很遗憾，再接再厉！';
                const type = data.result === 'win' ? 'success' : 'info';
                this.showMessage(type, '游戏结果', message);
            });
            
            // 监听聊天消息
            window.realtimeManager.on('newMessage', (message) => {
                console.log('💬 新消息:', message.username, ':', message.message);
                this.displayChatMessage(message);
            });
            
            // 监听连接状态
            window.realtimeManager.on('disconnect', (data) => {
                console.log('🔌 连接断开:', data.reason);
                this.showMessage('warning', '连接断开', '实时连接已断开，正在尝试重连...');
            });
            
            window.realtimeManager.on('connectionFailed', (error) => {
                console.error('❌ 连接失败:', error);
                this.showMessage('error', '连接失败', '无法连接到服务器，请检查网络');
            });
        }
    }
    
    /**
     * 更新在线用户显示
     */
    updateOnlineUsersDisplay(users) {
        const onlineCountElement = document.getElementById('onlineUsersCount');
        if (onlineCountElement) {
            onlineCountElement.textContent = users.length;
        }
        
        const onlineListElement = document.getElementById('onlineUsersList');
        if (onlineListElement) {
            onlineListElement.innerHTML = users.map(user => 
                `<div class="online-user">
                    <span class="user-status online"></span>
                    <span class="user-name">${user.name || user.username}</span>
                    <span class="user-points">${user.points}积分</span>
                </div>`
            ).join('');
        }
    }
    
    /**
     * 更新排行榜显示
     */
    updateLeaderboardDisplay(leaderboard) {
        const leaderboardElement = document.getElementById('leaderboard');
        if (leaderboardElement) {
            leaderboardElement.innerHTML = leaderboard.map((user, index) => 
                `<div class="leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                    <span class="rank">#${user.rank}</span>
                    <span class="username">${user.username}</span>
                    <span class="points">${user.points}积分</span>
                </div>`
            ).join('');
        }
    }
    
    /**
     * 显示聊天消息
     */
    displayChatMessage(message) {
        const chatContainer = document.getElementById('chatContainer');
        if (!chatContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <span class="message-username">${message.username}:</span>
            <span class="message-text">${message.message}</span>
            <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
        `;
        
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 限制消息数量
        const messages = chatContainer.querySelectorAll('.chat-message');
        if (messages.length > 50) {
            messages[0].remove();
        }
    }
    
    /**
     * 检查登录状态
     */
    checkLoginStatus() {
        this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const currentUser = localStorage.getItem('currentUser');
        
        if (!this.isLoggedIn || !currentUser) {
            console.log('用户未登录');
            this.redirectToLogin();
            return false;
        }
        
        try {
            this.currentUser = JSON.parse(currentUser);
            if (!this.currentUser || !this.currentUser.name) {
                console.log('用户数据格式错误');
                this.redirectToLogin();
                return false;
            }
        } catch (error) {
            console.error('用户数据解析失败:', error);
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
        
        // 🌟 新增：绑定发送消息事件
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
    }
    
    /**
     * 发送消息
     */
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput || !window.realtimeManager) return;
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        window.realtimeManager.sendMessage(message);
        messageInput.value = '';
    }
    
    /**
     * 初始化积分系统
     */
    initPointsSystem() {
        if (window.pointsSystem) {
            console.log('初始化积分系统...');
            
            // 订阅积分变动事件
            window.pointsSystem.subscribe((data) => {
                console.log('积分系统订阅事件:', data);
                this.updatePointsDisplay(data.newPoints);
            });
            
            // 监听积分更新事件
            window.addEventListener('pointsUpdated', (e) => {
                console.log('积分更新事件:', e.detail);
                this.updatePointsDisplay(e.detail.newPoints);
            });
            
            // 初始更新积分显示
            const currentPoints = window.pointsSystem.getPoints();
            this.updatePointsDisplay(currentPoints);
        } else {
            console.error('积分系统未找到');
        }
    }
    
    /**
     * 初始化订单系统
     */
    initOrderSystem() {
        console.log('初始化订单系统...');
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
                console.log('加载订单数据:', this.orders.length, '条');
            } catch (error) {
                console.error('加载订单数据失败:', error);
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
            console.log('保存订单数据:', this.orders.length, '条');
        } catch (error) {
            console.error('保存订单数据失败:', error);
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
            console.log('发现待处理订单:', pendingOrders.length, '条');
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
        
        // 🌟 新增：触发用户登录事件，让实时管理器连接
        if (window.realtimeManager && !window.realtimeManager.isConnected) {
            window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                detail: { user: this.currentUser } 
            }));
        }
        
        this.dispatchEvent('userInfoUpdated', {
            user: this.currentUser,
            points: window.pointsSystem ? window.pointsSystem.getPoints() : (this.currentUser.points || 0)
        });
    }
    
    /**
     * 更新积分显示
     */
    updatePointsDisplay(points) {
        if (this.userPoints) {
            this.userPoints.textContent = points;
            console.log('积分显示已更新:', points);
        }
        
        const allPointsElements = document.querySelectorAll('.user-points-display');
        allPointsElements.forEach(element => {
            element.textContent = points;
        });
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
                console.error('同步订单到后端失败:', error);
            });
        }
        
        console.log('创建订单:', order);
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
                    console.error('同步订单状态到后端失败:', error);
                });
            }
            
            console.log('更新订单状态:', { orderId, status, note });
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
            // 🌟 新增：触发用户登出事件，让实时管理器断开连接
            if (window.realtimeManager) {
                window.dispatchEvent(new CustomEvent('userLoggedOut', {}));
            }
            
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
    console.log('用户系统模块加载完成');
    
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
    
    /* 🌟 新增：在线用户和聊天样式 */
    .online-user {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 10px;
        border-radius: 5px;
        background: rgba(0,255,0,0.1);
        margin-bottom: 5px;
    }
    
    .user-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ccc;
    }
    
    .user-status.online {
        background: #28a745;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
    
    .leaderboard-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-radius: 5px;
        margin-bottom: 5px;
        background: rgba(0,0,0,0.05);
    }
    
    .leaderboard-item.top-1 {
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: white;
        font-weight: bold;
    }
    
    .leaderboard-item.top-2 {
        background: linear-gradient(135deg, #C0C0C0, #808080);
        color: white;
        font-weight: bold;
    }
    
    .leaderboard-item.top-3 {
        background: linear-gradient(135deg, #CD7F32, #8B4513);
        color: white;
        font-weight: bold;
    }
    
    .chat-message {
        padding: 8px 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        background: rgba(0,0,0,0.05);
        animation: slideInLeft 0.3s ease;
    }
    
    @keyframes slideInLeft {
        from {
            transform: translateX(-20px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .message-username {
        font-weight: bold;
        color: #007bff;
        margin-right: 8px;
    }
    
    .message-text {
        color: #333;
    }
    
    .message-time {
        font-size: 0.8rem;
        color: #666;
        margin-left: 8px;
    }
`;

// 动态添加样式
const styleSheet = document.createElement('style');
styleSheet.textContent = userSystemStyles;
document.head.appendChild(styleSheet);