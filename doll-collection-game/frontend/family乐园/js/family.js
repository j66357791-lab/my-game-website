// 家庭乐园前端JavaScript - 完整功能版本
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
            const response = await fetch(`${this.getApiBase()}/family/my-family`, {
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
            
            chickenCard.innerHTML = `
                <div class="chicken-header ${qualityClass}">
                    <h3>${chicken.name}</h3>
                    <div class="chicken-level">Lv.${chicken.level}</div>
                    <div class="chicken-quality">${chicken.quality}</div>
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
        const drawBtn = document.getElementById('draw-btn');
        if (!drawBtn) return;
        
        // 检查是否有3级以上的小鸡
        const hasLevel3Chicken = this.familyChickens.some(c => c.level >= 3);
        
        if (hasLevel3Chicken) {
            drawBtn.style.display = 'inline-block';
        } else {
            drawBtn.style.display = 'none';
        }
    },
    
    // 显示喂养模态框
    showFeedModal(chickenId) {
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
    },
    
    // 加载饲料选项
    async loadFeedOptions() {
        try {
            const response = await fetch(`${this.getApiBase()}/family/feed-shop`, {
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
    },
    
    // 喂养小鸡
    async feedChicken(feedId) {
        if (!this.selectedChicken) return;
        
        try {
            const response = await fetch(`${this.getApiBase()}/family/feed-chicken`, {
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
                alert(data.message);
                this.currentUser = data.user;
                this.updateUserPoints();
                this.closeModal('feed-modal');
                this.loadChickenCoopData(); // 重新加载养鸡场数据
            } else {
                alert(data.message || '喂养失败');
            }
        } catch (error) {
            console.error('❌ 喂养小鸡错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 收集鸡蛋
    async collectEgg(chickenId) {
        try {
            const response = await fetch(`${this.getApiBase()}/family/collect-eggs`, {
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
                alert(data.message);
                this.currentUser = data.user;
                this.updateUserPoints();
                this.loadEggStorageData(); // 重新加载鸡蛋仓库
            } else {
                alert(data.message || '收蛋失败');
            }
        } catch (error) {
            console.error('❌ 收集鸡蛋错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // ==================== 饲料商城功能 ====================
    
    // 加载饲料商城数据
    async loadFeedShopData() {
        console.log('🛒 加载饲料商城数据...');
        
        try {
            const response = await fetch(`${this.getApiBase()}/family/feed-shop`, {
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
    },
    
    // 购买饲料
    async buyFeed(feedId) {
        const quantityInput = document.getElementById(`feed-quantity-${feedId}`);
        const quantity = parseInt(quantityInput?.value) || 1;
        
        if (quantity < 1 || quantity > 100) {
            alert('购买数量必须在1-100之间！');
            return;
        }
        
        try {
            const response = await fetch(`${this.getApiBase()}/family/buy-feed`, {
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
                alert(data.message);
                this.currentUser = data.user;
                this.updateUserPoints();
            } else {
                alert(data.message || '购买失败');
            }
        } catch (error) {
            console.error('❌ 购买饲料错误:', error);
            alert('网络错误，请稍后重试');
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
            const response = await fetch(`${this.getApiBase()}/family/my-family`, {
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
    },
    
    // 收集单个鸡蛋
    async collectSingleEgg(eggId) {
        try {
            const response = await fetch(`${this.getApiBase()}/family/collect-eggs`, {
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
                alert(data.message);
                this.currentUser = data.user;
                this.updateUserPoints();
                this.loadEggStorageData(); // 重新加载
            } else {
                alert(data.message || '收集失败');
            }
        } catch (error) {
            console.error('❌ 收集鸡蛋错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 收集所有鸡蛋
    async collectAllEggs() {
        if (this.familyEggs.length === 0) {
            alert('没有可收集的鸡蛋');
            return;
        }
        
        if (!confirm(`确定要收集所有鸡蛋吗？总共${this.familyEggs.reduce((sum, egg) => sum + egg.quantity, 0)}个鸡蛋`)) {
            return;
        }
        
        try {
            const eggIds = this.familyEggs.map(egg => egg._id);
            
            const response = await fetch(`${this.getApiBase()}/family/collect-eggs`, {
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
                alert(data.message);
                this.currentUser = data.user;
                this.updateUserPoints();
                this.loadEggStorageData(); // 重新加载
            } else {
                alert(data.message || '收集失败');
            }
        } catch (error) {
            console.error('❌ 收集所有鸡蛋错误:', error);
            alert('网络错误，请稍后重试');
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
    
    // ==================== 其他功能 ====================
    
    // 显示邀请好友模态框
    showInviteModal() {
        console.log('👥 显示邀请好友模态框');
        
        // 加载好友列表到选择框
        this.loadFriendsToInviteSelect();
        
        const modal = document.getElementById('invite-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    // 加载好友到邀请选择框
    async loadFriendsToInviteSelect() {
        try {
            const response = await fetch(`${this.getApiBase()}/friends`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const select = document.getElementById('invite-friend-select');
                if (select) {
                    select.innerHTML = '<option value="">请选择好友</option>';
                    
                    if (Array.isArray(data.friends)) {
                        data.friends.forEach(friend => {
                            const option = document.createElement('option');
                            option.value = friend.userId._id;
                            option.textContent = friend.userId.username;
                            select.appendChild(option);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('加载好友列表错误:', error);
        }
    },
    
    // 邀请好友
    async inviteFriend() {
        const friendId = document.getElementById('invite-friend-select').value;
        
        if (!friendId) {
            alert('请选择要邀请的好友');
            return;
        }
        
        try {
            const response = await fetch(`${this.getApiBase()}/family/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ friendId: friendId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message);
                this.closeModal('invite-modal');
                this.loadFamilyData(); // 重新加载家庭数据
            } else {
                alert(data.message || '邀请失败');
            }
        } catch (error) {
            console.error('邀请好友错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 显示抽取小鸡模态框
    showDrawModal() {
        console.log('🎲 显示抽取小鸡模态框');
        const modal = document.getElementById('draw-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    // 抽取小鸡
    async drawChicken() {
        try {
            const response = await fetch(`${this.getApiBase()}/family/draw-chicken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message);
                this.currentUser = data.user;
                this.updateUserPoints();
                this.closeModal('draw-modal');
                this.loadChickenCoopData(); // 重新加载养鸡场数据
            } else {
                alert(data.message || '抽取失败');
            }
        } catch (error) {
            console.error('抽取小鸡错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 显示升级养鸡场模态框
    showUpgradeModal() {
        console.log('🔧 显示升级养鸡场模态框');
        const modal = document.getElementById('upgrade-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    // 升级养鸡场
    async upgradeCoop(targetLevel) {
        try {
            const response = await fetch(`${this.getApiBase()}/family/upgrade-coop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetLevel: targetLevel })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message);
                this.currentUser = data.user;
                this.updateUserPoints();
                this.closeModal('upgrade-modal');
                this.loadFamilyData(); // 重新加载家庭数据
            } else {
                alert(data.message || '升级失败');
            }
        } catch (error) {
            console.error('升级养鸡场错误:', error);
            alert('网络错误，请稍后重试');
        }
    },
    
    // 关闭模态框
    closeModal(modalId) {
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

console.log('🏠 家庭乐园完整功能版本JS加载完成');
