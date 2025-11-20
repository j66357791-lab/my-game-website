// 家庭乐园前端JavaScript - 集成好友系统版本
console.log('🏠 家庭乐园页面加载中...');

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
    
    // API基础地址
    getApiBase() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        return '/api';
    },
    
    // 初始化
    init() {
        console.log('🏠 初始化家庭乐园...');
        
        // 检查登录状态
        this.checkLoginStatus();
        
        // 初始化事件监听器
        this.initEventListeners();
        
        // 加载家庭数据
        setTimeout(() => {
            this.loadFamilyData();
        }, 500);
    },
    
    // 检查登录状态
    checkLoginStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            this.validateToken(token);
        } else {
            console.log('❌ 未找到token，重定向到主页');
            window.location.href = '../index.html';
        }
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
                window.location.href = '../index.html';
            }
        } catch (error) {
            console.error('❌ Token验证错误:', error);
            window.location.href = '../index.html';
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
        
        // 导航链接 - 修复版本
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
    },
    
    // 处理导航点击 - 新增函数
    handleNavClick(e) {
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
    },
    
    // 处理退出
    handleLogout() {
        localStorage.removeItem('token');
        window.location.href = '../index.html';
    },
    
    // 显示面板
    showPanel(panelId) {
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
    },
    
    // 创建家庭
    async createFamily() {
        const familyName = document.getElementById('family-name-input').value.trim();
        
        if (!familyName) {
            alert('请输入家庭名称');
            return;
        }
        
        console.log('🏠 创建家庭:', familyName);
        
        try {
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
    },
    
    // 更新家庭成员列表
    updateFamilyMembers() {
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
    },
    
    // 更新家庭统计
    updateFamilyStats() {
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
            adultChickens.textContent = this.familyChickens.filter(c => c.isAdult).length;
        }
        
        if (totalEggs) {
            totalEggs.textContent = this.familyEggs.reduce((sum, egg) => sum + egg.quantity, 0);
        }
        
        if (this.currentFamily) {
            if (coopLevel) coopLevel.textContent = this.currentFamily.level;
            if (coopLevelDisplay) coopLevelDisplay.textContent = this.currentFamily.level;
            if (coopCapacity) coopCapacity.textContent = `${this.familyChickens.length}/${this.currentFamily.maxChickens}`;
        }
    },
    
    // ==================== 好友系统集成 ====================
    
    // 切换好友标签页
    switchFriendsTab(tabName) {
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
    },
    
    // 加载好友数据
    async loadFriendsData() {
        if (!this.currentUser) return;
        
        try {
            // 获取好友列表
            const friendsResponse = await fetch(`${this.getApiBase()}/friends`, {
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
            const requestsResponse = await fetch(`${this.getApiBase()}/friends/requests`, {
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
    },
    
    // 更新好友请求
    updateFriendRequests() {
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
    },
    
    // 搜索用户
    async searchUsers() {
        const username = document.getElementById('search-username').value.trim();
        if (!username) {
            alert('请输入搜索关键词');
            return;
        }
        
        try {
            const response = await fetch(`${this.getApiBase()}/friends/search?username=${encodeURIComponent(username)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.displaySearchResults(data.users);
            } else {
                alert(data.message || '搜索失败');
            }
        } catch (error) {
            console.error('搜索用户错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 显示搜索结果
    displaySearchResults(users) {
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
    },
    
    // 发送好友请求
    async sendFriendRequest(userId) {
        try {
            const response = await fetch(`${this.getApiBase()}/friends/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetUserId: userId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('好友请求已发送');
            } else {
                alert(data.message || '发送失败');
            }
        } catch (error) {
            console.error('发送好友请求错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 处理好友请求
    async respondFriendRequest(requestId, action) {
        try {
            const response = await fetch(`${this.getApiBase()}/friends/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ requestId, action })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message);
                this.loadFriendsData(); // 重新加载好友数据
            } else {
                alert(data.message || '操作失败');
            }
        } catch (error) {
            console.error('处理好友请求错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 删除好友
    async deleteFriend(friendId) {
        if (!confirm('确定要删除这个好友吗？')) return;
        
        try {
            const response = await fetch(`${this.getApiBase()}/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message);
                this.loadFriendsData(); // 重新加载好友数据
            } else {
                alert(data.message || '删除失败');
            }
        } catch (error) {
            console.error('删除好友错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // ==================== 其他功能（暂时占位） ====================
    
    // 占位函数
    loadChickenCoopData() {
        console.log('🐔 加载养鸡场数据（占位）');
        alert('养鸡场功能开发中...');
    },
    
    loadFeedShopData() {
        console.log('🛒 加载饲料商城数据（占位）');
        alert('饲料商城功能开发中...');
    },
    
    loadEggStorageData() {
        console.log('🥚 加载鸡蛋仓库数据（占位）');
        alert('鸡蛋仓库功能开发中...');
    },
    
    showInviteModal() {
        console.log('👥 显示邀请好友模态框（占位）');
        alert('邀请好友功能开发中...');
    },
    
    showDrawModal() {
        console.log('🎲 显示抽取小鸡模态框（占位）');
        alert('抽取小鸡功能开发中...');
    },
    
    showUpgradeModal() {
        console.log('🔧 显示升级养鸡场模态框（占位）');
        alert('升级养鸡场功能开发中...');
    },
    
    collectAllEggs() {
        console.log('🥚 收集所有鸡蛋（占位）');
        alert('收集鸡蛋功能开发中...');
    },
    
    inviteFriend() {
        console.log('👥 邀请好友（占位）');
        alert('邀请好友功能开发中...');
    },
    
    drawChicken() {
        console.log('🎲 抽取小鸡（占位）');
        alert('抽取小鸡功能开发中...');
    },
    
    upgradeCoop(targetLevel) {
        console.log('🔧 升级养鸡场到', targetLevel, '级（占位）');
        alert('升级养鸡场功能开发中...');
    },
    
    confirmFeedChicken() {
        console.log('🌾 确认喂养小鸡（占位）');
        alert('喂养小鸡功能开发中...');
    },
    
    closeModal(modalId) {
        console.log('❌ 关闭模态框:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
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

console.log('🏠 家庭乐园集成好友系统版本JS加载完成');
