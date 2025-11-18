// 娃娃收藏游戏 - 前端JavaScript
// 全局变量
let currentUser = null;
let userDolls = [];
let allUsers = [];
let selectedDollsForSynthesis = [null, null];
let autoIncomeTimer = null;
let lastPayoutTime = null;

// 自动检测环境并设置API基础地址
const getApiBase = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // 开发环境：localhost或127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // 生产环境：使用相对路径
    return '/api';
};

const API_BASE = getApiBase();
console.log('🌐 API基础地址:', API_BASE);
console.log('🚀 当前环境:', window.location.hostname);

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化娃娃收藏游戏...');
    
    // 初始化事件监听器
    initEventListeners();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 启动自动收益系统
    startAutoIncomeSystem();
    
    // 检查服务器连接状态
    checkServerStatus();
});

// 初始化所有事件监听器
function initEventListeners() {
    console.log('初始化事件监听器...');
    
    // 导航链接
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const panelId = this.getAttribute('data-panel');
            console.log('切换面板:', panelId);
            showPanel(panelId);
        });
    });
    
    // 表单提交
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // 退出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 合成积分输入
    const synthesisPoints = document.getElementById('synthesis-points');
    if (synthesisPoints) {
        synthesisPoints.addEventListener('input', updateSuccessRate);
    }
    
    // 购买按钮
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const level = parseInt(this.getAttribute('data-level'));
            buyDoll(level);
        });
    });
    
    // 合成按钮
    const synthesisBtn = document.getElementById('synthesis-btn');
    if (synthesisBtn) {
        synthesisBtn.addEventListener('click', synthesizeDolls);
    }
    
    console.log('事件监听器初始化完成');
}

// ✅ 新增：自动收益系统
function startAutoIncomeSystem() {
    if (autoIncomeTimer) {
        clearInterval(autoIncomeTimer);
    }
    
    // 每分钟检查一次是否需要发放收益
    autoIncomeTimer = setInterval(async () => {
        if (!currentUser) return;
        
        try {
            // 检查是否到了发放时间（每天24:00）
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 24, 0, 0, 0);
            const nextPayout = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            
            // 如果当前时间超过了下次发放时间，就发放收益
            if (now >= nextPayout) {
                await distributeDailyIncome();
            }
            
            // 更新下次发放时间显示
            updateNextPayoutTime();
            
        } catch (error) {
            console.error('自动收益系统错误:', error);
        }
    }, 60000); // 每分钟检查一次
    
    console.log('✅ 自动收益系统已启动');
}

// ✅ 新增：发放每日收益
async function distributeDailyIncome() {
    if (!currentUser) return;
    
    try {
        // 获取用户所有活跃娃娃
        const response = await fetch(`${API_BASE}/dolls/my-dolls`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            console.error('获取娃娃数据失败');
            return;
        }
        
        const data = await response.json();
        const dolls = Array.isArray(data.dolls) ? data.dolls : [];
        const activeDolls = dolls.filter(doll => doll.active);
        
        if (activeDolls.length === 0) {
            console.log('没有活跃娃娃，跳过收益发放');
            return;
        }
        
        // 计算总收益
        const totalIncome = activeDolls.reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
        
        if (totalIncome <= 0) {
            console.log('总收益为0，跳过发放');
            return;
        }
        
        // 调用后端接口发放收益
        const payoutResponse = await fetch(`${API_BASE}/admin/distribute-income`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: currentUser.id,
                amount: totalIncome
            })
        });
        
        if (payoutResponse.ok) {
            const payoutData = await payoutResponse.json();
            
            // 更新用户积分
            currentUser.points = payoutData.user.points;
            updateUI();
            
            // 更新娃娃数据
            userDolls = Array.isArray(payoutData.dolls) ? payoutData.dolls : [];
            updateUserStats();
            updateMyDollsList();
            updateBackpackDisplay();
            
            // 更新发放记录
            updatePayoutHistory(totalIncome);
            
            // 更新上次发放时间
            lastPayoutTime = new Date();
            updateLastPayoutTime();
            
            console.log(`✅ 自动发放收益成功: ${totalIncome.toFixed(2)} 积分`);
            
            // 显示通知
            showIncomeNotification(totalIncome);
            
        } else {
            console.error('发放收益失败:', payoutResponse.statusText);
        }
        
    } catch (error) {
        console.error('发放收益错误:', error);
    }
}

// ✅ 新增：显示收益通知
function showIncomeNotification(amount) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'income-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-coins"></i>
            <div class="notification-text">
                <div class="notification-title">收益发放成功！</div>
                <div class="notification-amount">+${amount.toFixed(2)} 积分</div>
            </div>
        </div>
    `;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        animation: slideInRight 0.5s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// ✅ 新增：更新上次发放时间
function updateLastPayoutTime() {
    const element = document.getElementById('last-payout-time');
    if (element) {
        if (lastPayoutTime) {
            element.textContent = lastPayoutTime.toLocaleString();
        } else {
            element.textContent = '从未发放';
        }
    }
}

// ✅ 新增：更新下次发放时间
function updateNextPayoutTime() {
    const element = document.getElementById('next-payout-time');
    if (element) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 24, 0, 0, 0);
        const nextPayout = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        // 如果当前时间已经超过了今天的发放时间，就显示明天的
        if (now >= today) {
            const tomorrow = new Date(nextPayout.getTime() + 24 * 60 * 60 * 1000);
            element.textContent = tomorrow.toLocaleString();
        } else {
            element.textContent = nextPayout.toLocaleString();
        }
    }
}

// ✅ 新增：更新发放记录
function updatePayoutHistory(amount) {
    const historyContainer = document.getElementById('payout-history');
    if (!historyContainer) return;
    
    const now = new Date();
    const historyItem = document.createElement('div');
    historyItem.className = 'payout-item';
    historyItem.innerHTML = `
        <div class="payout-time">${now.toLocaleString()}</div>
        <div class="payout-amount">+${amount.toFixed(2)} 积分</div>
    `;
    
    // 添加样式
    historyItem.style.cssText = `
        padding: 10px;
        margin-bottom: 8px;
        background-color: #f8f9fa;
        border-radius: 5px;
        border-left: 4px solid #28a745;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: fadeIn 0.3s ease-out;
    `;
    
    // 插入到顶部
    if (historyContainer.firstChild) {
        historyContainer.insertBefore(historyItem, historyContainer.firstChild);
    } else {
        historyContainer.appendChild(historyItem);
    }
    
    // 只保留最近10条记录
    while (historyContainer.children.length > 10) {
        historyContainer.removeChild(historyContainer.lastChild);
    }
}

// ✅ 新增：背包筛选功能
function filterBackpackDolls() {
    if (!userDolls || !Array.isArray(userDolls)) {
        console.error('userDolls不是有效的数组:', userDolls);
        return;
    }
    
    const levelFilter = document.getElementById('backpack-level-filter')?.value || 'all';
    const statusFilter = document.getElementById('backpack-status-filter')?.value || 'all';
    const sortFilter = document.getElementById('backpack-sort-filter')?.value || 'newest';
    
    let filteredDolls = [...userDolls];
    
    // 应用筛选条件
    if (levelFilter !== 'all') {
        filteredDolls = filteredDolls.filter(doll => doll.level === parseInt(levelFilter));
    }
    
    if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        filteredDolls = filteredDolls.filter(doll => doll.active === isActive);
    }
    
    // 应用排序
    switch (sortFilter) {
        case 'newest':
            filteredDolls.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
            break;
        case 'oldest':
            filteredDolls.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
            break;
        case 'level-desc':
            filteredDolls.sort((a, b) => b.level - a.level);
            break;
        case 'level-asc':
            filteredDolls.sort((a, b) => a.level - b.level);
            break;
        case 'income-desc':
            filteredDolls.sort((a, b) => (b.dailyIncome || 0) - (a.dailyIncome || 0));
            break;
        case 'income-asc':
            filteredDolls.sort((a, b) => (a.dailyIncome || 0) - (b.dailyIncome || 0));
            break;
    }
    
    // 更新显示
    updateBackpackDisplay(filteredDolls);
    updateBackpackStats(userDolls.length, filteredDolls.length);
}

// ✅ 新增：重置背包筛选
function resetBackpackFilters() {
    document.getElementById('backpack-level-filter').value = 'all';
    document.getElementById('backpack-status-filter').value = 'all';
    document.getElementById('backpack-sort-filter').value = 'newest';
    filterBackpackDolls();
}

// ✅ 新增：更新背包显示
function updateBackpackDisplay(dolls = null) {
    const backpackGrid = document.getElementById('my-dolls');
    if (!backpackGrid) return;
    
    const dollsToDisplay = dolls || userDolls;
    
    if (!dollsToDisplay || !Array.isArray(dollsToDisplay)) {
        backpackGrid.innerHTML = '<p>数据加载中...</p>';
        return;
    }
    
    backpackGrid.innerHTML = '';
    
    if (dollsToDisplay.length === 0) {
        backpackGrid.innerHTML = '<p>您还没有任何娃娃，快去购买吧！</p>';
        return;
    }
    
    dollsToDisplay.forEach((doll, index) => {
        const backpackItem = document.createElement('div');
        backpackItem.className = `backpack-item ${!doll.active ? 'inactive' : ''}`;
        backpackItem.innerHTML = `
            <div class="backpack-item-header level-${doll.level}">
                <div class="backpack-item-title">${doll.level}级娃娃</div>
                <div class="backpack-item-id">ID: ${doll._id ? doll._id.substring(0, 8) + '...' : '未知'}</div>
                <div class="backpack-item-status">${doll.active ? '活跃' : '非活跃'}</div>
            </div>
            <div class="backpack-item-body">
                <div class="backpack-item-info">
                    <div class="backpack-item-info-item">
                        <i class="fas fa-gem"></i>
                        <span>每日收益</span>
                    </div>
                    <div class="backpack-item-info-item">
                        <span>${doll.dailyIncome || 0} 积分</span>
                    </div>
                </div>
                <div class="backpack-item-info">
                    <div class="backpack-item-info-item">
                        <i class="fas fa-clock"></i>
                        <span>剩余天数</span>
                    </div>
                    <div class="backpack-item-info-item">
                        <span>${doll.remainingDays || 0} 天</span>
                    </div>
                </div>
                <div class="backpack-item-info">
                    <div class="backpack-item-info-item">
                        <i class="fas fa-calendar"></i>
                        <span>购买日期</span>
                    </div>
                    <div class="backpack-item-info-item">
                        <span>${doll.purchaseDate ? new Date(doll.purchaseDate).toLocaleDateString() : '未知'}</span>
                    </div>
                </div>
                <div class="backpack-item-income">
                    <i class="fas fa-coins"></i>
                    每日收益: ${doll.dailyIncome || 0} 积分
                </div>
                <div class="backpack-item-actions">
                    ${doll.active ? 
                        `<button class="btn btn-sm btn-success" onclick="activateDoll('${doll._id}')">激活</button>` :
                        `<button class="btn btn-sm btn-warning" onclick="activateDoll('${doll._id}')">激活</button>`
                    }
                    <button class="btn btn-sm btn-danger" onclick="sellDoll('${doll._id}')">出售</button>
                </div>
            </div>
        `;
        
        backpackGrid.appendChild(backpackItem);
    });
}

// ✅ 新增：更新背包统计
function updateBackpackStats(total, filtered) {
    const totalElement = document.getElementById('backpack-total');
    const filteredElement = document.getElementById('backpack-filtered');
    const valueElement = document.getElementById('backpack-total-value');
    
    if (totalElement) totalElement.textContent = total;
    if (filteredElement) filteredElement.textContent = filtered;
    
    if (valueElement) {
        const totalValue = userDolls.reduce((sum, doll) => {
            return sum + (doll.level === 1 ? 50 : doll.level === 2 ? 200 : 500);
        }, 0);
        valueElement.textContent = `${totalValue} 积分`;
    }
}

// ✅ 新增：激活娃娃
async function activateDoll(dollId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/dolls/activate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ dollId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('娃娃激活成功！');
            loadUserData(); // 重新加载数据
        } else {
            alert(data.message || '激活失败');
        }
    } catch (error) {
        console.error('激活娃娃错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// ✅ 新增：出售娃娃
async function sellDoll(dollId) {
    const doll = userDolls.find(d => d._id === dollId);
    if (!doll) return;
    
    const sellPrice = doll.level === 1 ? 25 : doll.level === 2 ? 100 : 250;
    
    if (!confirm(`确定要以 ${sellPrice} 积分的价格出售这个${doll.level}级娃娃吗？此操作不可恢复！`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/dolls/sell`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ dollId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser.points = data.user.points;
            updateUI();
            loadUserData(); // 重新加载数据
            alert(`娃娃出售成功！获得 ${sellPrice} 积分`);
        } else {
            alert(data.message || '出售失败');
        }
    } catch (error) {
        console.error('出售娃娃错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 检查服务器状态
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            const statusElement = document.getElementById('server-status');
            if (statusElement) {
                statusElement.textContent = '在线';
                statusElement.style.color = 'green';
            }
        } else {
            const statusElement = document.getElementById('server-status');
            if (statusElement) {
                statusElement.textContent = '离线';
                statusElement.style.color = 'red';
            }
        }
    } catch (error) {
        const statusElement = document.getElementById('server-status');
        if (statusElement) {
            statusElement.textContent = '连接失败';
            statusElement.style.color = 'red';
        }
        console.error('服务器连接失败:', error);
    }
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        validateToken(token);
    } else {
        showLoginModal();
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
            updateUI();
            loadUserData();
        } else {
            localStorage.removeItem('token');
            showLoginModal();
        }
    } catch (error) {
        console.error('Token验证失败:', error);
        showLoginModal();
    }
}

// 显示登录模态框
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 显示注册模态框
function showRegisterModal() {
    closeModal('login-modal');
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            throw new Error('服务器返回了错误的响应格式');
        }
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUI();
            closeModal('login-modal');
            loadUserData();
            alert('登录成功！');
        } else {
            alert(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        if (error.message.includes('JSON')) {
            alert('服务器连接错误，请检查后端服务是否运行');
        } else {
            alert('网络错误，请稍后重试');
        }
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('注册成功！请登录。');
            showLoginModal();
        } else {
            alert(data.message || '注册失败');
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 处理退出
function handleLogout() {
    // 停止自动收益系统
    if (autoIncomeTimer) {
        clearInterval(autoIncomeTimer);
        autoIncomeTimer = null;
    }
    
    localStorage.removeItem('token');
    currentUser = null;
    userDolls = [];
    updateUI();
    showLoginModal();
}

// 更新UI
function updateUI() {
    if (currentUser) {
        const userPoints = document.getElementById('user-points');
        if (userPoints) {
            userPoints.textContent = currentUser.points.toFixed(2) + ' 积分';
        }
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username.charAt(0).toUpperCase()}`;
        }
        
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = currentUser.role === 'admin' ? 'block' : 'none';
        }
        
        // 显示用户区域，隐藏登录区域
        const userArea = document.getElementById('user-area');
        const loginArea = document.getElementById('login-area');
        if (userArea && loginArea) {
            userArea.style.display = 'flex';
            loginArea.style.display = 'none';
        }
    } else {
        const userPoints = document.getElementById('user-points');
        if (userPoints) {
            userPoints.textContent = '0.00 积分';
        }
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
        
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = 'none';
        }
        
        // 显示登录区域，隐藏用户区域
        const userArea = document.getElementById('user-area');
        const loginArea = document.getElementById('login-area');
        if (userArea && loginArea) {
            userArea.style.display = 'none';
            loginArea.style.display = 'flex';
        }
    }
}

// 加载用户数据
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        // 获取用户娃娃
        const response = await fetch(`${API_BASE}/dolls/my-dolls`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('从API获取的娃娃数据:', data.dolls);
            userDolls = Array.isArray(data.dolls) ? data.dolls : [];
            updateUserStats();
            updateMyDollsList();
            updateBackpackDisplay();
            updateBackpackStats(userDolls.length, userDolls.length);
        }
    } catch (error) {
        console.error('加载用户数据错误:', error);
    }
}

// 更新用户统计信息
function updateUserStats() {
    if (!userDolls || !Array.isArray(userDolls)) {
        console.error('userDolls不是有效的数组:', userDolls);
        resetStats();
        return;
    }
    
    const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
    
    const totalDolls = validDolls.length;
    const activeDolls = validDolls.filter(doll => doll.active).length;
    const dailyIncome = validDolls.reduce((sum, doll) => {
        return sum + (doll.active ? (doll.dailyIncome || 0) : 0);
    }, 0);
    
    const avgLifespan = totalDolls > 0 ? 
        validDolls.reduce((sum, doll) => sum + (doll.lifespan || 0), 0) / totalDolls : 0;
    
    // 更新UI
    const elements = {
        'total-dolls': totalDolls,
        'active-dolls': activeDolls,
        'daily-income': dailyIncome.toFixed(2),
        'avg-lifespan': Math.round(avgLifespan),
        'expected-payout': dailyIncome.toFixed(2)
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
    // 计算分级收益
    const level1Income = validDolls
        .filter(doll => doll.level === 1 && doll.active)
        .reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
    const level2Income = validDolls
        .filter(doll => doll.level === 2 && doll.active)
        .reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
    const level3Income = validDolls
        .filter(doll => doll.level === 3 && doll.active)
        .reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
        
    const levelElements = {
        'level1-income': level1Income.toFixed(2),
        'level2-income': level2Income.toFixed(2),
        'level3-income': level3Income.toFixed(2)
    };
    
    Object.keys(levelElements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = levelElements[id];
        }
    });
}

// 重置统计信息
function resetStats() {
    const elements = [
        'total-dolls', 'active-dolls', 'daily-income', 
        'avg-lifespan', 'expected-payout', 'level1-income', 
        'level2-income', 'level3-income'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = id.includes('income') || id === 'expected-payout' ? '0.00' : '0';
        }
    });
}

// 更新我的娃娃列表
function updateMyDollsList() {
    const myDollsContainer = document.getElementById('my-dolls');
    if (!myDollsContainer) return;
    
    myDollsContainer.innerHTML = '';
    
    if (!userDolls || !Array.isArray(userDolls)) {
        myDollsContainer.innerHTML = '<p>数据加载中...</p>';
        return;
    }
    
    const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
    
    if (validDolls.length === 0) {
        myDollsContainer.innerHTML = '<p>您还没有任何娃娃，快去购买吧！</p>';
        return;
    }
    
    validDolls.forEach(doll => {
        const dollCard = document.createElement('div');
        dollCard.className = 'doll-card';
        dollCard.innerHTML = `
            <div class="doll-header">
                <h3>${doll.level}级娃娃</h3>
                <div class="doll-level">ID: ${doll._id ? doll._id.substring(0, 8) + '...' : '未知'}</div>
            </div>
            <div class="doll-body">
                <div class="doll-feature">
                    <i class="fas fa-gem"></i>
                    <span>每日收益 ${doll.dailyIncome || 0} 积分</span>
                </div>
                <div class="doll-feature">
                    <i class="fas fa-clock"></i>
                    <span>剩余 ${doll.remainingDays || 0} 天</span>
                </div>
                <div class="doll-feature">
                    <i class="fas fa-calendar"></i>
                    <span>购买日期 ${doll.purchaseDate ? new Date(doll.purchaseDate).toLocaleDateString() : '未知日期'}</span>
                </div>
                <div class="doll-feature">
                    <i class="fas fa-power-off"></i>
                    <span>状态: ${doll.active ? '活跃' : '非活跃'}</span>
                </div>
            </div>
        `;
        myDollsContainer.appendChild(dollCard);
    });
}

// 更新收益倒计时
function updateCountdown() {
    const now = new Date();
    const target = new Date();
    target.setHours(24, 0, 0, 0);
    
    if (now > target) {
        target.setDate(target.getDate() + 1);
    }
    
    const diff = target - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    const hoursElement = document.getElementById('countdown-hours');
    const minutesElement = document.getElementById('countdown-minutes');
    
    if (hoursElement) {
        hoursElement.textContent = hours.toString().padStart(2, '0');
    }
    if (minutesElement) {
        minutesElement.textContent = minutes.toString().padStart(2, '0');
    }
}

// 购买娃娃
async function buyDoll(level) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/dolls/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ level })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser.points = data.user.points;
            
            if (data.doll && typeof data.doll === 'object') {
                userDolls.push(data.doll);
            }
            
            updateUI();
            updateUserStats();
            updateMyDollsList();
            updateBackpackDisplay();
            updateBackpackStats(userDolls.length, userDolls.length);
            alert(`成功购买${level}级娃娃！`);
        } else {
            alert(data.message || '购买失败');
        }
    } catch (error) {
        console.error('购买娃娃错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 显示面板
function showPanel(panelId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
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
    if (panelId === 'synthesis-panel') {
        updateAvailableDolls();
        loadSynthesisRecords();
    } else if (panelId === 'admin-panel' && currentUser.role === 'admin') {
        loadAdminData();
    }
}

// 打开合成面板
function openSynthesisPanel() {
    showPanel('synthesis-panel');
}

// 更新可用娃娃列表
function updateAvailableDolls() {
    const availableDollsContainer = document.getElementById('available-dolls');
    if (!availableDollsContainer) return;
    
    availableDollsContainer.innerHTML = '';
    
    if (!userDolls || !Array.isArray(userDolls)) {
        availableDollsContainer.innerHTML = '<p>数据加载中...</p>';
        return;
    }
    
    const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
    const availableDolls = validDolls.filter(doll => doll.active && doll.level < 3);
    
    if (availableDolls.length === 0) {
        availableDollsContainer.innerHTML = '<p>没有可用的娃娃进行合成！</p>';
        return;
    }
    
    availableDolls.forEach(doll => {
        const dollCard = document.createElement('div');
        dollCard.className = 'doll-card';
        dollCard.innerHTML = `
            <div class="doll-header">
                <h3>${doll.level}级娃娃</h3>
                <div class="doll-level">ID: ${doll._id ? doll._id.substring(0, 8) + '...' : '未知'}</div>
            </div>
            <div class="doll-body">
                <div class="doll-feature">
                    <i class="fas fa-gem"></i>
                    <span>每日收益 ${doll.dailyIncome || 0} 积分</span>
                </div>
                <div class="doll-feature">
                    <i class="fas fa-clock"></i>
                    <span>剩余 ${doll.remainingDays || 0} 天</span>
                </div>
                <button class="btn btn-block" onclick="selectDollForSynthesisFromList('${doll._id}')">选择</button>
            </div>
        `;
        availableDollsContainer.appendChild(dollCard);
    });
}

// 选择娃娃用于合成
function selectDollForSynthesis(slot) {
    if (selectedDollsForSynthesis[slot-1]) {
        selectedDollsForSynthesis[slot-1] = null;
        const slotElement = document.getElementById(`slot${slot}`);
        if (slotElement) {
            slotElement.innerHTML = '<i class="fas fa-plus"></i>';
            slotElement.classList.remove('selected');
        }
        updateSynthesisButton();
        updateSuccessRate();
        return;
    }
    
    if (!userDolls || !Array.isArray(userDolls)) {
        alert('娃娃数据加载中，请稍后重试！');
        return;
    }
    
    const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
    const availableDolls = validDolls.filter(doll => doll.active && doll.level < 3);
    
    if (availableDolls.length === 0) {
        alert('没有可用的娃娃！');
        return;
    }
    
    const selectedDoll = availableDolls[0];
    selectedDollsForSynthesis[slot-1] = selectedDoll;
    
    const slotElement = document.getElementById(`slot${slot}`);
    if (slotElement) {
        slotElement.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-doll" style="font-size: 30px;"></i>
                <div style="margin-top: 5px;">${selectedDoll.level}级</div>
            </div>
        `;
        slotElement.classList.add('selected');
    }
    
    updateSynthesisButton();
    updateSuccessRate();
}

// 从列表中选择娃娃用于合成
function selectDollForSynthesisFromList(dollId) {
    if (!userDolls || !Array.isArray(userDolls)) {
        alert('娃娃数据加载中，请稍后重试！');
        return;
    }
    
    const doll = userDolls.find(d => d._id === dollId);
    if (!doll) {
        alert('娃娃不存在！');
        return;
    }
    
    let emptySlot = -1;
    for (let i = 0; i < selectedDollsForSynthesis.length; i++) {
        if (!selectedDollsForSynthesis[i]) {
            emptySlot = i;
            break;
        }
    }
    
    if (emptySlot === -1) {
        alert('合成槽已满！请先取消选择一个娃娃。');
        return;
    }
    
    selectedDollsForSynthesis[emptySlot] = doll;
    
    const slotElement = document.getElementById(`slot${emptySlot+1}`);
    if (slotElement) {
        slotElement.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-doll" style="font-size: 30px;"></i>
                <div style="margin-top: 5px;">${doll.level}级</div>
            </div>
        `;
        slotElement.classList.add('selected');
    }
    
    updateSynthesisButton();
    updateSuccessRate();
}

// 更新合成按钮状态
function updateSynthesisButton() {
    const synthesisBtn = document.getElementById('synthesis-btn');
    if (synthesisBtn) {
        synthesisBtn.disabled = !(selectedDollsForSynthesis[0] && selectedDollsForSynthesis[1]);
    }
}

// 更新成功率
function updateSuccessRate() {
    const pointsInput = document.getElementById('synthesis-points');
    const successRateElement = document.getElementById('success-rate');
    
    if (!pointsInput || !successRateElement) return;
    
    const points = parseInt(pointsInput.value) || 0;
    const baseRate = 0;
    const successRate = baseRate + (points * 0.9);
    
    successRateElement.textContent = `当前成功率: ${Math.min(successRate, 100).toFixed(1)}%`;
}

// 合成娃娃
async function synthesizeDolls() {
    if (!selectedDollsForSynthesis[0] || !selectedDollsForSynthesis[1]) {
        alert('请选择两个娃娃进行合成！');
        return;
    }
    
    const doll1 = selectedDollsForSynthesis[0];
    const doll2 = selectedDollsForSynthesis[1];
    
    if (doll1.level !== doll2.level) {
        alert('只能合成相同等级的娃娃！');
        return;
    }
    
    if (doll1.level >= 3) {
        alert('无法合成更高级别的娃娃！');
        return;
    }
    
    const pointsInput = document.getElementById('synthesis-points');
    const points = parseInt(pointsInput?.value) || 0;
    
    if (currentUser.points < points) {
        alert('积分不足！');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/dolls/synthesize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                doll1Id: doll1._id,
                doll2Id: doll2._id,
                points
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser.points = data.user.points;
            userDolls = Array.isArray(data.dolls) ? data.dolls : [];
            updateUI();
            updateUserStats();
            updateMyDollsList();
            updateAvailableDolls();
            updateBackpackDisplay();
            updateBackpackStats(userDolls.length, userDolls.length);
            
            // 重新加载合成记录
            loadSynthesisRecords();
            
            if (data.success) {
                alert(`合成成功！获得${data.newDoll.level}级娃娃！`);
            } else {
                alert('合成失败！积分已消耗，娃娃保持不变。');
            }
            
            resetSynthesisInterface();
        } else {
            alert(data.message || '合成失败');
        }
    } catch (error) {
        console.error('合成娃娃错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 重置合成界面
function resetSynthesisInterface() {
    selectedDollsForSynthesis = [null, null];
    
    for (let i = 1; i <= 2; i++) {
        const slotElement = document.getElementById(`slot${i}`);
        if (slotElement) {
            slotElement.innerHTML = '<i class="fas fa-plus"></i>';
            slotElement.classList.remove('selected');
        }
    }
    
    const resultSlot = document.getElementById('result-slot');
    if (resultSlot) {
        resultSlot.innerHTML = '<i class="fas fa-question"></i>';
    }
    
    const pointsInput = document.getElementById('synthesis-points');
    if (pointsInput) {
        pointsInput.value = '0';
    }
    
    updateSynthesisButton();
    updateSuccessRate();
}

// 管理员功能
async function loadAdminData() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('您没有管理员权限！');
        return;
    }
    
    try {
        // 获取所有用户
        const usersResponse = await fetch(`${API_BASE}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            allUsers = Array.isArray(usersData.users) ? usersData.users : [];
            updateUsersTable();
        }
        
        // 获取所有娃娃
        const dollsResponse = await fetch(`${API_BASE}/admin/dolls`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (dollsResponse.ok) {
            const dollsData = await dollsResponse.json();
            updateDollsTable(Array.isArray(dollsData.dolls) ? dollsData.dolls : []);
            loadDollFilters();
        }
        
        // 加载交易记录
        await loadTransactions();
        
        // 获取系统配置
        const configResponse = await fetch(`${API_BASE}/admin/system-config`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (configResponse.ok) {
            const configData = await configResponse.json();
            // 更新价格输入框
            const level1PriceInput = document.getElementById('level1-price');
            const level2PriceInput = document.getElementById('level2-price');
            const level3PriceInput = document.getElementById('level3-price');
            
            if (level1PriceInput) level1PriceInput.value = configData.config.dollPrices[1] || 50;
            if (level2PriceInput) level2PriceInput.value = configData.config.dollPrices[2] || 200;
            if (level3PriceInput) level3PriceInput.value = configData.config.dollPrices[3] || 500;
        }
        
    } catch (error) {
        console.error('加载管理员数据错误:', error);
        alert('加载管理员数据失败: ' + error.message);
    }
}

// 更新用户表格（增强版）
function updateUsersTable() {
    const usersTable = document.getElementById('users-table');
    if (!usersTable) return;
    
    usersTable.innerHTML = '';
    
    if (!Array.isArray(allUsers)) {
        usersTable.innerHTML = '<tr><td colspan="9">暂无用户数据</td></tr>';
        return;
    }
    
    allUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user._id ? user._id.substring(0, 8) + '...' : '未知ID'}</td>
            <td>${user.username || '未知用户'}</td>
            <td>${user.email || '未知邮箱'}</td>
            <td>${user.points || 0}</td>
            <td>${user.role || 'user'}</td>
            <td>
                <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
                    ${user.active ? '活跃' : '禁用'}
                </span>
            </td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知日期'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editUser('${user._id}')">编辑</button>
                <button class="btn btn-sm btn-warning" onclick="adjustUserPoints('${user._id}')">积分</button>
                <button class="btn btn-sm ${user.active ? 'btn-danger' : 'btn-success'}" 
                        onclick="toggleUserStatus('${user._id}')">
                    ${user.active ? '禁用' : '启用'}
                </button>
            </td>
        `;
        usersTable.appendChild(row);
    });
}

// 更新娃娃表格（增强版，带筛选）
function updateDollsTable(dolls) {
    const dollsTable = document.getElementById('dolls-table');
    if (!dollsTable) return;
    
    dollsTable.innerHTML = '';
    
    if (!Array.isArray(dolls)) {
        dollsTable.innerHTML = '<tr><td colspan="9">暂无娃娃数据</td></tr>';
        return;
    }
    
    // 获取筛选条件
    const levelFilter = document.getElementById('doll-level-filter')?.value || 'all';
    const statusFilter = document.getElementById('doll-status-filter')?.value || 'all';
    const userFilter = document.getElementById('doll-user-filter')?.value?.toLowerCase() || '';
    
    // 筛选娃娃
    let filteredDolls = dolls.filter(doll => {
        // 等级筛选
        if (levelFilter !== 'all' && doll.level !== parseInt(levelFilter)) {
            return false;
        }
        
        // 状态筛选
        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'active';
            if (doll.active !== isActive) {
                return false;
            }
        }
        
        // 用户筛选
        if (userFilter && doll.userId) {
            const username = doll.userId.username || doll.userId || '';
            if (!username.toLowerCase().includes(userFilter)) {
                return false;
            }
        }
        
        return true;
    });
    
    if (filteredDolls.length === 0) {
        dollsTable.innerHTML = '<tr><td colspan="9">没有符合筛选条件的娃娃</td></tr>';
        return;
    }
    
    filteredDolls.forEach(doll => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doll._id ? doll._id.substring(0, 8) + '...' : '未知ID'}</td>
            <td>${doll.userId && doll.userId.username ? doll.userId.username : (doll.userId || '未知用户')}</td>
            <td>
                <span class="level-badge level-${doll.level}">${doll.level}级</span>
            </td>
            <td>${doll.purchaseDate ? new Date(doll.purchaseDate).toLocaleDateString() : '未知日期'}</td>
            <td>${doll.lifespan || 0}</td>
            <td>${doll.remainingDays || 0}</td>
            <td>${(doll.dailyIncome || 0).toFixed(2)}</td>
            <td>
                <span class="status-badge ${doll.active ? 'status-active' : 'status-inactive'}">
                    ${doll.active ? '活跃' : '非活跃'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteDoll('${doll._id}')">删除</button>
            </td>
        `;
        dollsTable.appendChild(row);
    });
}

// 更新交易表格
function updateTransactionsTable(transactions) {
    const transactionsTable = document.getElementById('transactions-table');
    if (!transactionsTable) return;
    
    transactionsTable.innerHTML = '';
    
    if (!Array.isArray(transactions)) {
        transactionsTable.innerHTML = '<tr><td colspan="5">暂无交易记录</td></tr>';
        return;
    }
    
    if (transactions.length === 0) {
        transactionsTable.innerHTML = '<tr><td colspan="5">暂无交易记录</td></tr>';
        return;
    }
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '未知时间'}</td>
            <td>${transaction.userId && transaction.userId.username ? transaction.userId.username : (transaction.userId || '未知用户')}</td>
            <td>${transaction.type || '未知类型'}</td>
            <td>${transaction.amount || 0}</td>
            <td>${transaction.description || '无描述'}</td>
        `;
        transactionsTable.appendChild(row);
    });
}

// 切换管理员标签页
function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    const targetContent = document.getElementById(`admin-${tabName}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// 管理员功能：更新娃娃价格 - ✅ 修复版本
async function updateDollPrices() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('您没有管理员权限！');
        return;
    }
    
    try {
        const level1Price = parseFloat(document.getElementById('level1-price').value) || 50;
        const level2Price = parseFloat(document.getElementById('level2-price').value) || 200;
        const level3Price = parseFloat(document.getElementById('level3-price').value) || 500;
        
        const response = await fetch(`${API_BASE}/admin/update-system-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                dollPrices: {
                    1: level1Price,
                    2: level2Price,
                    3: level3Price
                }
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('价格更新成功！');
        } else {
            alert(data.message || '价格更新失败');
        }
        
    } catch (error) {
        console.error('更新价格错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 管理员功能：调整用户积分
async function adjustUserPoints(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    const newPoints = prompt(`请输入用户 "${user.username}" 的新积分数量:`, user.points);
    if (newPoints === null) return;
    
    const points = parseFloat(newPoints);
    if (isNaN(points) || points < 0) {
        alert('请输入有效的积分数量！');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/adjust-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId, points })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('积分调整成功！');
            loadAdminData(); // 重新加载数据
        } else {
            alert(data.message || '积分调整失败');
        }
    } catch (error) {
        console.error('调整积分错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 管理员功能：切换用户状态（禁用/启用） - ✅ 修复版本
async function toggleUserStatus(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    const action = user.active ? '禁用' : '启用';
    if (!confirm(`确定要${action}用户 "${user.username}" 吗？`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/toggle-user-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`用户${action}成功！`);
            loadAdminData(); // 重新加载数据
        } else {
            alert(data.message || `用户${action}失败`);
        }
        
    } catch (error) {
        console.error('切换用户状态错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 管理员功能：编辑用户信息 - ✅ 修复版本
async function editUser(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    const newUsername = prompt('请输入新的用户名:', user.username);
    if (newUsername === null) return;
    
    const newEmail = prompt('请输入新的邮箱:', user.email);
    if (newEmail === null) return;
    
    if (!newUsername.trim() || !newEmail.trim()) {
        alert('用户名和邮箱不能为空！');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/edit-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId,
                username: newUsername.trim(),
                email: newEmail.trim()
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('用户信息更新成功！');
            loadAdminData(); // 重新加载数据
        } else {
            alert(data.message || '用户信息更新失败');
        }
        
    } catch (error) {
        console.error('编辑用户错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 管理员功能：删除娃娃 - ✅ 修复版本
async function deleteDoll(dollId) {
    const doll = userDolls.find(d => d._id === dollId);
    if (!doll) return;
    
    if (!confirm(`确定要删除这个${doll.level}级娃娃吗？此操作不可恢复！`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/delete-doll`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ dollId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('娃娃删除成功！');
            loadAdminData(); // 重新加载数据
        } else {
            alert(data.message || '娃娃删除失败');
        }
        
    } catch (error) {
        console.error('删除娃娃错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 管理员功能：加载娃娃筛选器
function loadDollFilters() {
    const filtersContainer = document.getElementById('doll-filters');
    if (!filtersContainer) return;
    
    filtersContainer.innerHTML = `
        <div class="filter-row">
            <div class="filter-group">
                <label>等级筛选:</label>
                <select id="doll-level-filter" class="form-control" onchange="filterDolls()">
                    <option value="all">全部等级</option>
                    <option value="1">1级</option>
                    <option value="2">2级</option>
                    <option value="3">3级</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label>状态筛选:</label>
                <select id="doll-status-filter" class="form-control" onchange="filterDolls()">
                    <option value="all">全部状态</option>
                    <option value="active">活跃</option>
                    <option value="inactive">非活跃</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label>用户搜索:</label>
                <input type="text" id="doll-user-filter" class="form-control" 
                       placeholder="输入用户名..." oninput="filterDolls()">
            </div>
            
            <div class="filter-group">
                <label>日期范围:</label>
                <input type="date" id="doll-date-filter" class="form-control" onchange="filterDolls()">
            </div>
            
            <div class="filter-group">
                <label>&nbsp;</label>
                <button class="btn btn-secondary" onclick="resetDollFilters()">重置筛选</button>
            </div>
        </div>
    `;
}

// 筛选娃娃
function filterDolls() {
    const levelFilter = document.getElementById('doll-level-filter')?.value || 'all';
    const statusFilter = document.getElementById('doll-status-filter')?.value || 'all';
    const userFilter = document.getElementById('doll-user-filter')?.value?.toLowerCase() || '';
    const dateFilter = document.getElementById('doll-date-filter')?.value || '';
    
    // 重新获取所有娃娃数据
    fetch(`${API_BASE}/admin/dolls`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        let dolls = Array.isArray(data.dolls) ? data.dolls : [];
        
        // 应用筛选条件
        let filteredDolls = dolls.filter(doll => {
            // 等级筛选
            if (levelFilter !== 'all' && doll.level !== parseInt(levelFilter)) {
                return false;
            }
            
            // 状态筛选
            if (statusFilter !== 'all') {
                const isActive = statusFilter === 'active';
                if (doll.active !== isActive) {
                    return false;
                }
            }
            
            // 用户筛选
            if (userFilter && doll.userId) {
                const username = doll.userId.username || doll.userId || '';
                if (!username.toLowerCase().includes(userFilter)) {
                    return false;
                }
            }
            
            // 日期筛选
            if (dateFilter && doll.purchaseDate) {
                const purchaseDate = new Date(doll.purchaseDate).toISOString().split('T')[0];
                if (purchaseDate !== dateFilter) {
                    return false;
                }
            }
            
            return true;
        });
        
        updateDollsTable(filteredDolls);
    })
    .catch(error => {
        console.error('筛选娃娃错误:', error);
    });
}

// 重置筛选器
function resetDollFilters() {
    document.getElementById('doll-level-filter').value = 'all';
    document.getElementById('doll-status-filter').value = 'all';
    document.getElementById('doll-user-filter').value = '';
    document.getElementById('doll-date-filter').value = '';
    filterDolls();
}

// ✅ 新增：计算今日收益
function calculateDailyIncome() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('您没有管理员权限！');
        return;
    }
    
    try {
        // 获取所有活跃娃娃
        fetch(`${API_BASE}/admin/dolls`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const allDolls = Array.isArray(data.dolls) ? data.dolls : [];
            const activeDolls = allDolls.filter(doll => doll.active);
            const totalIncome = activeDolls.reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
            
            // 更新显示
            const incomeElement = document.getElementById('daily-income-display');
            if (incomeElement) {
                incomeElement.textContent = `今日总收益: ${totalIncome.toFixed(2)} 积分`;
            }
            
            // 按等级统计
            const level1Income = activeDolls.filter(d => d.level === 1).reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
            const level2Income = activeDolls.filter(d => d.level === 2).reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
            const level3Income = activeDolls.filter(d => d.level === 3).reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
            
            // 更新分级显示
            const level1Element = document.getElementById('level1-income-display');
            const level2Element = document.getElementById('level2-income-display');
            const level3Element = document.getElementById('level3-income-display');
            
            if (level1Element) level1Element.textContent = `${level1Income.toFixed(2)} 积分`;
            if (level2Element) level2Element.textContent = `${level2Income.toFixed(2)} 积分`;
            if (level3Element) level3Element.textContent = `${level3Income.toFixed(2)} 积分`;
        })
        .catch(error => {
            console.error('计算收益错误:', error);
            alert('计算收益时出错');
        });
    } catch (error) {
        console.error('计算收益错误:', error);
        alert('计算收益时出错');
    }
}

// ✅ 新增：获取交易记录
async function loadTransactions() {
    if (!currentUser || currentUser.role !== 'admin') {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/transactions`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateTransactionsTable(Array.isArray(data.transactions) ? data.transactions : []);
        } else {
            console.error('获取交易记录失败:', response.statusText);
            updateTransactionsTable([]);
        }
    } catch (error) {
        console.error('加载交易记录错误:', error);
        updateTransactionsTable([]);
    }
}

// ✅ 新增：获取合成记录
async function loadSynthesisRecords() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/dolls/synthesis-records`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateSynthesisRecordsTable(Array.isArray(data.records) ? data.records : []);
        } else {
            console.error('获取合成记录失败');
            updateSynthesisRecordsTable([]);
        }
    } catch (error) {
        console.error('加载合成记录错误:', error);
        updateSynthesisRecordsTable([]);
    }
}

// ✅ 新增：更新合成记录表格
function updateSynthesisRecordsTable(records) {
    const recordsTable = document.getElementById('synthesis-records-table');
    if (!recordsTable) return;
    
    recordsTable.innerHTML = '';
    
    if (!Array.isArray(records) || records.length === 0) {
        recordsTable.innerHTML = '<tr><td colspan="6">暂无合成记录</td></tr>';
        return;
    }
    
    records.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.createdAt ? new Date(record.createdAt).toLocaleString() : '未知时间'}</td>
            <td>${record.doll1Level}级 + ${record.doll2Level}级</td>
            <td>${record.pointsUsed || 0} 积分</td>
            <td>${record.successRate || 0}%</td>
            <td>
                ${record.success ? 
                    `<span style="color: green;">成功 → ${record.newDollLevel}级</span>` : 
                    `<span style="color: red;">失败</span>`
                }
            </td>
            <td>${record.newDollId ? record.newDollId.substring(0, 8) + '...' : '无'}</td>
        `;
        recordsTable.appendChild(row);
    });
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .income-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        animation: slideInRight 0.5s ease-out;
        max-width: 300px;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-text {
        text-align: left;
    }
    
    .notification-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 2px;
    }
    
    .notification-amount {
        font-size: 18px;
        font-weight: bold;
    }
    
    .payout-item {
        padding: 10px;
        margin-bottom: 8px;
        background-color: #f8f9fa;
        border-radius: 5px;
        border-left: 4px solid #28a745;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: fadeIn 0.3s ease-out;
    }
    
    .payout-time {
        font-size: 12px;
        color: #666;
    }
    
    .payout-amount {
        font-weight: bold;
        color: #28a745;
    }
`;
document.head.appendChild(style);
