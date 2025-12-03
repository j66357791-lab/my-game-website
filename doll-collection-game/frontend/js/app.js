// 娃娃收藏游戏 - 前端JavaScript
// 全局变量
let currentUser = null;
let userDolls = [];
let allUsers = [];
let selectedDollsForSynthesis = [null, null];
let allTransactions = [];
let allDolls = [];
let userFriends = [];
let friendRequests = [];
let transferHistory = [];
let spaceGameInstance = null;

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
    
    // 设置收益倒计时
    updateCountdown();
    setInterval(updateCountdown, 60000);
    
    // 检查服务器连接状态
    checkServerStatus();
    
    // 添加页面加载动画
    document.body.classList.add('loaded');
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
    const adjustLifespanForm = document.getElementById('adjust-lifespan-form');
    const transferForm = document.getElementById('transfer-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (adjustLifespanForm) {
        adjustLifespanForm.addEventListener('submit', handleAdjustLifespan);
    }
    
    if (transferForm) {
        transferForm.addEventListener('submit', handleTransfer);
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
    
    console.log('事件监听器初始化完成');
}

// 检查服务器状态
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            const statusElement = document.getElementById('server-status');
            if (statusElement) {
                statusElement.textContent = '在线';
                statusElement.style.color = 'var(--success)';
            }
        } else {
            const statusElement = document.getElementById('server-status');
            if (statusElement) {
                statusElement.textContent = '离线';
                statusElement.style.color = 'var(--danger)';
            }
        }
    } catch (error) {
        const statusElement = document.getElementById('server-status');
        if (statusElement) {
            statusElement.textContent = '连接失败';
            statusElement.style.color = 'var(--danger)';
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
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

// 显示注册模态框
function showRegisterModal() {
    closeModal('login-modal');
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
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
            showNotification('登录成功！', 'success');
        } else {
            showNotification(data.message || '登录失败', 'error');
        }
    } catch (error) {
        console.error('登录错误:', error);
        if (error.message.includes('JSON')) {
            showNotification('服务器连接错误，请检查后端服务是否运行', 'error');
        } else {
            showNotification('网络错误，请稍后重试', 'error');
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
            showNotification('注册成功！请登录。', 'success');
            showLoginModal();
        } else {
            showNotification(data.message || '注册失败', 'error');
        }
    } catch (error) {
        console.error('注册错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 处理退出
function handleLogout() {
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
        
        // 根据等级添加不同的样式类
        if (doll.level === 1) dollCard.classList.add('level-1');
        else if (doll.level === 2) dollCard.classList.add('level-2');
        else if (doll.level === 3) dollCard.classList.add('level-3');
        
        const dollId = doll._id ? doll._id.substring(0, 8) + '...' : '未知';
        const refundAmount = (doll.remainingDays * 0.05).toFixed(2);
        
        dollCard.innerHTML = `
            <div class="doll-header">
                <h3>${doll.level}级娃娃</h3>
                <div class="doll-level">ID: ${dollId}</div>
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
                <div class="doll-feature recycle-info">
                    <i class="fas fa-recycle"></i>
                    <span>可回收: ${refundAmount} 积分</span>
                </div>
                <button class="btn btn-recycle btn-block" onclick="recycleDoll('${doll._id}')">
                    <i class="fas fa-recycle"></i> 回收娃娃
                </button>
            </div>
        `;
        myDollsContainer.appendChild(dollCard);
    });
}

// ==================== 娃娃回收功能 ====================

// 回收娃娃
async function recycleDoll(dollId) {
    if (!confirm('确定要回收这个娃娃吗？回收后将无法恢复！')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/dolls/recycle/${dollId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`回收成功！返还${data.refundAmount}积分`, 'success');
            currentUser.points = data.user.points;
            updateUI();
            loadUserData(); // 重新加载娃娃列表
        } else {
            showNotification(data.message || '回收失败', 'error');
        }
    } catch (error) {
        console.error('回收娃娃错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// ==================== 通知功能 ====================

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
    
    const quantityInput = document.getElementById(`level${level}-quantity`);
    const quantity = parseInt(quantityInput?.value) || 1;
    
    if (quantity < 1 || quantity > 100) {
        showNotification('购买数量必须在1-100之间！', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/dolls/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ level, quantity })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser.points = data.user.points;
            
            if (data.dolls && Array.isArray(data.dolls)) {
                userDolls.push(...data.dolls);
            }
            
            updateUI();
            updateUserStats();
            updateMyDollsList();
            showNotification(`成功购买${quantity}个${level}级娃娃！`, 'success');
        } else {
            showNotification(data.message || '购买失败', 'error');
        }
    } catch (error) {
        console.error('购买娃娃错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
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
    } else if (panelId === 'friends-panel') {
        loadFriendsData();
    } else if (panelId === 'transfer-panel') {
        loadTransferData();
    } else if (panelId === 'space-game-panel') {
        initSpaceGame();
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
        
        if (doll.level === 1) dollCard.classList.add('level-1');
        else if (doll.level === 2) dollCard.classList.add('level-2');
        
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
                <button class="btn btn-block" onclick="selectDollForSynthesisFromList('${doll._id}')">
                    <i class="fas fa-plus"></i> 选择
                </button>
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
        showNotification('娃娃数据加载中，请稍后重试！', 'error');
        return;
    }
    
    const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
    const availableDolls = validDolls.filter(doll => doll.active && doll.level < 3);
    
    if (availableDolls.length === 0) {
        showNotification('没有可用的娃娃！', 'error');
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
                <div style="margin-top: 5px; font-size: 12px;">剩余${selectedDoll.remainingDays}天</div>
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
        showNotification('娃娃数据加载中，请稍后重试！', 'error');
        return;
    }
    
    const doll = userDolls.find(d => d._id === dollId);
    if (!doll) {
        showNotification('娃娃不存在！', 'error');
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
        showNotification('合成槽已满！请先取消选择一个娃娃。', 'error');
        return;
    }
    
    selectedDollsForSynthesis[emptySlot] = doll;
    
    const slotElement = document.getElementById(`slot${emptySlot+1}`);
    if (slotElement) {
        slotElement.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-doll" style="font-size: 30px;"></i>
                <div style="margin-top: 5px;">${doll.level}级</div>
                <div style="margin-top: 5px; font-size: 12px;">剩余${doll.remainingDays}天</div>
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
        showNotification('请选择两个娃娃进行合成！', 'error');
        return;
    }
    
    const doll1 = selectedDollsForSynthesis[0];
    const doll2 = selectedDollsForSynthesis[1];
    
    if (doll1.level !== doll2.level) {
        showNotification('只能合成相同等级的娃娃！', 'error');
        return;
    }
    
    if (doll1.level >= 3) {
        showNotification('无法合成更高级别的娃娃！', 'error');
        return;
    }
    
    const pointsInput = document.getElementById('synthesis-points');
    const points = parseInt(pointsInput?.value) || 0;
    
    if (currentUser.points < points) {
        showNotification('积分不足！', 'error');
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
            
            if (data.success) {
                showNotification(`合成成功！获得${data.newDoll.level}级娃娃，剩余${data.newDoll.remainingDays}天！`, 'success');
            } else {
                showNotification('合成失败！积分已消耗，娃娃保持不变。', 'warning');
            }
            
            resetSynthesisInterface();
        } else {
            showNotification(data.message || '合成失败', 'error');
        }
    } catch (error) {
        console.error('合成娃娃错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
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

// ==================== 太空挑战游戏功能 ====================

// 初始化太空挑战游戏
function initSpaceGame() {
    if (!spaceGameInstance) {
        // 创建太空挑战游戏实例
        spaceGameInstance = new SpaceChallengeGame();
        
        // 设置用户信息
        if (spaceGameInstance && currentUser) {
            spaceGameInstance.setUserInfo(currentUser._id, currentUser.points);
        }
    }
}

// 太空挑战游戏类
class SpaceChallengeGame {
    constructor() {
        this.gameState = 'waiting'; // waiting, betting, showing, result
        this.countdown = 30;
        this.userPoints = 10000;
        this.userId = 'GUEST';
        this.currentBets = {
            red: 0,
            blue: 0,
            draw: 0,
            redStars: new Array(10).fill(0),
            blueStars: new Array(10).fill(0)
        };
        this.selectedBets = new Set();
        this.redStar = 0;
        this.blueStar = 0;
        this.soundEnabled = true;
        this.countdownInterval = null;
        this.gameHistory = this.loadGameHistory();
        
        // API配置
        this.apiConfig = {
            baseUrl: window.location.origin,
            endpoints: {
                saveGame: '/api/space-game/save',
                getHistory: '/api/space-game/history',
                updatePoints: '/api/user/points'
            }
        };
        
        this.init();
    }

    init() {
        this.createStarBackground();
        this.createStarBetButtons();
        this.bindEvents();
        this.initAudio();
        this.startNewRound();
    }

    // 创建星空背景
    createStarBackground() {
        const starsContainer = document.getElementById('stars');
        if (!starsContainer) return;
        
        for (let i = 0; i < 150; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.animationDuration = (Math.random() * 3 + 2) + 's';
            starsContainer.appendChild(star);
        }
    }

    // 创建星级投注按钮
    createStarBetButtons() {
        const redGrid = document.getElementById('redStarBetGrid');
        const blueGrid = document.getElementById('blueStarBetGrid');
        
        if (!redGrid || !blueGrid) return;
        
        for (let i = 1; i <= 10; i++) {
            // 红方星级按钮
            const redButton = document.createElement('button');
            redButton.className = 'star-bet-button';
            redButton.dataset.star = i;
            redButton.dataset.color = 'red';
            redButton.innerHTML = `${i}⭐<br><small>9.5x</small>`;
            redGrid.appendChild(redButton);
            
            // 蓝方星级按钮
            const blueButton = document.createElement('button');
            blueButton.className = 'star-bet-button';
            blueButton.dataset.star = i;
            blueButton.dataset.color = 'blue';
            blueButton.innerHTML = `${i}⭐<br><small>9.5x</small>`;
            blueGrid.appendChild(blueButton);
        }
    }

    // 初始化音效
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            this.sounds = {
                click: () => this.playTone(800, 0.1),
                countdown: () => this.playTone(400, 0.2),
                countdownUrgent: () => this.playTone(300, 0.3),
                bet: () => this.playTone(600, 0.1),
                star: () => this.playTone(1200, 0.08),
                win: () => this.playMelody([523, 659, 784, 1047], 0.15),
                lose: () => this.playMelody([784, 659, 523, 392], 0.15)
            };
            
            console.log('音效系统初始化成功');
        } catch (error) {
            console.error('音效初始化失败:', error);
            this.sounds = {
                click: () => {},
                countdown: () => {},
                countdownUrgent: () => {},
                bet: () => {},
                star: () => {},
                win: () => {},
                lose: () => {}
            };
        }
    }

    // 播放音调
    playTone(frequency, duration) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.error('播放音调失败:', error);
        }
    }

    // 播放旋律
    playMelody(frequencies, duration) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            frequencies.forEach((freq, index) => {
                setTimeout(() => this.playTone(freq, duration), index * duration * 1000);
            });
        } catch (error) {
            console.error('播放旋律失败:', error);
        }
    }

    // 绑定事件
    bindEvents() {
        // 退出按钮
        const exitButton = document.getElementById('exitButton');
        if (exitButton) {
            exitButton.addEventListener('click', () => {
                if (confirm('确定要退出游戏吗？')) {
                    this.exitGame();
                }
            });
        }

        // 投注按钮
        const redBet = document.getElementById('redBet');
        const blueBet = document.getElementById('blueBet');
        const drawBet = document.getElementById('drawBet');
        
        if (redBet) redBet.addEventListener('click', () => this.placeBet('red'));
        if (blueBet) blueBet.addEventListener('click', () => this.placeBet('blue'));
        if (drawBet) drawBet.addEventListener('click', () => this.placeBet('draw'));

        // 星级投注
        document.querySelectorAll('.star-bet-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const star = parseInt(btn.dataset.star);
                const color = btn.dataset.color;
                this.placeStarBet(star, color);
            });
        });

        // 快速投注按钮
        document.querySelectorAll('.quick-bet').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                const input = btn.closest('.bet-amount-input').querySelector('input');
                input.value = amount;
            });
        });

        // 趋势按钮
        const trendButton = document.getElementById('trendButton');
        if (trendButton) {
            trendButton.addEventListener('click', () => this.showTrendModal());
        }

        // 音效控制按钮
        const soundControl = document.getElementById('soundControl');
        if (soundControl) {
            soundControl.addEventListener('click', () => this.toggleSound());
        }

        // 关闭按钮
        const closeTrend = document.getElementById('closeTrend');
        const closeResult = document.getElementById('closeResult');
        
        if (closeTrend) closeTrend.addEventListener('click', () => this.hideTrendModal());
        if (closeResult) closeResult.addEventListener('click', () => this.hideResultModal());
    }

    // 切换音效
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        const btn = document.getElementById('soundControl');
        btn.innerHTML = this.soundEnabled ? '🔊' : '🔇';
        btn.title = this.soundEnabled ? '音效开启' : '音效关闭';
        
        this.showMessage(this.soundEnabled ? '音效已开启' : '音效已关闭');
    }

    // 退出游戏
    exitGame() {
        // 返回主界面
        if (window.showPanel) {
            window.showPanel('user-panel');
        }
    }

    // 开始新回合
    startNewRound() {
        this.gameState = 'betting';
        this.countdown = 30;
        this.currentBets = {
            red: 0,
            blue: 0,
            draw: 0,
            redStars: new Array(10).fill(0),
            blueStars: new Array(10).fill(0)
        };
        this.selectedBets.clear();
        this.redStar = 0;
        this.blueStar = 0;
        
        // 清空星级显示
        document.getElementById('redStars').innerHTML = '';
        document.getElementById('blueStars').innerHTML = '';
        
        // 清除选中状态
        document.querySelectorAll('.bet-button, .star-bet-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 清空投注金额
        document.getElementById('redBetAmount').value = '';
        document.getElementById('blueBetAmount').value = '';
        
        // 移除获胜动画
        document.querySelectorAll('.spaceship').forEach(ship => {
            ship.classList.remove('winner');
        });
        
        // 更新显示
        this.updateDisplay();
        
        // 开始倒计时
        this.startCountdown();
    }

    // 倒计时
    startCountdown() {
        const timerElement = document.getElementById('countdownTimer');
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        this.countdownInterval = setInterval(() => {
            this.countdown--;
            
            if (this.countdown > 0) {
                timerElement.textContent = `投注时间: ${this.countdown}秒`;
                timerElement.classList.remove('urgent');
                
                if (this.countdown % 5 === 0) {
                    this.sounds.countdown();
                }
                
                if (this.countdown <= 5) {
                    timerElement.classList.add('urgent');
                    if (this.countdown <= 3) {
                        this.sounds.countdownUrgent();
                    }
                }
            } else {
                clearInterval(this.countdownInterval);
                this.startGame();
            }
        }, 1000);
    }

    // 开始游戏
    startGame() {
        this.gameState = 'showing';
        document.getElementById('countdownTimer').textContent = '游戏进行中...';
        
        // 计算星级
        this.calculateStars();
        
        // 显示星级动画
        this.showStarsAnimation();
    }

    // 投注
    placeBet(type) {
        if (this.gameState !== 'betting') return;
        
        const betKey = type === 'red' ? 'redBetAmount' : type === 'blue' ? 'blueBetAmount' : 'drawBetAmount';
        let amount = 0;
        
        if (type === 'draw') {
            amount = parseInt(prompt('请输入平局投注金额:') || '0');
        } else {
            amount = parseInt(document.getElementById(betKey).value || '0');
        }
        
        if (amount <= 0) {
            this.showMessage('请输入有效的投注金额');
            return;
        }
        
        if (amount > this.userPoints) {
            this.showMessage(`积分不足！当前积分：${this.userPoints}`);
            return;
        }
        
        this.currentBets[type] = amount;
        this.selectedBets.add(type);
        
        // 更新按钮状态
        const buttonId = type + 'Bet';
        document.getElementById(buttonId).classList.add('selected');
        
        this.updateDisplay();
        this.sounds.bet();
    }

    // 星级投注
    placeStarBet(star, color) {
        if (this.gameState !== 'betting') return;
        
        const amount = parseInt(prompt(`请输入${color === 'red' ? '红方' : '蓝方'}${star}星投注金额:`) || '0');
        
        if (amount <= 0) {
            this.showMessage('请输入有效的投注金额');
            return;
        }
        
        if (amount > this.userPoints) {
            this.showMessage(`积分不足！当前积分：${this.userPoints}`);
            return;
        }
        
        this.currentBets[color + 'Stars'][star - 1] = amount;
        this.selectedBets.add(`${color}Star${star}`);
        
        // 更新按钮状态
        document.querySelector(`.star-bet-button[data-star="${star}"][data-color="${color}"]`).classList.add('selected');
        
        this.updateDisplay();
        this.sounds.bet();
    }

    // 计算星级
    calculateStars() {
        // 红方随机1-10星
        this.redStar = Math.floor(Math.random() * 10) + 1;
        
        // 蓝方概率调整，控制平局率约5%
        if (Math.random() < 0.05) {
            // 5%概率平局
            this.blueStar = this.redStar;
        } else {
            // 95%概率产生不同结果
            do {
                this.blueStar = Math.floor(Math.random() * 10) + 1;
            } while (this.blueStar === this.redStar);
        }
    }

    // 显示星级动画
    showStarsAnimation() {
        // 显示红方星级
        this.displayStars('red', this.redStar, () => {
            // 显示蓝方星级
            setTimeout(() => {
                this.displayStars('blue', this.blueStar, () => {
                    // 结算
                    setTimeout(() => this.settleGame(), 1000);
                });
            }, 500);
        });
    }

    // 显示星级
    displayStars(color, count, callback) {
        const container = document.getElementById(color + 'Stars');
        container.innerHTML = '';
        
        let index = 0;
        const interval = setInterval(() => {
            if (index < count) {
                const star = document.createElement('span');
                star.className = 'star-icon';
                star.textContent = '⭐';
                star.style.animationDelay = `${index * 0.1}s`;
                container.appendChild(star);
                
                this.sounds.star();
                
                index++;
            } else {
                clearInterval(interval);
                if (callback) callback();
            }
        }, 200);
    }

    // 结算游戏
    settleGame() {
        this.gameState = 'result';
        
        let winner = '';
        let profit = 0;
        let details = [];
        
        // 判断胜负
        if (this.redStar > this.blueStar) {
            winner = 'red';
            document.getElementById('redSpaceship').classList.add('winner');
        } else if (this.blueStar > this.redStar) {
            winner = 'blue';
            document.getElementById('blueSpaceship').classList.add('winner');
        } else {
            winner = 'draw';
        }
        
        // 计算收益
        if (this.currentBets.red > 0) {
            if (winner === 'red') {
                profit += this.currentBets.red * 0.95;
                details.push(`红方投注: +${(this.currentBets.red * 0.95).toFixed(0)}`);
            } else {
                profit -= this.currentBets.red;
                details.push(`红方投注: -${this.currentBets.red}`);
            }
        }
        
        if (this.currentBets.blue > 0) {
            if (winner === 'blue') {
                profit += this.currentBets.blue * 0.95;
                details.push(`蓝方投注: +${(this.currentBets.blue * 0.95).toFixed(0)}`);
            } else {
                profit -= this.currentBets.blue;
                details.push(`蓝方投注: -${this.currentBets.blue}`);
            }
        }
        
        if (this.currentBets.draw > 0) {
            if (winner === 'draw') {
                profit += this.currentBets.draw * 9.5;
                details.push(`平局投注: +${(this.currentBets.draw * 9.5).toFixed(0)}`);
            } else {
                profit -= this.currentBets.draw;
                details.push(`平局投注: -${this.currentBets.draw}`);
            }
        }
        
        // 红方星级投注结算
        this.currentBets.redStars.forEach((amount, index) => {
            if (amount > 0) {
                const star = index + 1;
                if (this.redStar === star) {
                    profit += amount * 9.5;
                    details.push(`红方${star}星: +${(amount * 9.5).toFixed(0)}`);
                } else {
                    profit -= amount;
                    details.push(`红方${star}星: -${amount}`);
                }
            }
        });
        
        // 蓝方星级投注结算
        this.currentBets.blueStars.forEach((amount, index) => {
            if (amount > 0) {
                const star = index + 1;
                if (this.blueStar === star) {
                    profit += amount * 9.5;
                    details.push(`蓝方${star}星: +${(amount * 9.5).toFixed(0)}`);
                } else {
                    profit -= amount;
                    details.push(`蓝方${star}星: -${amount}`);
                }
            }
        });
        
        // 更新积分
        this.userPoints += profit;
        
        // 保存游戏记录
        const gameRecord = {
            round: this.gameHistory.length + 1,
            redStar: this.redStar,
            blueStar: this.blueStar,
            winner: winner,
            timestamp: new Date().toISOString()
        };
        this.saveGameRecord(gameRecord);
        
        // 显示结果
        this.showResult(winner, profit, details);
    }

    // 保存游戏记录
    async saveGameRecord(gameData) {
        try {
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.saveGame, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ gameRecord: gameData })
            });
            
            if (response.ok) {
                this.gameHistory.unshift(gameData);
                if (this.gameHistory.length > 10) {
                    this.gameHistory = this.gameHistory.slice(0, 10);
                }
                this.saveGameHistory();
            }
        } catch (error) {
            console.log('本地保存游戏记录');
            this.gameHistory.unshift(gameData);
            if (this.gameHistory.length > 10) {
                this.gameHistory = this.gameHistory.slice(0, 10);
            }
            this.saveGameHistory();
        }
    }

    // 加载游戏历史
    loadGameHistory() {
        const saved = localStorage.getItem('spaceGameHistory');
        return saved ? JSON.parse(saved) : [];
    }

    // 保存游戏历史
    saveGameHistory() {
        localStorage.setItem('spaceGameHistory', JSON.stringify(this.gameHistory));
    }

    // 显示结果
    showResult(winner, profit, details) {
        const modal = document.getElementById('resultModal');
        const title = document.getElementById('resultTitle');
        const detailsEl = document.getElementById('resultDetails');
        const profitEl = document.getElementById('resultProfit');
        
        // 设置标题
        if (winner === 'red') {
            title.textContent = '🔴 红方获胜！';
        } else if (winner === 'blue') {
            title.textContent = '🔵 蓝方获胜！';
        } else {
            title.textContent = '🤝 平局！';
        }
        
        // 设置详情
        detailsEl.innerHTML = `
            红方: ${this.redStar}⭐ vs 蓝方: ${this.blueStar}⭐<br>
            ${details.join('<br>')}
        `;
        
        // 设置收益
        if (profit > 0) {
            profitEl.textContent = `+${profit.toFixed(0)} 积分`;
            profitEl.className = 'result-profit win';
            this.sounds.win();
        } else if (profit < 0) {
            profitEl.textContent = `${profit.toFixed(0)} 积分`;
            profitEl.className = 'result-profit lose';
            this.sounds.lose();
        } else {
            profitEl.textContent = '0 积分';
            profitEl.className = 'result-profit';
        }
        
        // 显示弹窗
        modal.classList.add('show');
        
        // 更新显示
        this.updateDisplay();
        
        // 同步积分到主系统
        this.syncPointsToMainSystem();
    }

    // 同步积分到主系统
    async syncPointsToMainSystem() {
        try {
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.updatePoints, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ points: this.userPoints })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.userPoints = data.points;
                this.updateDisplay();
                
                // 通知主系统更新积分显示
                if (window.updateUserPoints) {
                    window.updateUserPoints(this.userPoints);
                }
            }
        } catch (error) {
            console.error('同步积分失败:', error);
        }
    }

    // 显示趋势弹窗
    showTrendModal() {
        const modal = document.getElementById('trendModal');
        modal.classList.add('show');
        this.drawTrendChart();
        this.updateStatistics();
    }

    // 隐藏趋势弹窗
    hideTrendModal() {
        const modal = document.getElementById('trendModal');
        modal.classList.remove('show');
    }

    // 隐藏结果弹窗
    hideResultModal() {
        const modal = document.getElementById('resultModal');
        modal.classList.remove('show');
        this.startNewRound();
    }

    // 绘制3D趋势图
    drawTrendChart() {
        const canvas = document.getElementById('trendChart');
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.gameHistory.length === 0) {
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('暂无游戏数据', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // 设置3D效果参数
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.3;
        
        // 绘制3D坐标轴
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        
        // X轴
        ctx.beginPath();
        ctx.moveTo(50, canvas.height - 50);
        ctx.lineTo(canvas.width - 50, canvas.height - 50);
        ctx.stroke();
        
        // Y轴
        ctx.beginPath();
        ctx.moveTo(50, 50);
        ctx.lineTo(50, canvas.height - 50);
        ctx.stroke();
        
        // 绘制网格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 10; i++) {
            const y = canvas.height - 50 - (i - 1) * (canvas.height - 100) / 9;
            ctx.beginPath();
            ctx.moveTo(50, y);
            ctx.lineTo(canvas.width - 50, y);
            ctx.stroke();
        }
        
        // 绘制数据点和连线
        const dataPoints = this.gameHistory.slice(0, 10).reverse();
        const stepX = (canvas.width - 100) / Math.max(dataPoints.length - 1, 1);
        
        // 红方数据线
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        dataPoints.forEach((record, index) => {
            const x = 50 + index * stepX;
            const y = canvas.height - 50 - (record.redStar - 1) * (canvas.height - 100) / 9;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // 蓝方数据线
        ctx.strokeStyle = '#4444ff';
        ctx.shadowColor = '#4444ff';
        ctx.beginPath();
        dataPoints.forEach((record, index) => {
            const x = 50 + index * stepX;
            const y = canvas.height - 50 - (record.blueStar - 1) * (canvas.height - 100) / 9;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // 绘制数据点
        ctx.shadowBlur = 0;
        dataPoints.forEach((record, index) => {
            const x = 50 + index * stepX;
            const redY = canvas.height - 50 - (record.redStar - 1) * (canvas.height - 100) / 9;
            const blueY = canvas.height - 50 - (record.blueStar - 1) * (canvas.height - 100) / 9;
            
            // 红方点
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(x, redY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // 蓝方点
            ctx.fillStyle = '#4444ff';
            ctx.beginPath();
            ctx.arc(x, blueY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // 期数标签
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`#${dataPoints.length - index}`, x, canvas.height - 30);
        });
        
        // 图例
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(canvas.width - 150, 20, 15, 15);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('红方', canvas.width - 130, 32);
        
        ctx.fillStyle = '#4444ff';
        ctx.fillRect(canvas.width - 150, 45, 15, 15);
        ctx.fillStyle = 'white';
        ctx.fillText('蓝方', canvas.width - 130, 57);
    }

    // 更新统计信息
    updateStatistics() {
        const statsContainer = document.getElementById('statistics');
        
        if (this.gameHistory.length === 0) {
            statsContainer.innerHTML = '<div class="stat-card"><div class="stat-value">0</div><div class="stat-label">总局数</div></div>';
            return;
        }
        
        const redWins = this.gameHistory.filter(g => g.winner === 'red').length;
        const blueWins = this.gameHistory.filter(g => g.winner === 'blue').length;
        const draws = this.gameHistory.filter(g => g.winner === 'draw').length;
        
        // 计算最常见的星级
        const starCounts = {};
        for (let i = 1; i <= 10; i++) {
            starCounts[i] = 0;
        }
        
        this.gameHistory.forEach(record => {
            starCounts[record.redStar]++;
            starCounts[record.blueStar]++;
        });
        
        const mostCommonStar = Object.keys(starCounts).reduce((a, b) => 
            starCounts[a] > starCounts[b] ? a : b
        );
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${this.gameHistory.length}</div>
                <div class="stat-label">总局数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${redWins}</div>
                <div class="stat-label">红方获胜</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${blueWins}</div>
                <div class="stat-label">蓝方获胜</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${draws}</div>
                <div class="stat-label">平局</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${mostCommonStar}⭐</div>
                <div class="stat-label">最常见星级</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(redWins / this.gameHistory.length * 100).toFixed(1)}%</div>
                <div class="stat-label">红方胜率</div>
            </div>
        `;
    }

    // 更新显示
    updateDisplay() {
        document.getElementById('userPoints').textContent = this.userPoints.toFixed(0);
        
        const totalBets = this.currentBets.red + this.currentBets.blue + 
                         this.currentBets.draw + 
                         this.currentBets.redStars.reduce((a, b) => a + b, 0) +
                         this.currentBets.blueStars.reduce((a, b) => a + b, 0);
        document.getElementById('currentBets').textContent = totalBets;
    }

    // 显示消息
    showMessage(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 1.2em;
            z-index: 2000;
            animation: fadeIn 0.3s;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        this.sounds.click();
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // 设置用户信息（外部调用）
    setUserInfo(userId, points) {
        this.userId = userId;
        this.userPoints = points;
        this.updateDisplay();
    }

    // 获取游戏数据（外部调用）
    getGameData() {
        return {
            userId: this.userId,
            points: this.userPoints,
            gameHistory: this.gameHistory,
            currentBets: this.currentBets
        };
    }

    // 手动更新积分（外部调用）
    updatePoints(points) {
        this.userPoints = points;
        this.updateDisplay();
    }
}

// ==================== 好友系统功能 ====================

// 切换好友标签页
function switchFriendsTab(tabName) {
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
}

// 加载好友数据
async function loadFriendsData() {
    if (!currentUser) return;
    
    try {
        // 获取好友列表
        const friendsResponse = await fetch(`${API_BASE}/friends`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (friendsResponse.ok) {
            const friendsData = await friendsResponse.json();
            userFriends = Array.isArray(friendsData.friends) ? friendsData.friends : [];
            updateFriendsList();
        }
        
        // 获取好友请求
        const requestsResponse = await fetch(`${API_BASE}/friends/requests`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            friendRequests = Array.isArray(requestsData.requests) ? requestsData.requests : [];
            updateFriendRequests();
        }
    } catch (error) {
        console.error('加载好友数据错误:', error);
    }
}

// 更新好友列表
function updateFriendsList() {
    const friendsContainer = document.getElementById('my-friends');
    if (!friendsContainer) return;
    
    friendsContainer.innerHTML = '';
    
    if (!Array.isArray(userFriends) || userFriends.length === 0) {
        friendsContainer.innerHTML = '<p>暂无好友</p>';
        return;
    }
    
    userFriends.forEach(friend => {
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
                <button class="btn btn-sm btn-danger" onclick="deleteFriend('${friend.userId._id}')">
                    <i class="fas fa-trash"></i> 删除好友
                </button>
            </div>
        `;
        friendsContainer.appendChild(friendCard);
    });
}

// 更新好友请求
function updateFriendRequests() {
    const requestsContainer = document.getElementById('friend-requests');
    if (!requestsContainer) return;
    
    requestsContainer.innerHTML = '';
    
    if (!Array.isArray(friendRequests) || friendRequests.length === 0) {
        requestsContainer.innerHTML = '<p>暂无好友请求</p>';
        return;
    }
    
    friendRequests.forEach(request => {
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
                <button class="btn btn-sm btn-success" onclick="respondFriendRequest('${request._id}', 'accept')">
                    <i class="fas fa-check"></i> 接受
                </button>
                <button class="btn btn-sm btn-danger" onclick="respondFriendRequest('${request._id}', 'reject')">
                    <i class="fas fa-times"></i> 拒绝
                </button>
            </div>
        `;
        requestsContainer.appendChild(requestCard);
    });
}

// 搜索用户
async function searchUsers() {
    const username = document.getElementById('search-username').value.trim();
    if (!username) {
        showNotification('请输入搜索关键词', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/friends/search?username=${encodeURIComponent(username)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displaySearchResults(data.users);
        } else {
            showNotification(data.message || '搜索失败', 'error');
        }
    } catch (error) {
        console.error('搜索用户错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 显示搜索结果
function displaySearchResults(users) {
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
                <button class="btn btn-sm" onclick="sendFriendRequest('${user._id}')">
                    <i class="fas fa-user-plus"></i> 添加好友
                </button>
            </div>
        `;
        resultsContainer.appendChild(userCard);
    });
}

// 发送好友请求
async function sendFriendRequest(userId) {
    try {
        const response = await fetch(`${API_BASE}/friends/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ targetUserId: userId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('好友请求已发送', 'success');
        } else {
            showNotification(data.message || '发送失败', 'error');
        }
    } catch (error) {
        console.error('发送好友请求错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 处理好友请求
async function respondFriendRequest(requestId, action) {
    try {
        const response = await fetch(`${API_BASE}/friends/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ requestId, action })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadFriendsData(); // 重新加载好友数据
        } else {
            showNotification(data.message || '操作失败', 'error');
        }
    } catch (error) {
        console.error('处理好友请求错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 删除好友
async function deleteFriend(friendId) {
    if (!confirm('确定要删除这个好友吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/friends/${friendId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadFriendsData(); // 重新加载好友数据
        } else {
            showNotification(data.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除好友错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// ==================== 转账系统功能 ====================

// 加载转账数据
async function loadTransferData() {
    if (!currentUser) return;
    
    try {
        // 更新转账信息显示
        updateTransferInfo();
        
        // 加载好友列表到转账选择框
        await loadFriendsForTransfer();
        
        // 加载转账记录
        await loadTransferHistory();
    } catch (error) {
        console.error('加载转账数据错误:', error);
    }
}

// 更新转账信息
function updateTransferInfo() {
    const currentPoints = document.getElementById('current-points');
    const dailyTransfer = document.getElementById('daily-transfer');
    
    if (currentPoints) {
        currentPoints.textContent = `${currentUser.points.toFixed(2)} 积分`;
    }
    
    if (dailyTransfer) {
        // 这里需要从后端获取今日已转账金额，暂时显示0
        dailyTransfer.textContent = '0.00 积分';
    }
}

// 加载好友到转账选择框
async function loadFriendsForTransfer() {
    try {
        const response = await fetch(`${API_BASE}/friends`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && Array.isArray(data.friends)) {
            const selectElement = document.getElementById('transfer-to');
            if (selectElement) {
                selectElement.innerHTML = '<option value="">请选择好友</option>';
                data.friends.forEach(friend => {
                    const option = document.createElement('option');
                    option.value = friend.userId._id;
                    option.textContent = friend.userId.username;
                    selectElement.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('加载好友列表错误:', error);
    }
}

// 加载转账记录
async function loadTransferHistory() {
    try {
        const response = await fetch(`${API_BASE}/transfers`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            transferHistory = Array.isArray(data.transfers) ? data.transfers : [];
            updateTransferHistory();
        }
    } catch (error) {
        console.error('加载转账记录错误:', error);
    }
}

// 更新转账记录显示
function updateTransferHistory() {
    const historyContainer = document.getElementById('transfer-history');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';
    
    if (!Array.isArray(transferHistory) || transferHistory.length === 0) {
        historyContainer.innerHTML = '<p>暂无转账记录</p>';
        return;
    }
    
    transferHistory.forEach(transfer => {
        const transferItem = document.createElement('div');
        transferItem.className = 'transfer-item';
        
        const isOutgoing = transfer.fromUserId._id === currentUser._id;
        const otherUser = isOutgoing ? transfer.toUserId : transfer.fromUserId;
        
        transferItem.innerHTML = `
            <div class="transfer-info">
                <div class="transfer-user">
                    <i class="fas fa-user"></i>
                    ${otherUser.username}
                </div>
                <div class="transfer-amount ${isOutgoing ? 'outgoing' : 'incoming'}">
                    ${isOutgoing ? '-' : '+'}${transfer.amount.toFixed(2)} 积分
                </div>
                <div class="transfer-date">
                    ${new Date(transfer.createdAt).toLocaleString()}
                </div>
                <div class="transfer-description">
                    ${transfer.description || '无说明'}
                </div>
            </div>
        `;
        
        historyContainer.appendChild(transferItem);
    });
}

// 处理转账
async function handleTransfer(e) {
    e.preventDefault();
    
    const toUserId = document.getElementById('transfer-to').value;
    const amount = parseFloat(document.getElementById('transfer-amount').value);
    const description = document.getElementById('transfer-description').value;
    
    if (!toUserId) {
        showNotification('请选择收款好友', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showNotification('请输入有效的转账金额', 'error');
        return;
    }
    
    if (amount > currentUser.points) {
        showNotification('积分不足', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                toUserId,
                amount,
                description
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('转账成功', 'success');
            currentUser.points = data.user.points;
            updateUI();
            updateTransferInfo();
            
            // 重置表单
            document.getElementById('transfer-form').reset();
            
            // 重新加载转账记录
            await loadTransferHistory();
        } else {
            showNotification(data.message || '转账失败', 'error');
        }
    } catch (error) {
        console.error('转账错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// ==================== 管理员功能 ====================

// 管理员功能
async function loadAdminData() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('您没有管理员权限！', 'error');
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
            allDolls = Array.isArray(dollsData.dolls) ? dollsData.dolls : [];
            updateDollsTable(allDolls);
        }
        
        // 获取交易记录
        const transactionsResponse = await fetch(`${API_BASE}/admin/transactions`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json();
            allTransactions = Array.isArray(transactionsData.transactions) ? transactionsData.transactions : [];
            updateTransactionsTable(allTransactions);
        }
        
        // 获取系统配置
        const configResponse = await fetch(`${API_BASE}/admin/system-config`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (configResponse.ok) {
            const configData = await configResponse.json();
            updateSystemConfigUI(configData.config);
        }
        
    } catch (error) {
        console.error('加载管理员数据错误:', error);
        showNotification('加载管理员数据失败: ' + error.message, 'error');
    }
}

// 更新用户表格
function updateUsersTable() {
    const usersTable = document.getElementById('users-table');
    if (!usersTable) return;
    
    usersTable.innerHTML = '';
    
    if (!Array.isArray(allUsers)) {
        usersTable.innerHTML = '<tr><td colspan="7">暂无用户数据</td></tr>';
        return;
    }
    
    allUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user._id}</td>
            <td>${user.username || '未知用户'}</td>
            <td>${user.points || 0}</td>
            <td>${user.dollCount || 0}</td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知日期'}</td>
            <td>${user.active ? '活跃' : '禁用'}</td>
            <td>
                <button class="btn btn-sm" onclick="adjustUserPoints('${user._id}')">
                    <i class="fas fa-edit"></i> 调整积分
                </button>
                <button class="btn btn-sm btn-danger" onclick="toggleUserStatus('${user._id}')">
                    <i class="fas fa-ban"></i> ${user.active ? '禁用' : '启用'}
                </button>
            </td>
        `;
        usersTable.appendChild(row);
    });
}

// 更新娃娃表格
function updateDollsTable(dolls) {
    const dollsTable = document.getElementById('dolls-table');
    if (!dollsTable) return;
    
    dollsTable.innerHTML = '';
    
    if (!Array.isArray(dolls)) {
        dollsTable.innerHTML = '<tr><td colspan="8">暂无娃娃数据</td></tr>';
        return;
    }
    
    dolls.forEach(doll => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doll._id}</td>
            <td>${doll.userId && doll.userId.username ? doll.userId.username : (doll.userId || '未知用户')}</td>
            <td>${doll.level || 1}</td>
            <td>${doll.purchaseDate ? new Date(doll.purchaseDate).toLocaleDateString() : '未知日期'}</td>
            <td>${doll.remainingDays || 0}</td>
            <td>${doll.dailyIncome || 0}</td>
            <td>${doll.active ? '活跃' : '非活跃'}</td>
            <td>
                <button class="btn btn-sm" onclick="adjustDollLifespan('${doll._id}', ${doll.remainingDays || 0})">
                    <i class="fas fa-clock"></i> 调整寿命
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteDoll('${doll._id}')">
                    <i class="fas fa-trash"></i> 删除
                </button>
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
            <td>${getTransactionTypeText(transaction.type)}</td>
            <td>${transaction.amount || 0}</td>
            <td>${transaction.description || '无描述'}</td>
        `;
        transactionsTable.appendChild(row);
    });
}

// 获取交易类型文本
function getTransactionTypeText(type) {
    const typeMap = {
        'purchase': '购买',
        'synthesis': '合成',
        'income': '收益',
        'transfer_in': '转入',
        'transfer_out': '转出',
        'recycle': '回收',
        'admin_adjust': '管理员调整',
        'admin_grant': '管理员发放'
    };
    return typeMap[type] || type;
}

// 更新系统配置UI
function updateSystemConfigUI(config) {
    if (!config) return;
    
    const level1Price = document.getElementById('level1-price');
    const level2Price = document.getElementById('level2-price');
    const level3Price = document.getElementById('level3-price');
    
    if (level1Price && config.dollPrices) {
        level1Price.value = config.dollPrices[1] || 50;
    }
    if (level2Price && config.dollPrices) {
        level2Price.value = config.dollPrices[2] || 210;
    }
    if (level3Price && config.dollPrices) {
        level3Price.value = config.dollPrices[3] || 500;
    }
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

// 筛选娃娃
function filterDolls() {
    const level = document.getElementById('doll-level-filter')?.value;
    const active = document.getElementById('doll-status-filter')?.value;
    const username = document.getElementById('doll-user-filter')?.value.toLowerCase();
    
    let filteredDolls = [...allDolls];
    
    if (level) {
        filteredDolls = filteredDolls.filter(doll => doll.level === parseInt(level));
    }
    
    if (active) {
        filteredDolls = filteredDolls.filter(doll => doll.active === (active === 'true'));
    }
    
    if (username) {
        filteredDolls = filteredDolls.filter(doll => 
            doll.userId && doll.userId.username && 
            doll.userId.username.toLowerCase().includes(username)
        );
    }
    
    updateDollsTable(filteredDolls);
}

// 筛选交易记录
function filterTransactions() {
    const type = document.getElementById('transaction-type-filter')?.value;
    const username = document.getElementById('transaction-user-filter')?.value.toLowerCase();
    const startDate = document.getElementById('transaction-start-date')?.value;
    const endDate = document.getElementById('transaction-end-date')?.value;
    
    let filteredTransactions = [...allTransactions];
    
    if (type) {
        filteredTransactions = filteredTransactions.filter(transaction => transaction.type === type);
    }
    
    if (username) {
        filteredTransactions = filteredTransactions.filter(transaction => 
            transaction.userId && transaction.userId.username && 
            transaction.userId.username.toLowerCase().includes(username)
        );
    }
    
    if (startDate) {
        filteredTransactions = filteredTransactions.filter(transaction => 
            transaction.createdAt && new Date(transaction.createdAt) >= new Date(startDate)
        );
    }
    
    if (endDate) {
        filteredTransactions = filteredTransactions.filter(transaction => 
            transaction.createdAt && new Date(transaction.createdAt) <= new Date(endDate + 'T23:59:59')
        );
    }
    
    updateTransactionsTable(filteredTransactions);
}

// 调整娃娃寿命
function adjustDollLifespan(dollId, currentDays) {
    const modal = document.getElementById('adjust-lifespan-modal');
    const dollIdInput = document.getElementById('adjust-doll-id');
    const lifespanInput = document.getElementById('new-lifespan');
    
    if (dollIdInput) dollIdInput.value = dollId;
    if (lifespanInput) lifespanInput.value = currentDays;
    
    if (modal) modal.style.display = 'flex';
}

// 处理调整寿命表单提交
async function handleAdjustLifespan(e) {
    e.preventDefault();
    
    const dollId = document.getElementById('adjust-doll-id').value;
    const newLifespan = parseInt(document.getElementById('new-lifespan').value);
    
    if (!dollId || isNaN(newLifespan)) {
        showNotification('请输入有效的寿命数值！', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/adjust-doll-lifespan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ dollId, remainingDays: newLifespan })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('娃娃寿命调整成功！', 'success');
            closeModal('adjust-lifespan-modal');
            loadAdminData(); // 重新加载数据
        } else {
            showNotification(data.message || '调整失败', 'error');
        }
    } catch (error) {
        console.error('调整娃娃寿命错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 更新娃娃价格
async function updateDollPrices() {
    const level1Price = parseInt(document.getElementById('level1-price').value);
    const level2Price = parseInt(document.getElementById('level2-price').value);
    const level3Price = parseInt(document.getElementById('level3-price').value);
    
    if (isNaN(level1Price) || isNaN(level2Price) || isNaN(level3Price)) {
        showNotification('请输入有效的价格！', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/update-doll-prices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                prices: {
                    1: level1Price,
                    2: level2Price,
                    3: level3Price
                }
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('娃娃价格更新成功！', 'success');
            // 更新前端显示的价格
            updatePriceDisplay();
        } else {
            showNotification(data.message || '更新失败', 'error');
        }
    } catch (error) {
        console.error('更新娃娃价格错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 更新价格显示
function updatePriceDisplay() {
    const level1Price = document.getElementById('level1-price').value;
    const level2Price = document.getElementById('level2-price').value;
    const level3Price = document.getElementById('level3-price').value;
    
    // 更新购买区域的价格显示
    const priceElements = document.querySelectorAll('.doll-price');
    if (priceElements[0]) priceElements[0].textContent = `${level1Price} 积分`;
    if (priceElements[1]) priceElements[1].textContent = `${level2Price} 积分`;
    if (priceElements[2]) priceElements[2].textContent = `${level3Price} 积分`;
}

// 计算每日收益
async function calculateDailyIncome() {
    if (!confirm('确定要计算并发放今日收益吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/calculate-daily-income`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message || '每日收益计算完成', 'success');
        } else {
            showNotification(data.message || '计算失败', 'error');
        }
    } catch (error) {
        console.error('计算每日收益错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 管理员功能：调整用户积分
async function adjustUserPoints(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;
    
    const newPoints = prompt(`请输入用户 ${user.username} 的新积分数量:`, user.points);
    if (newPoints === null) return;
    
    const points = parseFloat(newPoints);
    if (isNaN(points) || points < 0) {
        showNotification('请输入有效的积分数量！', 'error');
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
            showNotification('积分调整成功！', 'success');
            loadAdminData(); // 重新加载数据
        } else {
            showNotification(data.message || '积分调整失败', 'error');
        }
    } catch (error) {
        console.error('调整积分错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 管理员功能：切换用户状态
async function toggleUserStatus(userId) {
    if (!confirm('确定要切换该用户的状态吗？')) return;
    
    try {
        // 注意：你的后端没有这个接口，这里只是示例
        showNotification('此功能需要后端支持切换用户状态的接口', 'warning');
    } catch (error) {
        console.error('切换用户状态错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 管理员功能：删除娃娃
async function deleteDoll(dollId) {
    if (!confirm('确定要删除这个娃娃吗？此操作不可恢复！')) return;
    
    try {
        // 注意：你的后端没有这个接口，这里只是示例
        showNotification('此功能需要后端支持删除娃娃的接口', 'warning');
    } catch (error) {
        console.error('删除娃娃错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

// 导出交易记录
function exportTransactions() {
    showNotification('导出功能开发中...', 'info');
}

// 重置系统
function resetSystem() {
    if (!confirm('确定要重置系统吗？此操作不可恢复！')) return;
    showNotification('重置系统功能需要后端支持', 'warning');
}

// 创建用户
function createUser() {
    showNotification('创建用户功能开发中...', 'info');
}

// 批量发放积分
function addUserPoints() {
    showNotification('批量发放积分功能开发中...', 'info');
}
