// 娃娃收藏游戏 - 前端JavaScript
// 全局变量
let currentUser = null;
let userDolls = [];
let allUsers = [];
let selectedDollsForSynthesis = [null, null];

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
        
        // 获取交易记录
        showTransactionHistory();
        
    } catch (error) {
        console.error('加载用户数据错误:', error);
    }
}

// 显示交易记录
async function showTransactionHistory() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/transactions/my-transactions`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateTransactionHistory(data.transactions);
        }
    } catch (error) {
        console.error('获取交易记录错误:', error);
    }
}

// 更新交易记录显示
function updateTransactionHistory(transactions) {
    const historyContainer = document.getElementById('payout-history');
    if (!historyContainer) return;
    
    if (!transactions || transactions.length === 0) {
        historyContainer.innerHTML = '<p>暂无交易记录</p>';
        return;
    }
    
    const recentTransactions = transactions.slice(0, 5);
    let html = '';
    
    recentTransactions.forEach(tx => {
        const amountClass = tx.amount > 0 ? 'text-success' : 'text-danger';
        const amountSign = tx.amount > 0 ? '+' : '';
        
        html += `
            <div class="transaction-item">
                <div class="transaction-type">${getTypeLabel(tx.type)}</div>
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}${tx.amount.toFixed(2)}
                </div>
                <div class="transaction-time">
                    ${new Date(tx.createdAt).toLocaleString()}
                </div>
                <div class="transaction-desc">${tx.description}</div>
            </div>
        `;
    });
    
    historyContainer.innerHTML = html;
}

// 获取交易类型标签
function getTypeLabel(type) {
    const labels = {
        'purchase': '购买',
        'synthesis': '合成',
        'income': '收益',
        'admin_adjust': '系统调整',
        'admin_grant': '管理员发放'
    };
    return labels[type] || type;
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
        }
        
        // 获取交易记录
        const transactionsResponse = await fetch(`${API_BASE}/admin/transactions`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json();
            updateTransactionsTable(Array.isArray(transactionsData.transactions) ? transactionsData.transactions : []);
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
        usersTable.innerHTML = '<tr><td colspan="8">暂无用户数据</td></tr>';
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

// 管理员功能：更新娃娃价格
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

// 管理员功能：切换用户状态（禁用/启用）
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

// 管理员功能：编辑用户信息
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

// 管理员功能：删除娃娃
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

// 管理员：批量发放积分
function showBatchGrantModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">批量发放积分</div>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="batch-grant-form">
                <div class="form-group">
                    <label class="form-label">选择用户</label>
                    <div id="user-checkboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
                        <!-- 用户复选框将在这里动态生成 -->
                    </div>
                </div>
                <div class="form-group">
                    <label for="grant-points" class="form-label">积分数量</label>
                    <input type="number" id="grant-points" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="grant-reason" class="form-label">发放原因</label>
                    <input type="text" id="grant-reason" class="form-control" placeholder="可选">
                </div>
                <button type="submit" class="btn btn-block">确认发放</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 生成用户复选框
    const checkboxesContainer = document.getElementById('user-checkboxes');
    allUsers.forEach(user => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.innerHTML = `
            <label style="display: block; margin-bottom: 5px;">
                <input type="checkbox" name="userIds" value="${user._id}">
                ${user.username} (${user.email})
            </label>
        `;
        checkboxesContainer.appendChild(checkboxDiv);
    });
    
    // 绑定表单提交事件
    document.getElementById('batch-grant-form').addEventListener('submit', handleBatchGrant);
}

// 处理批量发放
async function handleBatchGrant(e) {
    e.preventDefault();
    
    const checkboxes = document.querySelectorAll('input[name="userIds"]:checked');
    const userIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (userIds.length === 0) {
        alert('请至少选择一个用户');
        return;
    }
    
    const points = document.getElementById('grant-points').value;
    const reason = document.getElementById('grant-reason').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/grant-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userIds, points, reason })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`批量发放完成！成功: ${data.results.filter(r => r.success).length}, 失败: ${data.results.filter(r => !r.success).length}`);
            document.querySelector('.modal').remove();
            loadAdminData(); // 重新加载数据
        } else {
            alert(data.message || '批量发放失败');
        }
    } catch (error) {
        console.error('批量发放错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 导出数据
function exportData(type) {
    const token = localStorage.getItem('token');
    window.open(`${API_BASE}/admin/export/${type}?token=${token}`, '_blank');
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
                <button class="btn btn-secondary" onclick="resetDollFilters()">重置</button>
            </div>
        </div>
    `;
}

// 筛选娃娃
function filterDolls() {
    // 重新获取娃娃数据并应用筛选
    loadAdminData();
}

// 重置娃娃筛选器
function resetDollFilters() {
    document.getElementById('doll-level-filter').value = 'all';
    document.getElementById('doll-status-filter').value = 'all';
    document.getElementById('doll-user-filter').value = '';
    filterDolls();
}

// 管理员功能：创建用户
function createUser() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">创建新用户</div>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="create-user-form">
                <div class="form-group">
                    <label for="new-username" class="form-label">用户名</label>
                    <input type="text" id="new-username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="new-password" class="form-label">密码</label>
                    <input type="password" id="new-password" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="new-email" class="form-label">邮箱</label>
                    <input type="email" id="new-email" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="new-points" class="form-label">初始积分</label>
                    <input type="number" id="new-points" class="form-control" value="1000" required>
                </div>
                <button type="submit" class="btn btn-block">创建用户</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定表单提交事件
    document.getElementById('create-user-form').addEventListener('submit', handleCreateUser);
}

// 处理创建用户
async function handleCreateUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const email = document.getElementById('new-email').value;
    const points = document.getElementById('new-points').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ username, password, email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 如果设置了初始积分，调整用户积分
            if (parseFloat(points) !== 1000) {
                const userResponse = await fetch(`${API_BASE}/admin/users`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (userResponse.ok) {
                    const usersData = await userResponse.json();
                    const newUser = usersData.users.find(u => u.username === username);
                    if (newUser) {
                        await fetch(`${API_BASE}/admin/adjust-points`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ userId: newUser._id, points: parseFloat(points) })
                        });
                    }
                }
            }
            
            alert('用户创建成功！');
            document.querySelector('.modal').remove();
            loadAdminData(); // 重新加载数据
        } else {
            alert(data.message || '用户创建失败');
        }
    } catch (error) {
        console.error('创建用户错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 管理员功能：计算今日收益
async function calculateDailyIncome() {
    if (!confirm('确定要手动计算今日收益吗？这通常会在每天0点自动执行。')) return;
    
    try {
        // 这里可以调用后端的手动收益计算接口
        alert('此功能需要后端支持手动收益计算接口');
        // 实际实现时，可以调用类似这样的接口：
        // await fetch(`${API_BASE}/admin/calculate-daily-income`, {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${localStorage.getItem('token')}`
        //     }
        // });
    } catch (error) {
        console.error('计算收益错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 管理员功能：重置系统
async function resetSystem() {
    const confirmation = prompt('此操作将重置系统数据，请输入 "RESET" 确认：');
    if (confirmation !== 'RESET') {
        alert('确认文本不正确，操作已取消');
        return;
    }
    
    if (!confirm('警告：此操作将重置所有用户数据和娃娃数据，且不可恢复！确定要继续吗？')) return;
    
    try {
        // 这里可以调用后端的重置系统接口
        alert('此功能需要后端支持系统重置接口');
        // 实际实现时，可以调用类似这样的接口：
        // await fetch(`${API_BASE}/admin/reset-system`, {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${localStorage.getItem('token')}`
        //     }
        // });
    } catch (error) {
        console.error('重置系统错误:', error);
        alert('网络错误，请稍后重试');
    }
}
