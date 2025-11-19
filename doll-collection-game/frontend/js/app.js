// 娃娃收藏游戏 - 前端JavaScript
// 全局变量
let currentUser = null;
let userDolls = [];
let allUsers = [];
let selectedDollsForSynthesis = [null, null];
let allTransactions = [];
let allDolls = [];

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
    const adjustLifespanForm = document.getElementById('adjust-lifespan-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (adjustLifespanForm) {
        adjustLifespanForm.addEventListener('submit', handleAdjustLifespan);
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

// 购买娃娃 - 修改：支持批量购买
async function buyDoll(level) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const quantityInput = document.getElementById(`level${level}-quantity`);
    const quantity = parseInt(quantityInput?.value) || 1;
    
    if (quantity < 1 || quantity > 100) {
        alert('购买数量必须在1-100之间！');
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
            alert(`成功购买${quantity}个${level}级娃娃！`);
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
                alert(`合成成功！获得${data.newDoll.level}级娃娃，剩余${data.newDoll.remainingDays}天！`);
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
        alert('加载管理员数据失败: ' + error.message);
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
                <button class="btn btn-sm" onclick="adjustUserPoints('${user._id}')">调整积分</button>
                <button class="btn btn-sm btn-danger" onclick="toggleUserStatus('${user._id}')">${user.active ? '禁用' : '启用'}</button>
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
                <button class="btn btn-sm" onclick="adjustDollLifespan('${doll._id}', ${doll.remainingDays || 0})">调整寿命</button>
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
        alert('请输入有效的寿命数值！');
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
            alert('娃娃寿命调整成功！');
            closeModal('adjust-lifespan-modal');
            loadAdminData(); // 重新加载数据
        } else {
            alert(data.message || '调整失败');
        }
    } catch (error) {
        console.error('调整娃娃寿命错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 更新娃娃价格
async function updateDollPrices() {
    const level1Price = parseInt(document.getElementById('level1-price').value);
    const level2Price = parseInt(document.getElementById('level2-price').value);
    const level3Price = parseInt(document.getElementById('level3-price').value);
    
    if (isNaN(level1Price) || isNaN(level2Price) || isNaN(level3Price)) {
        alert('请输入有效的价格！');
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
            alert('娃娃价格更新成功！');
            // 更新前端显示的价格
            updatePriceDisplay();
        } else {
            alert(data.message || '更新失败');
        }
    } catch (error) {
        console.error('更新娃娃价格错误:', error);
        alert('网络错误，请稍后重试');
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
            alert(data.message || '每日收益计算完成');
        } else {
            alert(data.message || '计算失败');
        }
    } catch (error) {
        console.error('计算每日收益错误:', error);
        alert('网络错误，请稍后重试');
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

// 管理员功能：切换用户状态
async function toggleUserStatus(userId) {
    if (!confirm('确定要切换该用户的状态吗？')) return;
    
    try {
        // 注意：你的后端没有这个接口，这里只是示例
        alert('此功能需要后端支持切换用户状态的接口');
    } catch (error) {
        console.error('切换用户状态错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 管理员功能：删除娃娃
async function deleteDoll(dollId) {
    if (!confirm('确定要删除这个娃娃吗？此操作不可恢复！')) return;
    
    try {
        // 注意：你的后端没有这个接口，这里只是示例
        alert('此功能需要后端支持删除娃娃的接口');
    } catch (error) {
        console.error('删除娃娃错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 导出交易记录
function exportTransactions() {
    alert('导出功能开发中...');
}

// 重置系统
function resetSystem() {
    if (!confirm('确定要重置系统吗？此操作不可恢复！')) return;
    alert('重置系统功能需要后端支持');
}

// 创建用户
function createUser() {
    alert('创建用户功能开发中...');
}

// 批量发放积分
function addUserPoints() {
    alert('批量发放积分功能开发中...');
}
