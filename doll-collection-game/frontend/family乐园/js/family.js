// 家庭乐园前端JavaScript - 核心模块
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
    
    // API基础地址
    getApiBase() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        return ''; // 生产环境使用相对路径
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
        
        // 加载家庭数据
        setTimeout(() => {
            this.loadFamilyData();
        }, 500);
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
    
    // 检查登录状态
    checkLoginStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            this.validateToken(token);
        } else {
            console.log('❌ 未找到token，重定向到主页');
            this.redirectToMain();
        }
    },
    
    // 重定向到主页
    redirectToMain() {
        window.location.href = '../index.html';
    },
    
    // 验证token
    async validateToken(token) {
        try {
            const response = await fetch(`${this.getApiBase()}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData.user;
                this.updateUserPoints();
                console.log('✅ 用户验证成功:', this.currentUser.username);
            } else {
                console.log('❌ Token验证失败');
                localStorage.removeItem('token');
                this.redirectToMain();
            }
        } catch (error) {
            console.error('❌ Token验证错误:', error);
            this.redirectToMain();
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
        console.log('🔧 初始化事件监听器...');
        
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
            
            console.log('✅ 事件监听器初始化完成');
        } catch (error) {
            console.error('❌ 事件监听器初始化错误:', error);
        }
    },
    
    // 处理导航点击
    handleNavClick(e) {
        try {
            const link = e.currentTarget;
            const panelId = link.getAttribute('data-panel');
            const href = link.getAttribute('href');
            const linkId = link.getAttribute('id');
            
            console.log('🔗 导航点击详情:');
            console.log('- 链接ID:', linkId);
            console.log('- href:', href);
            console.log('- data-panel:', panelId);
            
            // 如果是返回主页按钮
            if (linkId === 'back-to-main' && href) {
                console.log('🏠 跳转到主页:', href);
                window.location.href = href;
                return;
            }
            
            // 如果是面板切换
            if (panelId) {
                console.log('🔄 执行面板切换:', panelId);
                e.preventDefault();
                this.showPanel(panelId);
            } else {
                console.error('❌ 无法处理导航点击');
            }
        } catch (error) {
            console.error('❌ 处理导航点击错误:', error);
        }
    },
    
    // 处理退出
    handleLogout() {
        localStorage.removeItem('token');
        this.redirectToMain();
    },
    
    // 显示面板
    showPanel(panelId) {
        try {
            console.log('📋 显示面板:', panelId);
            
            if (!panelId) {
                console.error('❌ 面板ID为空');
                return;
            }
            
            // 隐藏所有面板
            const allPanels = document.querySelectorAll('.panel');
            console.log('找到面板数量:', allPanels.length);
            
            allPanels.forEach(panel => {
                panel.classList.remove('active');
            });
            
            // 显示选中的面板
            const targetPanel = document.getElementById(panelId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                console.log('✅ 面板显示成功:', panelId);
            } else {
                console.error('❌ 找不到面板:', panelId);
            }
            
            // 更新导航链接状态
            const allNavLinks = document.querySelectorAll('.nav-link');
            allNavLinks.forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`[data-panel="${panelId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
                console.log('✅ 导航链接激活:', panelId);
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
            console.error('❌ 显示面板错误:', error);
        }
    },
    
    // 加载家庭数据
    async loadFamilyData() {
        console.log('🏠 开始加载家庭数据...');
        
        if (!this.currentUser) {
            console.log('❌ 用户未登录');
            return;
        }
        
        try {
            const response = await fetch(`${this.getApiBase()}/family/my-family`, {
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
                this.showCreateFamilyModal();
            }
        } catch (error) {
            console.error('❌ 加载家庭数据错误:', error);
            this.showCreateFamilyModal();
        }
    },
    
    // 显示创建家庭模态框
    showCreateFamilyModal() {
        console.log('🏠 显示创建家庭模态框');
        
        try {
            const familyDetails = document.getElementById('family-details');
            if (familyDetails) {
                familyDetails.innerHTML = `
                    <div class="no-family">
                        <h3>您还没有加入任何家庭</h3>
                        <p>创建一个家庭，邀请好友一起养鸡吧！</p>
                        <div class="form-group">
                            <label class="form-label">家庭名称</label>
                            <input type="text" id="family-name-input" class="form-control" placeholder="请输入家庭名称">
                        </div>
                        <button class="btn btn-primary btn-block" onclick="FamilyPark.createFamily()">
                            <i class="fas fa-home"></i> 创建家庭
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ 显示创建家庭模态框错误:', error);
        }
    },
    
    // 创建家庭
    async createFamily() {
        try {
            const familyName = document.getElementById('family-name-input').value.trim();
            
            if (!familyName) {
                alert('请输入家庭名称');
                return;
            }
            
            console.log('🏠 创建家庭:', familyName);
            
            const response = await fetch(`${this.getApiBase()}/family/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: familyName })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message);
                this.loadFamilyData();
            } else {
                alert(data.message || '创建家庭失败');
            }
        } catch (error) {
            console.error('❌ 创建家庭错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 更新家庭显示
    updateFamilyDisplay() {
        try {
            if (!this.currentFamily) {
                console.log('❌ 当前家庭为空');
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
                `;
            }
            
            // 更新家庭成员列表
            this.updateFamilyMembers();
        } catch (error) {
            console.error('❌ 更新家庭显示错误:', error);
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
    
    // 显示通知
    showNotification(message, type = 'info') {
        try {
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
    }
};

// 全局函数，供HTML调用
window.FamilyPark = FamilyPark;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 DOM加载完成，初始化家庭乐园...');
    FamilyPark.init();
});

console.log('🏠 家庭乐园核心模块加载完成');
