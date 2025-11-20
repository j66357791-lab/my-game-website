// 家庭乐园前端JavaScript - 修改版
console.log('🏠 家庭乐园页面加载中...');

// 全局标识 - 供主站检查
window.familyParkLoaded = true;

// 使用命名空间避免全局变量冲突
const FamilyPark = {
    // 全局变量放在命名空间内
    currentUser: null,
    currentFamily: null,
    familyChickens: [],
    familyEggs: [],
    feedShopItems: [],
    userFriends: [],
    friendRequests: [],
    selectedChicken: null,
    selectedFeed: null,
    socket: null,
    onlineMembers: [],
    initialized: false,
    
    // API基础地址 - 增强版本
    getApiBase() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        console.log('🌐 家庭乐园API地址检测:');
        console.log('- hostname:', hostname);
        console.log('- pathname:', pathname);
        console.log('- port:', window.location.port);
        
        // 开发环境：localhost或127.0.0.1
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const apiBase = `http://${hostname}:3000/api`;
            console.log('🔧 开发环境API地址:', apiBase);
            return apiBase;
        }
        
        // 生产环境检测
        if (hostname.includes('render.com') || hostname.includes('onrender.com')) {
            console.log('🚀 生产环境(Render)');
            return '/api';
        }
        
        // 家庭乐园环境检测
        if (pathname.includes('/family乐园/')) {
            console.log('🏠 家庭乐园环境');
            return '/api';
        }
        
        // 默认生产环境
        console.log('🌐 默认生产环境');
        return '/api';
    },
    
    // 调试API调用
    debugApiCall(url, options = {}) {
        console.log('🔍 家庭乐园API调用调试:');
        console.log('- URL:', url);
        console.log('- 方法:', options.method || 'GET');
        console.log('- Headers:', options.headers);
        
        return fetch(url, options).then(response => {
            console.log('📡 家庭乐园API响应调试:');
            console.log('- 状态:', response.status);
            console.log('- 状态文本:', response.statusText);
            console.log('- Headers:', [...response.headers.entries()]);
            
            return response;
        });
    },
    
    // 初始化
    init() {
        console.log('🏠 初始化家庭乐园...');
        
        // 检查是否已经初始化
        if (this.initialized) {
            console.log('⚠️ 家庭乐园已初始化，跳过重复初始化');
            return;
        }
        
        this.initialized = true;
        
        // 初始化WebSocket连接
        this.initWebSocket();
        
        // 检查登录状态
        this.checkLoginStatus();
        
        // 初始化事件监听器
        this.initEventListeners();
    },
    
    // 初始化WebSocket连接
    initWebSocket() {
        console.log('🔗 初始化WebSocket连接...');
        
        try {
            // 连接到WebSocket服务器
            this.socket = io();
            
            // 监听连接事件
            this.socket.on('connect', () => {
                console.log('✅ WebSocket连接成功');
                
                // 用户登录
                const token = localStorage.getItem('token');
                if (token) {
                    this.socket.emit('user-login', { token });
                }
            });
            
            // 监听登录成功
            this.socket.on('login-success', (data) => {
                console.log('✅ WebSocket登录成功:', data);
                this.onlineMembers.push(data);
            });
            
            // 监听登录错误
            this.socket.on('login-error', (error) => {
                console.error('❌ WebSocket登录错误:', error);
            });
        } catch (error) {
            console.error('❌ WebSocket初始化错误:', error);
        }
    },
    
    // 检查登录状态 - 修复版本
    checkLoginStatus() {
        console.log('🔍 检查家庭乐园登录状态...');
        
        const token = localStorage.getItem('token');
        console.log('🔑 Token存在:', !!token);
        
        if (!token) {
            console.log('❌ 未找到token，显示登录提示');
            this.showLoginPrompt();
            return;
        }
        
        // 验证token有效性
        this.validateToken(token);
    },
    
    // 显示登录提示 - 新增函数
    showLoginPrompt() {
        console.log('🔐 显示登录提示');
        
        // 创建登录提示模态框
        const promptModal = document.createElement('div');
        promptModal.className = 'modal';
        promptModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">需要登录</div>
                </div>
                <div class="modal-body">
                    <p>您需要先登录才能访问家庭乐园</p>
                    <div class="form-group">
                        <label class="form-label">用户名</label>
                        <input type="text" id="prompt-username" class="form-control" placeholder="请输入用户名">
                    </div>
                    <div class="form-group">
                        <label class="form-label">密码</label>
                        <input type="password" id="prompt-password" class="form-control" placeholder="请输入密码">
                    </div>
                    <div class="form-group">
                        <button class="btn btn-primary" onclick="FamilyPark.quickLogin()">登录</button>
                        <button class="btn btn-secondary" onclick="FamilyPark.redirectToMain()">返回主页</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(promptModal);
        
        // 显示模态框
        promptModal.style.display = 'flex';
        
        // 自动聚焦用户名输入框
        setTimeout(() => {
            const usernameInput = document.getElementById('prompt-username');
            if (usernameInput) {
                usernameInput.focus();
            }
        }, 100);
    },
    
    // 快速登录 - 新增函数
    async quickLogin() {
        const username = document.getElementById('prompt-username').value;
        const password = document.getElementById('prompt-password').value;
        
        if (!username || !password) {
            this.showNotification('请输入用户名和密码', 'error');
            return;
        }
        
        try {
            console.log('🔐 执行快速登录...');
            
            const response = await this.debugApiCall(`${this.getApiBase()}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ 快速登录成功');
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                
                // 关闭登录提示
                this.closeLoginPrompt();
                
                // 更新UI并加载数据
                this.updateUserPoints();
                this.showNotification('登录成功！正在加载家庭数据...', 'success');
                
                // 延迟加载数据
                setTimeout(() => {
                    this.loadFamilyData();
                }, 1000);
            } else {
                console.log('❌ 快速登录失败:', data.message);
                this.showNotification(data.message || '登录失败', 'error');
            }
        } catch (error) {
            console.error('❌ 快速登录错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 关闭登录提示 - 新增函数
    closeLoginPrompt() {
        const promptModal = document.querySelector('.modal');
        if (promptModal && promptModal.innerHTML.includes('需要登录')) {
            promptModal.remove();
        }
    },
    
    // 重定向到主页 - 修复版本
    redirectToMain() {
        console.log('🔄 重定向到主页...');
        
        // 清除可能的问题数据
        this.currentUser = null;
        this.currentFamily = null;
        this.familyChickens = [];
        this.familyEggs = [];
        
        // 显示跳转提示
        this.showNotification('正在跳转到主页...', 'info');
        
        // 延迟跳转，让用户看到提示
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
    },
    
    // 验证token - 修复版本
    async validateToken(token) {
        try {
            console.log('🔍 开始验证家庭乐园token...');
            
            const response = await this.debugApiCall(`${this.getApiBase()}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Token验证响应状态:', response.status);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('✅ Token验证成功:', userData.user.username);
                this.currentUser = userData.user;
                this.updateUserPoints();
                
                // 加载家庭数据
                setTimeout(() => {
                    this.loadFamilyData();
                }, 500);
            } else {
                console.log('❌ Token验证失败，响应:', response.status);
                
                // 尝试获取错误信息
                let errorMessage = 'Token验证失败';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    console.log('❌ 无法解析错误响应');
                }
                
                console.log('❌ 错误信息:', errorMessage);
                
                // 显示错误信息而不是立即跳转
                this.showNotification(errorMessage, 'error');
                
                // 延迟跳转，给用户时间看到错误
                setTimeout(() => {
                    localStorage.removeItem('token');
                    this.showLoginPrompt();
                }, 3000);
            }
        } catch (error) {
            console.error('❌ Token验证错误:', error);
            
            // 网络错误处理
            this.showNotification('网络连接错误，请检查网络', 'error');
            
            // 延迟跳转
            setTimeout(() => {
                this.showLoginPrompt();
            }, 3000);
        }
    },
    
    // 更新用户积分显示
    updateUserPoints() {
        if (this.currentUser) {
            const userPoints = document.getElementById('user-points');
            if (userPoints) {
                userPoints.textContent = this.currentUser.points.toFixed(2) + ' 积分';
            }
        }
    },
    
    // 初始化事件监听器
    initEventListeners() {
        console.log('🔧 初始化家庭乐园事件监听器...');
        
        try {
            // 导航链接
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    this.handleNavClick(e);
                });
            });
            
            // 退出按钮
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
            
            console.log('✅ 家庭乐园事件监听器初始化完成');
        } catch (error) {
            console.error('❌ 家庭乐园事件监听器初始化错误:', error);
        }
    },
    
    // 处理导航点击 - 修复版本
    handleNavClick(e) {
        try {
            const link = e.currentTarget;
            const panelId = link.getAttribute('data-panel');
            const href = link.getAttribute('href');
            const linkId = link.getAttribute('id');
            
            console.log('🔗 家庭乐园导航点击详情:');
            console.log('- 链接ID:', linkId);
            console.log('- href:', href);
            console.log('- data-panel:', panelId);
            
            // 如果是返回主页按钮
            if (linkId === 'back-to-main' && href) {
                console.log('🏠 跳转到主页:', href);
                this.showNotification('正在返回主页...', 'info');
                setTimeout(() => {
                    window.location.href = href;
                }, 500);
                return;
            }
            
            // 如果是面板切换
            if (panelId) {
                console.log('🔄 执行家庭乐园面板切换:', panelId);
                e.preventDefault();
                this.showPanel(panelId);
            } else {
                console.error('❌ 无法处理家庭乐园导航点击');
                console.error('链接元素:', link);
            }
        } catch (error) {
            console.error('❌ 处理家庭乐园导航点击错误:', error);
        }
    },
    
    // 处理退出
    handleLogout() {
        console.log('🚪 处理家庭乐园退出...');
        
        this.showNotification('正在退出...', 'info');
        
        localStorage.removeItem('token');
        this.currentUser = null;
        this.familyChickens = [];
        this.familyEggs = [];
        
        setTimeout(() => {
            this.redirectToMain();
        }, 500);
    },
    
    // 显示面板
    showPanel(panelId) {
        try {
            console.log('📋 显示家庭乐园面板:', panelId);
            
            if (!panelId) {
                console.error('❌ 家庭乐园面板ID为空');
                return;
            }
            
            // 隐藏所有面板
            const allPanels = document.querySelectorAll('.panel');
            console.log('找到家庭乐园面板数量:', allPanels.length);
            
            allPanels.forEach(panel => {
                panel.classList.remove('active');
            });
            
            // 显示选中的面板
            const targetPanel = document.getElementById(panelId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                console.log('✅ 家庭乐园面板显示成功:', panelId);
            } else {
                console.error('❌ 找不到家庭乐园面板:', panelId);
                return;
            }
            
            // 更新导航链接状态
            const allNavLinks = document.querySelectorAll('.nav-link');
            allNavLinks.forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`[data-panel="${panelId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
                console.log('✅ 家庭乐园导航链接激活:', panelId);
            }
            
            // 加载特定面板的数据
            if (panelId === 'family-home') {
                this.loadFamilyData();
            } else if (panelId === 'chicken-coop') {
                this.loadChickenCoopData();
            } else if (panelId === 'feed-shop') {
                this.loadFeedShopData();
            } else if (panelId === 'egg-storage') {
                this.loadEggStorageData();
            } else if (panelId === 'friends-panel') {
                this.loadFriendsData();
            }
        } catch (error) {
            console.error('❌ 显示家庭乐园面板错误:', error);
        }
    },
    
    // 关闭模态框
    closeModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ 关闭模态框错误:', error);
        }
    },
    
    // 显示通知 - 增强版本
    showNotification(message, type = 'info') {
        try {
            console.log('📢 显示通知:', message, type);
            
            // 移除已存在的通知
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(notification => {
                notification.remove();
            });
            
            // 创建通知元素
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-message">${message}</span>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
            
            // 添加到页面
            document.body.appendChild(notification);
            
            // 自动移除
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('❌ 显示通知错误:', error);
        }
    },
    
    // ==================== 创建家庭功能 - 修改版 ====================
    
    // 显示创建家庭模态框 - 修改版
    showCreateFamilyModal() {
        try {
            console.log('🏠 显示创建家庭模态框');
            
            // 显示模态框
            const modal = document.getElementById('create-family-modal');
            if (modal) {
                modal.style.display = 'flex';
                
                // 开始权限检查
                this.checkCreatePermissionAndLoad();
            }
        } catch (error) {
            console.error('❌ 显示创建家庭模态框错误:', error);
            this.showNotification('显示创建家庭界面失败', 'error');
        }
    },
    
    // 检查创建权限并加载数据
    async checkCreatePermissionAndLoad() {
        try {
            const permissionCheck = document.getElementById('create-permission-check');
            const createForm = document.getElementById('create-form');
            const createBtn = document.getElementById('create-btn');
            
            // 显示加载状态
            if (permissionCheck) {
                permissionCheck.innerHTML = `
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        正在检查创建权限...
                    </div>
                `;
            }
            
            // 检查基本权限
            const permission = await this.checkCreatePermission();
            
            if (permission.canCreate) {
                // 权限通过，显示成功状态
                if (permissionCheck) {
                    permissionCheck.innerHTML = `
                        <div class="permission-success">
                            <i class="fas fa-check-circle"></i>
                            <span>${permission.reason}</span>
                        </div>
                    `;
                }
                
                // 显示创建表单
                if (createForm) {
                    createForm.style.display = 'block';
                }
                
                // 启用创建按钮
                if (createBtn) {
                    createBtn.disabled = false;
                }
                
                // 清空输入框
                const nameInput = document.getElementById('family-name-input');
                if (nameInput) {
                    nameInput.value = '';
                    nameInput.focus();
                }
            } else {
                // 权限失败，显示错误状态
                if (permissionCheck) {
                    permissionCheck.innerHTML = `
                        <div class="permission-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>${permission.reason}</span>
                        </div>
                    `;
                }
                
                // 隐藏创建表单
                if (createForm) {
                    createForm.style.display = 'none';
                }
                
                // 禁用创建按钮
                if (createBtn) {
                    createBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('❌ 检查创建权限错误:', error);
            
            const permissionCheck = document.getElementById('create-permission-check');
            if (permissionCheck) {
                permissionCheck.innerHTML = `
                    <div class="permission-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>检查权限时发生错误</span>
                    </div>
                `;
            }
        }
    },
    
    // 检查创建权限 - 修改版
    async checkCreatePermission() {
        try {
            // 检查用户是否登录
            if (!this.currentUser) {
                return {
                    canCreate: false,
                    reason: '您还没有登录'
                };
            }
            
            // 检查是否已有家庭
            const hasFamily = await this.checkCurrentUserHasFamily();
            if (hasFamily) {
                return {
                    canCreate: false,
                    reason: '您已经有家庭了，无法创建新家庭'
                };
            }
            
            return {
                canCreate: true,
                reason: '可以创建新家庭'
            };
        } catch (error) {
            console.error('❌ 检查创建权限错误:', error);
            return {
                canCreate: false,
                reason: '检查权限时发生错误'
            };
        }
    },
    
    // 创建家庭 - 修改版
    async createFamily() {
        try {
            const familyNameInput = document.getElementById('family-name-input');
            const familyName = familyNameInput.value.trim();
            
            if (!familyName) {
                this.showNotification('请输入家庭名称', 'error');
                familyNameInput.focus();
                return;
            }
            
            if (familyName.length < 2 || familyName.length > 20) {
                this.showNotification('家庭名称长度应在2-20个字符之间', 'error');
                familyNameInput.focus();
                return;
            }
            
            // 再次检查权限
            const permission = await this.checkCreatePermission();
            if (!permission.canCreate) {
                this.showNotification(permission.reason, 'error');
                return;
            }
            
            // 显示确认对话框（移除积分赠送）
            const confirmMessage = `确定要创建家庭"${familyName}"吗？\n\n` +
                `🎁 创建奖励：\n` +
                `• 您将获得一只0岁小鸡\n` +
                `• 小鸡初始寿命：180天\n` +
                `• 养鸡场容量：2只\n` +
                `• 可以邀请1位好友加入家庭`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // 禁用创建按钮，防止重复点击
            const createBtn = document.getElementById('create-btn');
            const originalText = createBtn.innerHTML;
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';
            
            try {
                this.showNotification('正在创建家庭...', 'info');
                
                const response = await this.debugApiCall(`${this.getApiBase()}/family/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ name: familyName })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.showNotification(data.message, 'success');
                    this.closeModal('create-family-modal');
                    
                    // 重新加载家庭数据
                    await this.loadFamilyData();
                    
                    // 显示创建成功详情
                    this.showCreateSuccessDetails(data, familyName);
                } else {
                    this.showNotification(data.message || '创建家庭失败', 'error');
                }
            } finally {
                // 恢复按钮状态
                createBtn.disabled = false;
                createBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('❌ 创建家庭错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
            
            // 恢复按钮状态
            const createBtn = document.getElementById('create-btn');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = '<i class="fas fa-home"></i> 创建家庭';
            }
        }
    },
    
    // 显示创建成功详情 - 修改版
    showCreateSuccessDetails(data, familyName) {
        try {
            // 更新成功模态框内容
            const modal = document.getElementById('create-success-modal');
            if (!modal) return;
            
            // 更新家庭名称
            const familyNameElement = document.getElementById('create-family-name');
            if (familyNameElement) {
                familyNameElement.textContent = `"${familyName}" 家庭创建成功！`;
            }
            
            // 更新奖励信息
            const rewardFamilyName = document.getElementById('reward-family-name');
            if (rewardFamilyName) {
                rewardFamilyName.textContent = familyName;
            }
            
            // 显示模态框
            modal.style.display = 'flex';
            
            // 播放成功动画
            this.playSuccessAnimation();
        } catch (error) {
            console.error('❌ 显示创建成功详情错误:', error);
        }
    },
    
    // 检查当前用户是否已有家庭
    async checkCurrentUserHasFamily() {
        try {
            if (!this.currentUser) return false;
            
            const response = await this.debugApiCall(`${this.getApiBase()}/family/check-user-family/${this.currentUser._id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            return response.ok ? data.hasFamily : false;
        } catch (error) {
            console.error('❌ 检查用户家庭状态错误:', error);
            return false;
        }
    },
    
    // 播放成功动画
    playSuccessAnimation() {
        try {
            const successIcon = document.querySelector('.success-icon i');
            if (successIcon) {
                successIcon.style.animation = 'successPulse 0.6s ease-in-out';
            }
        } catch (error) {
            console.error('❌ 播放成功动画错误:', error);
        }
    },
    
    // ==================== 邀请好友功能 - 修改版 ====================
    
    // 显示邀请好友模态框 - 修改版
    showInviteModal() {
        try {
            console.log('👥 显示邀请好友模态框');
            
            // 显示模态框
            const modal = document.getElementById('invite-modal');
            if (modal) {
                modal.style.display = 'flex';
                
                // 开始权限检查
                this.checkInvitePermissionAndLoad();
            }
        } catch (error) {
            console.error('❌ 显示邀请模态框错误:', error);
            this.showNotification('显示邀请界面失败', 'error');
        }
    },
    
    // 检查邀请权限并加载数据
    async checkInvitePermissionAndLoad() {
        try {
            const permissionCheck = document.getElementById('invite-permission-check');
            const inviteForm = document.getElementById('invite-form');
            const inviteBtn = document.getElementById('invite-btn');
            
            // 显示加载状态
            if (permissionCheck) {
                permissionCheck.innerHTML = `
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        正在检查邀请权限...
                    </div>
                `;
            }
            
            // 检查基本权限
            const permission = await this.checkInvitePermission();
            
            if (permission.canInvite) {
                // 权限通过，显示成功状态
                if (permissionCheck) {
                    permissionCheck.innerHTML = `
                        <div class="permission-success">
                            <i class="fas fa-check-circle"></i>
                            <span>${permission.reason}</span>
                        </div>
                    `;
                }
                
                // 显示邀请表单
                if (inviteForm) {
                    inviteForm.style.display = 'block';
                }
                
                // 启用邀请按钮
                if (inviteBtn) {
                    inviteBtn.disabled = false;
                }
                
                // 加载好友列表
                await this.loadFriendsForInvite();
            } else {
                // 权限失败，显示错误状态
                if (permissionCheck) {
                    permissionCheck.innerHTML = `
                        <div class="permission-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>${permission.reason}</span>
                        </div>
                    `;
                }
                
                // 隐藏邀请表单
                if (inviteForm) {
                    inviteForm.style.display = 'none';
                }
                
                // 禁用邀请按钮
                if (inviteBtn) {
                    inviteBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('❌ 检查邀请权限错误:', error);
            
            const permissionCheck = document.getElementById('invite-permission-check');
            if (permissionCheck) {
                permissionCheck.innerHTML = `
                    <div class="permission-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>检查权限时发生错误</span>
                    </div>
                `;
            }
        }
    },
    
    // 检查邀请权限 - 修改版
    async checkInvitePermission() {
        try {
            // 检查用户是否登录
            if (!this.currentUser) {
                return {
                    canInvite: false,
                    reason: '您还没有登录'
                };
            }
            
            // 检查是否有家庭
            if (!this.currentFamily) {
                return {
                    canInvite: false,
                    reason: '您还没有家庭，请先创建家庭'
                };
            }
            
            // 检查是否是家庭主人
            if (!this.currentFamily.ownerId.equals(this.currentUser._id)) {
                return {
                    canInvite: false,
                    reason: '只有家庭主人可以邀请好友'
                };
            }
            
            // 检查家庭是否已满员（修改为2人）
            const currentMemberCount = (this.currentFamily.members || []).length + 1; // +1 for owner
            if (currentMemberCount >= 2) {
                return {
                    canInvite: false,
                    reason: `家庭已满员（${currentMemberCount}/2人）`
                };
            }
            
            return {
                canInvite: true,
                reason: `可以邀请好友（${currentMemberCount}/2人）`
            };
        } catch (error) {
            console.error('❌ 检查邀请权限错误:', error);
            return {
                canInvite: false,
                reason: '检查权限时发生错误'
            };
        }
    },
    
    // 加载好友列表用于邀请 - 修改版
    async loadFriendsForInvite() {
        try {
            const selectElement = document.getElementById('invite-friend-select');
            if (!selectElement) return;
            
            // 显示加载状态
            selectElement.innerHTML = '<option value="">正在加载好友列表...</option>';
            
            const response = await this.debugApiCall(`${this.getApiBase()}/friends`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.friends) {
                // 过滤可邀请的好友
                const availableFriends = await this.filterInviteableFriends(data.friends);
                
                selectElement.innerHTML = '<option value="">请选择要邀请的好友</option>';
                
                if (availableFriends.length === 0) {
                    selectElement.innerHTML = '<option value="">暂无可邀请的好友</option>';
                    this.showNoFriendsAvailable();
                } else {
                    availableFriends.forEach(friend => {
                        const option = document.createElement('option');
                        option.value = friend.userId._id;
                        option.textContent = `${friend.userId.username} (${friend.userId.email})`;
                        selectElement.appendChild(option);
                    });
                }
            } else {
                selectElement.innerHTML = '<option value="">加载好友列表失败</option>';
                this.showNotification('加载好友列表失败', 'error');
            }
        } catch (error) {
            console.error('❌ 加载好友列表错误:', error);
            const selectElement = document.getElementById('invite-friend-select');
            if (selectElement) {
                selectElement.innerHTML = '<option value="">网络错误，请稍后重试</option>';
            }
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 过滤可邀请的好友 - 修改版
    async filterInviteableFriends(friends) {
        try {
            if (!Array.isArray(friends) || !this.currentFamily) {
                return friends;
            }
            
            const availableFriends = [];
            
            for (const friend of friends) {
                // 检查是否已经在当前家庭中
                const isInCurrentFamily = this.currentFamily.members.some(member => 
                    member.userId._id === friend.userId._id
                );
                
                // 检查是否是家庭主人
                const isOwner = this.currentFamily.ownerId._id === friend.userId._id;
                
                // 检查是否是自己
                const isSelf = friend.userId._id === this.currentUser._id;
                
                // 检查好友是否已有家庭
                const hasFamily = await this.checkUserHasFamily(friend.userId._id);
                
                if (!isInCurrentFamily && !isOwner && !isSelf && !hasFamily) {
                    availableFriends.push(friend);
                }
            }
            
            return availableFriends;
        } catch (error) {
            console.error('❌ 过滤可邀请好友错误:', error);
            return friends;
        }
    },
    
    // 检查用户是否已有家庭
    async checkUserHasFamily(userId) {
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/check-user-family/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            return response.ok ? data.hasFamily : false;
        } catch (error) {
            console.error('❌ 检查用户家庭状态错误:', error);
            return false;
        }
    },
    
    // 显示无可用好友提示
    showNoFriendsAvailable() {
        try {
            const inviteForm = document.getElementById('invite-form');
            if (!inviteForm) return;
            
            const noFriendsDiv = document.createElement('div');
            noFriendsDiv.className = 'no-friends-available';
            noFriendsDiv.innerHTML = `
                <div class="no-friends-icon">
                    <i class="fas fa-user-friends"></i>
                </div>
                <h4>暂无可邀请的好友</h4>
                <div class="no-friends-reasons">
                    <div class="reason-item">
                        <i class="fas fa-home"></i>
                        <span>好友可能已经加入了其他家庭</span>
                    </div>
                    <div class="reason-item">
                        <i class="fas fa-users"></i>
                        <span>好友可能已经在您的家庭中</span>
                    </div>
                    <div class="reason-item">
                        <i class="fas fa-user-plus"></i>
                        <span>您可以先添加更多好友</span>
                    </div>
                </div>
                <div class="no-friends-actions">
                    <button class="btn btn-info" onclick="FamilyPark.switchToPanel('friends-panel')">
                        <i class="fas fa-user-plus"></i>
                        添加好友
                    </button>
                    <button class="btn btn-secondary" onclick="FamilyPark.closeModal('invite-modal')">
                        <i class="fas fa-times"></i>
                        关闭
                    </button>
                </div>
            `;
            
            // 替换邀请预览区域
            const invitePreview = document.getElementById('invite-preview');
            if (invitePreview) {
                invitePreview.style.display = 'none';
            }
            
            // 添加无好友提示
            inviteForm.appendChild(noFriendsDiv);
        } catch (error) {
            console.error('❌ 显示无可用好友提示错误:', error);
        }
    },
    
    // 邀请好友加入家庭 - 修改版
    async inviteFriend() {
        try {
            const friendSelect = document.getElementById('invite-friend-select');
            const selectedFriendId = friendSelect.value;
            
            if (!selectedFriendId) {
                this.showNotification('请选择要邀请的好友', 'warning');
                return;
            }
            
            // 再次检查权限
            const permission = await this.checkInvitePermission();
            if (!permission.canInvite) {
                this.showNotification(permission.reason, 'error');
                return;
            }
            
            // 获取选中的好友信息
            const selectedOption = friendSelect.options[friendSelect.selectedIndex];
            const friendName = selectedOption.textContent.split(' ')[0];
            
            // 显示确认对话框
            const confirmMessage = `确定要邀请 ${friendName} 加入您的家庭吗？\n\n` +
                `🎁 邀请奖励：\n` +
                `• ${friendName} 将获得一只0岁小鸡\n` +
                `• 小鸡初始寿命：180天\n` +
                `• 可以立即参与家庭活动\n` +
                `• 当前家庭人数：${permission.reason}`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // 禁用邀请按钮，防止重复点击
            const inviteBtn = document.getElementById('invite-btn');
            const originalText = inviteBtn.innerHTML;
            inviteBtn.disabled = true;
            inviteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 邀请中...';
            
            try {
                this.showNotification('正在发送邀请...', 'info');
                
                const response = await this.debugApiCall(`${this.getApiBase()}/family/invite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        friendId: selectedFriendId
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.showNotification(data.message, 'success');
                    this.closeModal('invite-modal');
                    
                    // 重新加载家庭数据
                    await this.loadFamilyData();
                    
                    // 显示邀请成功详情
                    this.showInviteSuccessDetails(data, friendName);
                } else {
                    this.showNotification(data.message || '邀请失败', 'error');
                }
            } finally {
                // 恢复按钮状态
                inviteBtn.disabled = false;
                inviteBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('❌ 邀请好友错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
            
            // 恢复按钮状态
            const inviteBtn = document.getElementById('invite-btn');
            if (inviteBtn) {
                inviteBtn.disabled = false;
                inviteBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送邀请';
            }
        }
    },
    
    // 显示邀请成功详情 - 修改版
    showInviteSuccessDetails(data, friendName) {
        try {
            // 更新成功模态框内容
            const modal = document.getElementById('invite-success-modal');
            if (!modal) return;
            
            // 更新好友名称
            const friendNameElement = document.getElementById('success-friend-name');
            if (friendNameElement) {
                friendNameElement.textContent = `${friendName} 已成功加入家庭！`;
            }
            
            // 更新家庭人数
            const memberCountElement = document.getElementById('family-member-count');
            if (memberCountElement && this.currentFamily) {
                const currentCount = (this.currentFamily.members || []).length + 1;
                memberCountElement.textContent = `${currentCount}/2人`;
            }
            
            // 更新新成员名称
            const newMemberElement = document.getElementById('new-member-name');
            if (newMemberElement) {
                newMemberElement.textContent = friendName;
            }
            
            // 显示模态框
            modal.style.display = 'flex';
            
            // 播放成功动画
            this.playSuccessAnimation();
        } catch (error) {
            console.error('❌ 显示邀请成功详情错误:', error);
        }
    },
    
    // ==================== 其他现有功能保持不变 ====================
    
    // 加载家庭数据 - 修复版本
    async loadFamilyData() {
        console.log('🏠 开始加载家庭数据...');
        
        if (!this.currentUser) {
            console.log('❌ 用户未登录');
            return;
        }
        
        try {
            console.log('📡 发送家庭数据请求...');
            
            const response = await this.debugApiCall(`${this.getApiBase()}/family/my-family`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ 家庭数据加载成功:', data);
                this.currentFamily = data.family;
                this.familyChickens = data.chickens || [];
                this.familyEggs = data.eggs || [];
                
                this.updateFamilyDisplay();
                this.updateFamilyStats();
            } else {
                console.log('⚠️ 用户还没有家庭:', data.message);
                this.showNoFamilyUI();
            }
        } catch (error) {
            console.error('❌ 加载家庭数据错误:', error);
            this.showNoFamilyUI();
        }
    },
    
    // 显示无家庭UI
    showNoFamilyUI() {
        try {
            const familyDetails = document.getElementById('family-details');
            if (familyDetails) {
                familyDetails.innerHTML = `
                    <div class="no-family">
                        <div class="no-family-icon">
                            <i class="fas fa-home"></i>
                        </div>
                        <h3>您还没有加入任何家庭</h3>
                        <p>创建一个家庭，邀请好友一起养鸡吧！</p>
                        <div class="no-family-actions">
                            <button class="btn btn-primary btn-lg" onclick="FamilyPark.showCreateFamilyModal()">
                                <i class="fas fa-home"></i>
                                创建家庭
                            </button>
                            <button class="btn btn-info btn-lg" onclick="FamilyPark.showJoinFamilyModal()">
                                <i class="fas fa-user-plus"></i>
                                加入家庭
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // 隐藏其他按钮
            this.updateFamilyActionButtons();
        } catch (error) {
            console.error('❌ 显示无家庭UI错误:', error);
        }
    },
    
    // 更新家庭显示 - 优化版
    updateFamilyDisplay() {
        try {
            if (!this.currentFamily) {
                console.log('❌ 当前家庭为空');
                this.showNoFamilyUI();
                return;
            }
            
            console.log('🏠 更新家庭显示');
            
            const familyDetails = document.getElementById('family-details');
            if (familyDetails) {
                familyDetails.innerHTML = `
                    <div class="family-detail-item">
                        <div class="family-detail-label">家庭名称</div>
                        <div class="family-detail-value">${this.currentFamily.name}</div>
                    </div>
                    <div class="family-detail-item">
                        <div class="family-detail-label">家庭等级</div>
                        <div class="family-detail-value">${this.currentFamily.level}级</div>
                    </div>
                    <div class="family-detail-item">
                        <div class="family-detail-label">养鸡场容量</div>
                        <div class="family-detail-value">${this.currentFamily.maxChickens}只</div>
                    </div>
                    <div class="family-detail-item">
                        <div class="family-detail-label">创建时间</div>
                        <div class="family-detail-value">${new Date(this.currentFamily.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="family-detail-item">
                        <div class="family-detail-label">成员数量</div>
                        <div class="family-detail-value">${(this.currentFamily.members || []).length + 1}/2人</div>
                    </div>
                `;
            }
            
            // 更新家庭成员列表
            this.updateFamilyMembers();
            
            // 更新按钮显示
            this.updateFamilyActionButtons();
        } catch (error) {
            console.error('❌ 更新家庭显示错误:', error);
            this.showNoFamilyUI();
        }
    },
    
    // 更新家庭操作按钮
    updateFamilyActionButtons() {
        try {
            const createBtn = document.getElementById('create-family-btn');
            const inviteBtn = document.getElementById('invite-friend-btn');
            const manageBtn = document.getElementById('family-manage-btn');
            
            if (this.currentFamily) {
                // 有家庭的情况
                if (createBtn) createBtn.style.display = 'none';
                if (inviteBtn) {
                    inviteBtn.style.display = 'inline-block';
                    // 检查是否是家庭主人
                    if (this.currentFamily.ownerId.equals(this.currentUser._id)) {
                        inviteBtn.className = 'btn btn-primary';
                        inviteBtn.innerHTML = '<i class="fas fa-user-plus"></i> 邀请好友';
                    } else {
                        inviteBtn.className = 'btn btn-secondary';
                        inviteBtn.innerHTML = '<i class="fas fa-info-circle"></i> 查看家庭';
                        inviteBtn.onclick = () => this.showFamilyInfo();
                    }
                }
                if (manageBtn) {
                    manageBtn.style.display = 'inline-block';
                    manageBtn.className = 'btn btn-info';
                    manageBtn.innerHTML = '<i class="fas fa-cog"></i> 管理家庭';
                }
            } else {
                // 没有家庭的情况
                if (createBtn) {
                    createBtn.style.display = 'inline-block';
                    createBtn.className = 'btn btn-success';
                    createBtn.innerHTML = '<i class="fas fa-home"></i> 创建家庭';
                }
                if (inviteBtn) inviteBtn.style.display = 'none';
                if (manageBtn) manageBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ 更新家庭操作按钮错误:', error);
        }
    },
    
    // 更新家庭成员列表
    updateFamilyMembers() {
        try {
            const membersList = document.getElementById('family-members-list');
            if (!membersList || !this.currentFamily) {
                console.log('❌ 成员列表或家庭为空');
                return;
            }
            
            membersList.innerHTML = '';
            
            // 添加家庭主人
            const ownerCard = document.createElement('div');
            ownerCard.className = 'member-card';
            
            ownerCard.innerHTML = `
                <div class="member-avatar">${this.currentFamily.ownerId.username.charAt(0).toUpperCase()}</div>
                <div class="member-info">
                    <div class="member-name">${this.currentFamily.ownerId.username}</div>
                    <div class="member-role">家庭主人</div>
                    <div class="member-join-date">创建于 ${new Date(this.currentFamily.createdAt).toLocaleDateString()}</div>
                </div>
            `;
            membersList.appendChild(ownerCard);
            
            // 添加家庭成员
            if (this.currentFamily.members && this.currentFamily.members.length > 0) {
                this.currentFamily.members.forEach(member => {
                    const memberCard = document.createElement('div');
                    memberCard.className = 'member-card';
                    
                    memberCard.innerHTML = `
                        <div class="member-avatar">${member.userId.username.charAt(0).toUpperCase()}</div>
                        <div class="member-info">
                            <div class="member-name">${member.userId.username}</div>
                            <div class="member-role">家庭成员</div>
                            <div class="member-join-date">加入于 ${new Date(member.joinedAt).toLocaleDateString()}</div>
                        </div>
                    `;
                    membersList.appendChild(memberCard);
                });
            }
        } catch (error) {
            console.error('❌ 更新家庭成员列表错误:', error);
        }
    },
    
    // 显示家庭信息
    showFamilyInfo() {
        try {
            if (!this.currentFamily) {
                this.showNotification('家庭信息加载失败', 'error');
                return;
            }
            
            const info = `
                家庭名称：${this.currentFamily.name}
                家庭等级：${this.currentFamily.level}级
                养鸡场容量：${this.currentFamily.maxChickens}只
                成员数量：${(this.currentFamily.members || []).length + 1}人
                创建时间：${new Date(this.currentFamily.createdAt).toLocaleDateString()}
                您的角色：${this.currentFamily.ownerId.equals(this.currentUser._id) ? '家庭主人' : '家庭成员'}
            `;
            
            this.showNotification(info, 'info');
        } catch (error) {
            console.error('❌ 显示家庭信息错误:', error);
        }
    },
    
    // 更新家庭统计
    updateFamilyStats() {
        try {
            console.log('📊 更新家庭统计');
            
            const totalChickens = document.getElementById('total-chickens');
            const adultChickens = document.getElementById('adult-chickens');
            const totalEggs = document.getElementById('total-eggs');
            const coopLevel = document.getElementById('coop-level');
            const coopLevelDisplay = document.getElementById('coop-level-display');
            const coopCapacity = document.getElementById('coop-capacity');
            
            if (totalChickens) {
                totalChickens.textContent = this.familyChickens.length;
            }
            
            if (adultChickens) {
                adultChickens.textContent = this.familyChickens.filter(c => c.level >= 3).length;
            }
            
            if (totalEggs) {
                totalEggs.textContent = this.familyEggs.reduce((sum, egg) => sum + egg.quantity, 0);
            }
            
            if (this.currentFamily) {
                if (coopLevel) coopLevel.textContent = this.currentFamily.level;
                if (coopLevelDisplay) coopLevelDisplay.textContent = this.currentFamily.level;
                if (coopCapacity) coopCapacity.textContent = `${this.familyChickens.length}/${this.currentFamily.maxChickens}`;
            }
        } catch (error) {
            console.error('❌ 更新家庭统计错误:', error);
        }
    },
    
    // ==================== 养鸡场功能 ====================
    
    // 加载养鸡场数据
    async loadChickenCoopData() {
        console.log('🐔 加载养鸡场数据...');
        
        if (!this.currentFamily) {
            console.log('❌ 用户没有家庭');
            return;
        }
        
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/my-family`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.familyChickens = data.chickens || [];
                this.updateChickenCoopDisplay();
            }
        } catch (error) {
            console.error('❌ 加载养鸡场数据错误:', error);
        }
    },
    
    // 更新养鸡场显示
    updateChickenCoopDisplay() {
        try {
            console.log('🐔 更新养鸡场显示');
            
            const chickensContainer = document.getElementById('chickens-container');
            if (!chickensContainer) return;
            
            chickensContainer.innerHTML = '';
            
            if (this.familyChickens.length === 0) {
                chickensContainer.innerHTML = '<p>养鸡场还没有小鸡，快去邀请好友或抽取小鸡吧！</p>';
                return;
            }
            
            this.familyChickens.forEach(chicken => {
                const chickenCard = document.createElement('div');
                chickenCard.className = 'chicken-card';
                
                const qualityClass = this.getQualityClass(chicken.quality);
                const healthStatus = chicken.checkHealth ? '健康' : '需要喂养';
                const healthClass = chicken.checkHealth ? 'healthy' : 'unhealthy';
                
                // 检查是否为当前用户的小鸡
                const isMyChicken = chicken.ownerId && chicken.ownerId._id === this.currentUser._id;
                const ownerClass = isMyChicken ? 'my-chicken' : '';
                
                chickenCard.innerHTML = `
                    <div class="chicken-header ${qualityClass} ${ownerClass}">
                        <h3>${chicken.name}</h3>
                        <div class="chicken-level">Lv.${chicken.level}</div>
                        <div class="chicken-quality">${chicken.quality}</div>
                        ${isMyChicken ? '<div class="owner-badge">我的小鸡</div>' : ''}
                    </div>
                    <div class="chicken-body">
                        <div class="chicken-info">
                            <div class="info-item">
                                <span class="info-label">成长值:</span>
                                <span class="info-value">${chicken.growthValue || 0}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">下一级:</span>
                                <span class="info-value">${this.getNextLevelRequirement(chicken.level, chicken.quality)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">健康状态:</span>
                                <span class="info-value ${healthClass}">${healthStatus}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">寿命:</span>
                                <span class="info-value">${chicken.remainingDays || 180}天</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">主人:</span>
                                <span class="info-value">${chicken.ownerId ? chicken.ownerId.username : '未知'}</span>
                            </div>
                        </div>
                        <div class="chicken-actions">
                            <button class="btn btn-success btn-sm" onclick="FamilyPark.showFeedModal('${chicken._id}')">
                                <i class="fas fa-seedling"></i> 喂养
                            </button>
                            ${chicken.level >= 3 ? `
                                <button class="btn btn-primary btn-sm" onclick="FamilyPark.collectEgg('${chicken._id}')">
                                    <i class="fas fa-egg"></i> 收蛋
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
                
                chickensContainer.appendChild(chickenCard);
            });
            
            // 更新抽取按钮显示状态
            this.updateDrawButtonStatus();
        } catch (error) {
            console.error('❌ 更新养鸡场显示错误:', error);
        }
    },
    
    // 获取品质样式类
    getQualityClass(quality) {
        const qualityMap = {
            '普通': 'normal',
            '精英': 'elite',
            '传说': 'legend',
            '神话': 'myth'
        };
        return qualityMap[quality] || 'normal';
    },
    
    // 获取下一级所需成长值
    getNextLevelRequirement(level, quality) {
        const baseRequirements = {
            1: 200,
            2: 500,
            3: 1250,
            4: 3125,
            5: 7813,
            6: 19530
        };
        
        const qualityMultipliers = {
            '普通': 2.5,
            '精英': 2.3,
            '传说': 2.2,
            '神话': 2.0
        };
        
        const multiplier = qualityMultipliers[quality] || 2.5;
        const baseReq = baseRequirements[level] || 0;
        
        return Math.floor(baseReq * multiplier);
    },
    
    // 更新抽取按钮状态
    updateDrawButtonStatus() {
        try {
            const drawBtn = document.getElementById('draw-btn');
            if (!drawBtn) return;
            
            // 检查是否有3级以上的小鸡
            const hasLevel3Chicken = this.familyChickens.some(c => c.level >= 3);
            
            if (hasLevel3Chicken) {
                drawBtn.style.display = 'inline-block';
            } else {
                drawBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ 更新抽取按钮状态错误:', error);
        }
    },
    
    // 显示喂养模态框
    showFeedModal(chickenId) {
        try {
            this.selectedChicken = this.familyChickens.find(c => c._id === chickenId);
            if (!this.selectedChicken) return;
            
            // 创建喂养模态框
            const modalHtml = `
                <div id="feed-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">喂养小鸡</div>
                            <span class="close" onclick="FamilyPark.closeModal('feed-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="chicken-info">
                                <h4>${this.selectedChicken.name}</h4>
                                <p>当前等级: Lv.${this.selectedChicken.level}</p>
                                <p>当前成长值: ${this.selectedChicken.growthValue || 0}</p>
                                <p>下一级需要: ${this.getNextLevelRequirement(this.selectedChicken.level, this.selectedChicken.quality)}</p>
                                <p>主人: ${this.selectedChicken.ownerId ? this.selectedChicken.ownerId.username : '未知'}</p>
                            </div>
                            <div class="feed-options" id="feed-options">
                                <p>加载中...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('feed-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // 加载饲料选项
            this.loadFeedOptions();
        } catch (error) {
            console.error('❌ 显示喂养模态框错误:', error);
        }
    },
    
    // 加载饲料选项
    async loadFeedOptions() {
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/feed-shop`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.feedShopItems = data.feeds || [];
                this.displayFeedOptions();
            }
        } catch (error) {
            console.error('❌ 加载饲料选项错误:', error);
        }
    },
    
    // 显示饲料选项
    displayFeedOptions() {
        try {
            const feedOptions = document.getElementById('feed-options');
            if (!feedOptions) return;
            
            feedOptions.innerHTML = '';
            
            this.feedShopItems.forEach(feed => {
                const feedOption = document.createElement('div');
                feedOption.className = 'feed-option';
                
                const growthText = feed.isSpecial ? 
                    `${feed.minGrowth}-${feed.maxGrowth}` : feed.growthValue;
                
                feedOption.innerHTML = `
                    <div class="feed-info">
                        <h5>${feed.name}</h5>
                        <p>成长值: ${growthText}</p>
                        <p>价格: ${feed.price} 积分</p>
                        <p>${feed.description}</p>
                    </div>
                    <button class="btn btn-success" onclick="FamilyPark.feedChicken('${feed._id}')">
                        喂养
                    </button>
                `;
                
                feedOptions.appendChild(feedOption);
            });
        } catch (error) {
            console.error('❌ 显示饲料选项错误:', error);
        }
    },
    
    // 喂养小鸡
    async feedChicken(feedId) {
        if (!this.selectedChicken) return;
        
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/feed-chicken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chickenId: this.selectedChicken._id,
                    feedId: feedId
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.currentUser = data.user;
                this.updateUserPoints();
                this.closeModal('feed-modal');
                
                // 重新加载养鸡场数据
                this.loadChickenCoopData();
                this.updateFamilyStats();
            } else {
                this.showNotification(data.message || '喂养失败', 'error');
            }
        } catch (error) {
            console.error('❌ 喂养小鸡错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 收集鸡蛋
    async collectEgg(chickenId) {
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/collect-eggs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eggIds: [chickenId] // 这里简化处理，实际应该是鸡蛋ID
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.currentUser = data.user;
                this.updateUserPoints();
                
                // 重新加载鸡蛋仓库数据
                this.loadEggStorageData();
                this.updateFamilyStats();
            } else {
                this.showNotification(data.message || '收蛋失败', 'error');
            }
        } catch (error) {
            console.error('❌ 收集鸡蛋错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // ==================== 鸡蛋仓库功能 ====================
    
    // 加载鸡蛋仓库数据
    async loadEggStorageData() {
        console.log('🥚 加载鸡蛋仓库数据...');
        
        if (!this.currentFamily) {
            console.log('❌ 用户没有家庭');
            return;
        }
        
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/my-family`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.familyEggs = data.eggs || [];
                this.updateEggStorageDisplay();
            }
        } catch (error) {
            console.error('❌ 加载鸡蛋仓库数据错误:', error);
        }
    },
    
    // 更新鸡蛋仓库显示
    updateEggStorageDisplay() {
        try {
            console.log('🥚 更新鸡蛋仓库显示');
            
            const availableEggs = document.getElementById('available-eggs');
            const eggsContainer = document.getElementById('eggs-container');
            
            if (availableEggs) {
                const totalEggs = this.familyEggs.reduce((sum, egg) => sum + egg.quantity, 0);
                availableEggs.textContent = totalEggs;
            }
            
            if (!eggsContainer) return;
            
            eggsContainer.innerHTML = '';
            
            if (this.familyEggs.length === 0) {
                eggsContainer.innerHTML = '<p>仓库暂无鸡蛋</p>';
                return;
            }
            
            this.familyEggs.forEach(egg => {
                const eggCard = document.createElement('div');
                eggCard.className = 'egg-card';
                
                eggCard.innerHTML = `
                    <div class="egg-header">
                        <h3>鸡蛋</h3>
                        <div class="egg-quantity">${egg.quantity}个</div>
                    </div>
                    <div class="egg-body">
                        <div class="egg-info">
                            <div class="info-item">
                                <span class="info-label">来源:</span>
                                <span class="info-value">${egg.chickenId?.name || '未知小鸡'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">生产时间:</span>
                                <span class="info-value">${new Date(egg.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">可兑换:</span>
                                <span class="info-value">${egg.quantity * 100} 积分</span>
                            </div>
                        </div>
                        <div class="egg-actions">
                            <button class="btn btn-success btn-sm" onclick="FamilyPark.collectSingleEgg('${egg._id}')">
                                <i class="fas fa-coins"></i> 收集
                            </button>
                        </div>
                    </div>
                `;
                
                eggsContainer.appendChild(eggCard);
            });
        } catch (error) {
            console.error('❌ 更新鸡蛋仓库显示错误:', error);
        }
    },
    
    // 收集单个鸡蛋
    async collectSingleEgg(eggId) {
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/collect-eggs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eggIds: [eggId]
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.currentUser = data.user;
                this.updateUserPoints();
                this.loadEggStorageData(); // 重新加载
                this.updateFamilyStats();
            } else {
                this.showNotification(data.message || '收集失败', 'error');
            }
        } catch (error) {
            console.error('❌ 收集鸡蛋错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 收集所有鸡蛋
    async collectAllEggs() {
        try {
            if (this.familyEggs.length === 0) {
                this.showNotification('没有可收集的鸡蛋', 'warning');
                return;
            }
            
            if (!confirm(`确定要收集所有鸡蛋吗？总共${this.familyEggs.reduce((sum, egg) => sum + egg.quantity, 0)}个鸡蛋`)) {
                return;
            }
            
            const eggIds = this.familyEggs.map(egg => egg._id);
            
            const response = await this.debugApiCall(`${this.getApiBase()}/family/collect-eggs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eggIds: eggIds
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.currentUser = data.user;
                this.updateUserPoints();
                this.loadEggStorageData(); // 重新加载
                this.updateFamilyStats();
            } else {
                this.showNotification(data.message || '收集失败', 'error');
            }
        } catch (error) {
            console.error('❌ 收集所有鸡蛋错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // ==================== 饲料商城功能 ====================
    
    // 加载饲料商城数据
    async loadFeedShopData() {
        console.log('🛒 加载饲料商城数据...');
        
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/feed-shop`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.feedShopItems = data.feeds || [];
                this.displayFeedShop();
            }
        } catch (error) {
            console.error('❌ 加载饲料商城数据错误:', error);
        }
    },
    
    // 显示饲料商城
    displayFeedShop() {
        try {
            console.log('🛒 显示饲料商城');
            
            const shopContainer = document.getElementById('feed-shop-container');
            if (!shopContainer) return;
            
            shopContainer.innerHTML = '';
            
            if (this.feedShopItems.length === 0) {
                shopContainer.innerHTML = '<p>商城暂无商品</p>';
                return;
            }
            
            this.feedShopItems.forEach(feed => {
                const feedCard = document.createElement('div');
                feedCard.className = 'feed-card';
                
                const growthText = feed.isSpecial ? 
                    `${feed.minGrowth}-${feed.maxGrowth}` : feed.growthValue;
                
                feedCard.innerHTML = `
                    <div class="feed-header">
                        <h3>${feed.name}</h3>
                        <div class="feed-price">${feed.price} 积分</div>
                    </div>
                    <div class="feed-body">
                        <div class="feed-feature">
                            <i class="fas fa-seedling"></i>
                            <span>成长值: ${growthText}</span>
                        </div>
                        <div class="feed-feature">
                            <i class="fas fa-info-circle"></i>
                            <span>${feed.description}</span>
                        </div>
                        <div class="feed-purchase">
                            <div class="form-group">
                                <label class="form-label">购买数量</label>
                                <input type="number" id="feed-quantity-${feed._id}" class="form-control" min="1" max="100" value="1">
                            </div>
                            <button class="btn btn-success btn-block" onclick="FamilyPark.buyFeed('${feed._id}')">
                                购买
                            </button>
                        </div>
                    </div>
                `;
                
                shopContainer.appendChild(feedCard);
            });
        } catch (error) {
            console.error('❌ 显示饲料商城错误:', error);
        }
    },
    
    // 购买饲料
    async buyFeed(feedId) {
        try {
            const quantityInput = document.getElementById(`feed-quantity-${feedId}`);
            const quantity = parseInt(quantityInput?.value) || 1;
            
            if (quantity < 1 || quantity > 100) {
                this.showNotification('购买数量必须在1-100之间！', 'error');
                return;
            }
            
            const feed = this.feedShopItems.find(f => f._id === feedId);
            if (!feed) {
                this.showNotification('饲料不存在', 'error');
                return;
            }
            
            const totalPrice = feed.price * quantity;
            
            if (this.currentUser.points < totalPrice) {
                this.showNotification('积分不足', 'error');
                return;
            }
            
            console.log('🛒 购买饲料:', feed.name, '数量:', quantity);
            
            const response = await this.debugApiCall(`${this.getApiBase()}/family/buy-feed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    feedId: feedId,
                    quantity: quantity
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.currentUser = data.user;
                this.updateUserPoints();
            } else {
                this.showNotification(data.message || '购买失败', 'error');
            }
        } catch (error) {
            console.error('❌ 购买饲料错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // ==================== 好友系统功能 ====================
    
    // 加载好友数据
    async loadFriendsData() {
        if (!this.currentUser) return;
        
        try {
            // 获取好友列表
            const friendsResponse = await this.debugApiCall(`${this.getApiBase()}/friends`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (friendsResponse.ok) {
                const friendsData = await friendsResponse.json();
                this.userFriends = Array.isArray(friendsData.friends) ? friendsData.friends : [];
                this.updateFriendsList();
            }
            
            // 获取好友请求
            const requestsResponse = await this.debugApiCall(`${this.getApiBase()}/friends/requests`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json();
                this.friendRequests = Array.isArray(requestsData.requests) ? requestsData.requests : [];
                this.updateFriendRequests();
            }
        } catch (error) {
            console.error('加载好友数据错误:', error);
        }
    },
    
    // 更新好友列表
    updateFriendsList() {
        try {
            const friendsContainer = document.getElementById('my-friends');
            if (!friendsContainer) return;
            
            friendsContainer.innerHTML = '';
            
            if (!Array.isArray(this.userFriends) || this.userFriends.length === 0) {
                friendsContainer.innerHTML = '<p>暂无好友</p>';
                return;
            }
            
            this.userFriends.forEach(friend => {
                const friendCard = document.createElement('div');
                friendCard.className = 'user-card';
                
                friendCard.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <div class="user-name">${friend.userId.username}</div>
                            <div class="user-email">${friend.userId.email}</div>
                            <div class="friend-date">添加于 ${new Date(friend.addedAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-sm btn-danger" onclick="FamilyPark.deleteFriend('${friend.userId._id}')">删除好友</button>
                    </div>
                `;
                friendsContainer.appendChild(friendCard);
            });
        } catch (error) {
            console.error('❌ 更新好友列表错误:', error);
        }
    },
    
    // 更新好友请求
    updateFriendRequests() {
        try {
            const requestsContainer = document.getElementById('friend-requests');
            if (!requestsContainer) return;
            
            requestsContainer.innerHTML = '';
            
            if (!Array.isArray(this.friendRequests) || this.friendRequests.length === 0) {
                requestsContainer.innerHTML = '<p>暂无好友请求</p>';
                return;
            }
            
            this.friendRequests.forEach(request => {
                const requestCard = document.createElement('div');
                requestCard.className = 'user-card';
                requestCard.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <div class="user-name">${request.fromUserId.username}</div>
                            <div class="user-email">${request.fromUserId.email}</div>
                            <div class="request-date">请求于 ${new Date(request.requestedAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-sm btn-success" onclick="FamilyPark.respondFriendRequest('${request._id}', 'accept')">接受</button>
                        <button class="btn btn-sm btn-danger" onclick="FamilyPark.respondFriendRequest('${request._id}', 'reject')">拒绝</button>
                    </div>
                `;
                requestsContainer.appendChild(requestCard);
            });
        } catch (error) {
            console.error('❌ 更新好友请求错误:', error);
        }
    },
    
    // 搜索用户
    async searchUsers() {
        try {
            const username = document.getElementById('search-username').value.trim();
            if (!username) {
                this.showNotification('请输入搜索关键词', 'warning');
                return;
            }
            
            const response = await this.debugApiCall(`${this.getApiBase()}/friends/search?username=${encodeURIComponent(username)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.displaySearchResults(data.users);
            } else {
                this.showNotification(data.message || '搜索失败', 'error');
            }
        } catch (error) {
            console.error('❌ 搜索用户错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示搜索结果
    displaySearchResults(users) {
        try {
            const resultsContainer = document.getElementById('search-results');
            if (!resultsContainer) return;
            
            resultsContainer.innerHTML = '';
            
            if (!Array.isArray(users) || users.length === 0) {
                resultsContainer.innerHTML = '<p>未找到匹配的用户</p>';
                return;
            }
            
            users.forEach(user => {
                const userCard = document.createElement('div');
                userCard.className = 'user-card';
                userCard.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-details">
                            <div class="user-name">${user.username}</div>
                            <div class="user-email">${user.email}</div>
                            <div class="register-date">注册于 ${new Date(user.createdAt).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-sm" onclick="FamilyPark.sendFriendRequest('${user._id}')">添加好友</button>
                    </div>
                `;
                resultsContainer.appendChild(userCard);
            });
        } catch (error) {
            console.error('❌ 显示搜索结果错误:', error);
        }
    },
    
    // 发送好友请求
    async sendFriendRequest(userId) {
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/friends/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetUserId: userId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification('好友请求已发送', 'success');
            } else {
                this.showNotification(data.message || '发送失败', 'error');
            }
        } catch (error) {
            console.error('❌ 发送好友请求错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 处理好友请求
    async respondFriendRequest(requestId, action) {
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/friends/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ requestId, action })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.loadFriendsData(); // 重新加载好友数据
            } else {
                this.showNotification(data.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('❌ 处理好友请求错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 删除好友
    async deleteFriend(friendId) {
        try {
            if (!confirm('确定要删除这个好友吗？')) return;
            
            const response = await this.debugApiCall(`${this.getApiBase()}/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.loadFriendsData(); // 重新加载好友数据
            } else {
                this.showNotification(data.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('❌ 删除好友错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 切换好友标签页
    switchFriendsTab(tabName) {
        try {
            document.querySelectorAll('.friends-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.friends-content').forEach(content => {
                content.classList.remove('active');
            });
            
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            const targetContent = document.getElementById(`friends-${tabName}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        } catch (error) {
            console.error('❌ 切换好友标签页错误:', error);
        }
    },
    
    // 显示抽取小鸡模态框
    showDrawModal() {
        try {
            console.log('🎲 显示抽取小鸡模态框');
            const modal = document.getElementById('draw-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        } catch (error) {
            console.error('❌ 显示抽取小鸡模态框错误:', error);
        }
    },
    
    // 抽取小鸡
    async drawChicken() {
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/draw-chicken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.currentUser = data.user;
                this.updateUserPoints();
                this.closeModal('draw-modal');
                
                // 重新加载养鸡场数据
                this.loadChickenCoopData();
                this.updateFamilyStats();
            } else {
                this.showNotification(data.message || '抽取失败', 'error');
            }
        } catch (error) {
            console.error('❌ 抽取小鸡错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示升级养鸡场模态框
    showUpgradeModal() {
        try {
            console.log('🔧 显示升级养鸡场模态框');
            const modal = document.getElementById('upgrade-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        } catch (error) {
            console.error('❌ 显示升级养鸡场模态框错误:', error);
        }
    },
    
    // 升级养鸡场
    async upgradeCoop(targetLevel) {
        try {
            const response = await this.debugApiCall(`${this.getApiBase()}/family/upgrade-coop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetLevel: targetLevel })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showNotification(data.message, 'success');
                this.currentUser = data.user;
                this.updateUserPoints();
                this.closeModal('upgrade-modal');
                
                // 重新加载家庭数据
                this.loadFamilyData();
                this.updateFamilyStats();
            } else {
                this.showNotification(data.message || '升级失败', 'error');
            }
        } catch (error) {
            console.error('❌ 升级养鸡场错误:', error);
            this.showNotification('网络错误，请稍后重试', 'error');
        }
    }
};

// 全局函数，供HTML调用
window.FamilyPark = FamilyPark;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 家庭乐园DOM加载完成，初始化...');
    FamilyPark.init();
});

console.log('🏠 家庭乐园修改版加载完成');
