// 家庭乐园前端JavaScript
// 全局变量
let currentFamily = null;
let familyChickens = [];
let familyEggs = [];
let feedShopItems = [];
let userFriends = [];
let selectedChicken = null;
let selectedFeed = null;

// API基础地址
const getApiBase = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return '/api';
};

const API_BASE = getApiBase();

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化家庭乐园...');
    
    // 初始化事件监听器
    initEventListeners();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 加载家庭数据
    loadFamilyData();
});

// 初始化事件监听器
function initEventListeners() {
    // 导航链接
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const panelId = this.getAttribute('data-panel');
            showPanel(panelId);
        });
    });
    
    // 退出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        validateToken(token);
    } else {
        // 重定向到主页登录
        window.location.href = '../index.html';
    }
}

// 验证token
async function validateToken(token) {
    try {
        const response = await fetch(`${API_BASE}/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData.user;
            updateUserPoints();
        } else {
            localStorage.removeItem('token');
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.error('Token验证失败:', error);
        window.location.href = '../index.html';
    }
}

// 更新用户积分显示
function updateUserPoints() {
    if (currentUser) {
        const userPoints = document.getElementById('user-points');
        if (userPoints) {
            userPoints.textContent = currentUser.points.toFixed(2) + ' 积分';
        }
    }
}

// 处理退出
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '../index.html';
}

// 显示面板
function showPanel(panelId) {
    // 隐藏所有面板
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 显示选中的面板
    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
    
    // 更新导航链接状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-panel="${panelId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // 加载特定面板的数据
    if (panelId === 'family-home') {
        loadFamilyData();
    } else if (panelId === 'chicken-coop') {
        loadChickenCoopData();
    } else if (panelId === 'feed-shop') {
        loadFeedShopData();
    } else if (panelId === 'egg-storage') {
        loadEggStorageData();
    }
}

// 加载家庭数据
async function loadFamilyData() {
    try {
        const response = await fetch(`${API_BASE}/family/my-family`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentFamily = data.family;
            familyChickens = data.chickens || [];
            familyEggs = data.eggs || [];
            
            updateFamilyDisplay();
            updateFamilyStats();
        } else {
            showCreateFamilyModal();
        }
    } catch (error) {
        console.error('加载家庭数据错误:', error);
        showCreateFamilyModal();
    }
}

// 显示创建家庭模态框
function showCreateFamilyModal() {
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
                <button class="btn btn-primary btn-block" onclick="createFamily()">
                    <i class="fas fa-home"></i> 创建家庭
                </button>
            </div>
        `;
    }
}

// 创建家庭
async function createFamily() {
    const familyName = document.getElementById('family-name-input').value.trim();
    
    if (!familyName) {
        alert('请输入家庭名称');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/family/create`, {
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
            loadFamilyData();
        } else {
            alert(data.message || '创建家庭失败');
        }
    } catch (error) {
        console.error('创建家庭错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 更新家庭显示
function updateFamilyDisplay() {
    if (!currentFamily) return;
    
    const familyDetails = document.getElementById('family-details');
    if (familyDetails) {
        familyDetails.innerHTML = `
            <div class="family-detail-item">
                <div class="family-detail-label">家庭名称</div>
                <div class="family-detail-value">${currentFamily.name}</div>
            </div>
            <div class="family-detail-item">
                <div class="family-detail-label">家庭等级</div>
                <div class="family-detail-value">${currentFamily.level}级</div>
            </div>
            <div class="family-detail-item">
                <div class="family-detail-label">养鸡场容量</div>
                <div class="family-detail-value">${currentFamily.maxChickens}只</div>
            </div>
            <div class="family-detail-item">
                <div class="family-detail-label">创建时间</div>
                <div class="family-detail-value">${new Date(currentFamily.createdAt).toLocaleDateString()}</div>
            </div>
        `;
    }
    
    // 更新家庭成员列表
    updateFamilyMembers();
}

// 更新家庭成员列表
function updateFamilyMembers() {
    const membersList = document.getElementById('family-members-list');
    if (!membersList || !currentFamily) return;
    
    membersList.innerHTML = '';
    
    // 添加家庭主人
    const ownerCard = document.createElement('div');
    ownerCard.className = 'member-card';
    ownerCard.innerHTML = `
        <div class="member-avatar">${currentFamily.ownerId.username.charAt(0).toUpperCase()}</div>
        <div class="member-info">
            <div class="member-name">${currentFamily.ownerId.username}</div>
            <div class="member-role">家庭主人</div>
            <div class="member-join-date">创建于 ${new Date(currentFamily.createdAt).toLocaleDateString()}</div>
        </div>
    `;
    membersList.appendChild(ownerCard);
    
    // 添加家庭成员
    if (currentFamily.members && currentFamily.members.length > 0) {
        currentFamily.members.forEach(member => {
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
}

// 更新家庭统计
function updateFamilyStats() {
    const totalChickens = document.getElementById('total-chickens');
    const adultChickens = document.getElementById('adult-chickens');
    const totalEggs = document.getElementById('total-eggs');
    const coopLevel = document.getElementById('coop-level');
    const coopLevelDisplay = document.getElementById('coop-level-display');
    const coopCapacity = document.getElementById('coop-capacity');
    
    if (totalChickens) {
        totalChickens.textContent = familyChickens.length;
    }
    
    if (adultChickens) {
        adultChickens.textContent = familyChickens.filter(c => c.isAdult).length;
    }
    
    if (totalEggs) {
        totalEggs.textContent = familyEggs.reduce((sum, egg) => sum + egg.quantity, 0);
    }
    
    if (currentFamily) {
        if (coopLevel) coopLevel.textContent = currentFamily.level;
        if (coopLevelDisplay) coopLevelDisplay.textContent = currentFamily.level;
        if (coopCapacity) coopCapacity.textContent = `${familyChickens.length}/${currentFamily.maxChickens}`;
    }
}

// 加载养鸡场数据
async function loadChickenCoopData() {
    try {
        const response = await fetch(`${API_BASE}/family/my-family`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentFamily = data.family;
            familyChickens = data.chickens || [];
            
            updateChickenCoopDisplay();
            updateDrawButtonVisibility();
        }
    } catch (error) {
        console.error('加载养鸡场数据错误:', error);
    }
}

// 更新养鸡场显示
function updateChickenCoopDisplay() {
    const chickensContainer = document.getElementById('chickens-container');
    if (!chickensContainer) return;
    
    chickensContainer.innerHTML = '';
    
    if (familyChickens.length === 0) {
        chickensContainer.innerHTML = '<p>还没有小鸡，快去邀请好友或者抽取吧！</p>';
        return;
    }
    
    familyChickens.forEach(chicken => {
        const chickenCard = document.createElement('div');
        chickenCard.className = 'chicken-card';
        chickenCard.innerHTML = `
            <div class="chicken-header">
                <div class="chicken-name">${chicken.name}</div>
                <div class="chicken-level">Lv.${chicken.level}</div>
                <div class="chicken-quality quality-${chicken.quality}">${chicken.quality}</div>
            </div>
            <div class="chicken-stats">
                <div class="chicken-stat">
                    <i class="fas fa-chart-line"></i>
                    <span>成长值: ${chicken.growthValue}</span>
                </div>
                <div class="chicken-stat">
                    <i class="fas fa-heart"></i>
                    <span>寿命: ${chicken.lifespan}天</span>
                </div>
                <div class="chicken-stat">
                    <i class="fas fa-calendar"></i>
                    <span>状态: ${chicken.isAdult ? '成年' : '幼年'}</span>
                </div>
            </div>
            <div class="chicken-actions">
                <button class="btn btn-primary" onclick="feedChicken('${chicken._id}')">
                    <i class="fas fa-seedling"></i> 喂养
                </button>
            </div>
        `;
        chickensContainer.appendChild(chickenCard);
    });
}

// 更新抽取按钮显示
function updateDrawButtonVisibility() {
    const drawBtn = document.getElementById('draw-btn');
    if (!drawBtn || !currentFamily) return;
    
    // 检查是否有3级以上的小鸡
    const hasLevel3Chicken = familyChickens.some(c => c.level >= 3);
    
    if (hasLevel3Chicken) {
        drawBtn.style.display = 'inline-block';
    } else {
        drawBtn.style.display = 'none';
    }
}

// 加载饲料商城数据
async function loadFeedShopData() {
    try {
        const response = await fetch(`${API_BASE}/family/feed-shop`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            feedShopItems = data.feeds || [];
            updateFeedShopDisplay();
        }
    } catch (error) {
        console.error('加载饲料商城错误:', error);
    }
}

// 更新饲料商城显示
function updateFeedShopDisplay() {
    const shopContainer = document.getElementById('feed-shop-container');
    if (!shopContainer) return;
    
    shopContainer.innerHTML = '';
    
    if (feedShopItems.length === 0) {
        shopContainer.innerHTML = '<p>饲料商城暂时空空</p>';
        return;
    }
    
    feedShopItems.forEach(feed => {
        const feedCard = document.createElement('div');
        feedCard.className = `feed-card ${feed.isSpecial ? 'feed-special' : ''}`;
        feedCard.innerHTML = `
            <div class="feed-header">
                <div class="feed-name">${feed.name}</div>
                <div class="feed-price">${feed.price} 积分</div>
            </div>
            <div class="feed-stats">
                <div class="feed-stat">
                    <div class="feed-stat-value">${feed.growthValue}</div>
                    <div class="feed-stat-label">成长值</div>
                </div>
                ${feed.isSpecial ? `
                <div class="feed-stat">
                    <div class="feed-stat-value">${feed.minGrowth}-${feed.maxGrowth}</div>
                    <div class="feed-stat-label">随机范围</div>
                </div>
                ` : ''}
            </div>
            <div class="feed-description">${feed.description}</div>
            <button class="btn btn-primary btn-block" onclick="buyFeed('${feed._id}')">
                <i class="fas fa-shopping-cart"></i> 购买
            </button>
        `;
        shopContainer.appendChild(feedCard);
    });
}

// 购买饲料
async function buyFeed(feedId) {
    try {
        const response = await fetch(`${API_BASE}/family/buy-feed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ feedId, quantity: 1 })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            currentUser = data.user;
            updateUserPoints();
        } else {
            alert(data.message || '购买失败');
        }
    } catch (error) {
        console.error('购买饲料错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 加载鸡蛋仓库数据
async function loadEggStorageData() {
    try {
        const response = await fetch(`${API_BASE}/family/my-family`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentFamily = data.family;
            familyEggs = data.eggs || [];
            
            updateEggStorageDisplay();
        }
    } catch (error) {
        console.error('加载鸡蛋仓库错误:', error);
    }
}

// 更新鸡蛋仓库显示
function updateEggStorageDisplay() {
    const availableEggs = document.getElementById('available-eggs');
    const eggsContainer = document.getElementById('eggs-container');
    
    if (availableEggs) {
        availableEggs.textContent = familyEggs.reduce((sum, egg) => sum + egg.quantity, 0);
    }
    
    if (!eggsContainer) return;
    
    eggsContainer.innerHTML = '';
    
    if (familyEggs.length === 0) {
        eggsContainer.innerHTML = '<p>还没有鸡蛋，等待小鸡下蛋吧！</p>';
        return;
    }
    
    familyEggs.forEach(egg => {
        const eggCard = document.createElement('div');
        eggCard.className = 'egg-card';
        eggCard.innerHTML = `
            <div class="egg-icon">
                <i class="fas fa-egg"></i>
            </div>
            <div class="egg-quantity">${egg.quantity} 个</div>
            <div class="egg-info">
                来自 ${egg.chickenId.name}
            </div>
            <div class="egg-actions">
                <button class="btn btn-success" onclick="collectEgg('${egg._id}')">
                    <i class="fas fa-coins"></i> 收集
                </button>
            </div>
        `;
        eggsContainer.appendChild(eggCard);
    });
}

// 收集所有鸡蛋
async function collectAllEggs() {
    const eggIds = familyEggs.map(egg => egg._id);
    await collectEggs(eggIds);
}

// 收集鸡蛋
async function collectEggs(eggIds) {
    try {
        const response = await fetch(`${API_BASE}/family/collect-eggs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ eggIds: Array.isArray(eggIds) ? eggIds : [eggIds] })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            currentUser = data.user;
            updateUserPoints();
            loadEggStorageData();
        } else {
            alert(data.message || '收集失败');
        }
    } catch (error) {
        console.error('收集鸡蛋错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 显示邀请好友模态框
function showInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.style.display = 'flex';
        loadFriendsForInvite();
    }
}

// 加载好友列表用于邀请
async function loadFriendsForInvite() {
    try {
        const response = await fetch(`${API_BASE}/friends`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            userFriends = data.friends || [];
            updateFriendSelect();
        }
    } catch (error) {
        console.error('加载好友列表错误:', error);
    }
}

// 更新好友选择框
function updateFriendSelect() {
    const selectElement = document.getElementById('invite-friend-select');
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">请选择好友</option>';
    
    userFriends.forEach(friend => {
        const option = document.createElement('option');
        option.value = friend.userId._id;
        option.textContent = friend.userId.username;
        selectElement.appendChild(option);
    });
}

// 邀请好友
async function inviteFriend() {
    const friendId = document.getElementById('invite-friend-select').value;
    
    if (!friendId) {
        alert('请选择好友');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/family/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ friendId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            closeModal('invite-modal');
            loadFamilyData();
        } else {
            alert(data.message || '邀请失败');
        }
    } catch (error) {
        console.error('邀请好友错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 显示抽取小鸡模态框
function showDrawModal() {
    const modal = document.getElementById('draw-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 抽取小鸡
async function drawChicken() {
    try {
        const response = await fetch(`${API_BASE}/family/draw-chicken`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            currentUser = data.user;
            updateUserPoints();
            closeModal('draw-modal');
            loadChickenCoopData();
        } else {
            alert(data.message || '抽取失败');
        }
    } catch (error) {
        console.error('抽取小鸡错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 显示升级养鸡场模态框
function showUpgradeModal() {
    const modal = document.getElementById('upgrade-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 升级养鸡场
async function upgradeCoop(targetLevel) {
    try {
        const response = await fetch(`${API_BASE}/family/upgrade-coop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ targetLevel })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            currentUser = data.user;
            updateUserPoints();
            closeModal('upgrade-modal');
            loadFamilyData();
            loadChickenCoopData();
        } else {
            alert(data.message || '升级失败');
        }
    } catch (error) {
        console.error('升级养鸡场错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 喂养小鸡
async function feedChicken(chickenId) {
    try {
        // 获取小鸡信息
        const chicken = familyChickens.find(c => c._id === chickenId);
        if (!chicken) return;
        
        selectedChicken = chicken;
        
        // 显示喂养模态框
        const modal = document.getElementById('feed-chicken-modal');
        if (modal) {
            // 更新小鸡信息显示
            const chickenInfo = document.getElementById('feed-chicken-info');
            if (chickenInfo) {
                chickenInfo.innerHTML = `
                    <div class="chicken-preview">
                        <h4>${chicken.name}</h4>
                        <div class="chicken-preview-stats">
                            <div class="chicken-stat">
                                <span>等级: ${chicken.level}</span>
                            </div>
                            <div class="chicken-stat">
                                <span>品质: ${chicken.quality}</span>
                            </div>
                            <div class="chicken-stat">
                                <span>成长值: ${chicken.growthValue}</span>
                            </div>
                            <div class="chicken-stat">
                                <span>寿命: ${chicken.lifespan}天</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // 加载饲料选项
            loadFeedOptions(chickenId);
            
            modal.style.display = 'flex';
        }
    } catch (error) {
        console.error('准备喂养小鸡错误:', error);
    }
}

// 加载饲料选项
async function loadFeedOptions(chickenId) {
    try {
        const response = await fetch(`${API_BASE}/family/feed-shop`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const feeds = data.feeds || [];
            const optionsContainer = document.getElementById('feed-options-container');
            
            if (optionsContainer) {
                optionsContainer.innerHTML = '';
                
                feeds.forEach(feed => {
                    const feedOption = document.createElement('div');
                    feedOption.className = 'feed-option';
                    feedOption.innerHTML = `
                        <label>
                            <input type="radio" name="feed-select" value="${feed._id}">
                            <span class="feed-name">${feed.name}</span>
                            <span class="feed-price">${feed.price} 积分</span>
                            <span class="feed-growth">+${feed.growthValue} 成长值</span>
                        </label>
                    `;
                    optionsContainer.appendChild(feedOption);
                });
            }
        }
    } catch (error) {
        console.error('加载饲料选项错误:', error);
    }
}

// 确认喂养小鸡
async function confirmFeedChicken() {
    const selectedFeedRadio = document.querySelector('input[name="feed-select"]:checked');
    
    if (!selectedFeedRadio) {
        alert('请选择饲料');
        return;
    }
    
    const feedId = selectedFeedRadio.value;
    const chickenId = selectedChicken._id;
    
    try {
        const response = await fetch(`${API_BASE}/family/feed-chicken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ chickenId, feedId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            currentUser = data.user;
            updateUserPoints();
            closeModal('feed-chicken-modal');
            loadChickenCoopData();
        } else {
            alert(data.message || '喂养失败');
        }
    } catch (error) {
        console.error('喂养小鸡错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
