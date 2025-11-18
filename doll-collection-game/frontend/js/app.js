// 娃娃收藏游戏 - 前端JavaScript
// 全局变量
let currentUser = null;
let userDolls = [];
let allUsers = [];
let selectedDollsForSynthesis = [null, null];
const API_BASE = 'https://tianchuang.onrender.com/api';

// 检查当前页面是否是index.html
function isIndexPage() {
    return window.location.pathname.endsWith('index.html') || 
           window.location.pathname.endsWith('/') ||
           document.getElementById('user-panel') !== null;
}

// 检查当前页面是否是profile.html
function isProfilePage() {
    return window.location.pathname.endsWith('profile.html') || 
           document.getElementById('profile-container') !== null;
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化娃娃收藏游戏...');
    
    // 通用初始化（所有页面都需要）
    initializeCommonFeatures();
    
    // 只在index.html页面执行特定初始化
    if (isIndexPage()) {
        initializeGame();
    } else if (isProfilePage()) {
        console.log('检测到个人资料页面，跳过游戏初始化');
    }
});

// 通用初始化函数（所有页面共享）
function initializeCommonFeatures() {
    initializeAuth();
    updateNavigation();
    checkServerStatus();
}

// 游戏特定初始化（仅index.html）
function initializeGame() {
    // 初始化事件监听器
    initEventListeners();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 设置收益倒计时
    updateCountdown();
    setInterval(updateCountdown, 60000);
    
    // 加载用户数据
    loadUserData();
}

// 初始化认证相关功能
function initializeAuth() {
    // 退出按钮事件
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 表单提交
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// 更新导航状态
function updateNavigation() {
    // 更新用户积分显示
    updateUserPoints();
}

// 初始化所有事件监听器
function initEventListeners() {
    console.log('初始化事件监听器...');
    
    // 导航链接 - 只选择有 data-panel 属性的链接
    const navLinks = document.querySelectorAll('.nav-link[data-panel]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const panelId = this.getAttribute('data-panel');
            console.log('切换面板:', panelId);
            showPanel(panelId);
        });
    });
    
    // 合成积分输入
    const synthesisPoints = document.getElementById('synthesis-points');
    if (synthesisPoints) {
        synthesisPoints.addEventListener('input', updateSuccessRate);
    }
    
    console.log('事件监听器初始化完成');
}

// 检查服务器状态
async function checkServerStatus() {
    const serverStatusElement = document.getElementById('server-status');
    if (!serverStatusElement) return;
    
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            serverStatusElement.textContent = '在线';
            serverStatusElement.style.color = 'green';
        } else {
            serverStatusElement.textContent = '离线';
            serverStatusElement.style.color = 'red';
        }
    } catch (error) {
        serverStatusElement.textContent = '连接失败';
        serverStatusElement.style.color = 'red';
        console.error('服务器连接失败:', error);
    }
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // 验证token有效性
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
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.style.display = 'flex';
    }
}

// 显示注册模态框
function showRegisterModal() {
    closeModal('login-modal');
    const registerModal = document.getElementById('register-modal');
    if (registerModal) {
        registerModal.style.display = 'flex';
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
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            currentUser = data.user;
            updateUI();
            closeModal('login-modal');
            loadUserData();
            
            // 如果是profile页面，刷新页面以加载个人资料数据
            if (isProfilePage()) {
                window.location.reload();
            }
        } else {
            alert(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('网络错误，请稍后重试');
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
    localStorage.removeItem('currentUser');
    currentUser = null;
    userDolls = [];
    updateUI();
    showLoginModal();
    
    // 如果是profile页面，跳转到首页
    if (isProfilePage()) {
        window.location.href = 'index.html';
    }
}

// 更新UI
function updateUI() {
    updateUserPoints();
    
    if (currentUser) {
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username.charAt(0).toUpperCase()}`;
        }
        
        if (currentUser.role === 'admin') {
            const adminLink = document.getElementById('admin-link');
            if (adminLink) {
                adminLink.style.display = 'block';
            }
        }
    } else {
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
        
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}

// 更新用户积分显示
function updateUserPoints() {
    const userPointsElement = document.getElementById('user-points');
    if (!userPointsElement) return;
    
    if (currentUser) {
        userPointsElement.textContent = currentUser.points.toFixed(2) + ' 积分';
    } else {
        userPointsElement.textContent = '0.00 积分';
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
            userDolls = data.dolls;
            
            // 只在index.html中更新统计和娃娃列表
            if (isIndexPage()) {
                updateUserStats();
                updateMyDollsList();
            }
        }
    } catch (error) {
        console.error('加载用户数据错误:', error);
    }
}

// 更新用户统计信息
function updateUserStats() {
    // 检查是否在index.html页面
    if (!isIndexPage()) return;
    
    // 计算统计数据
    const totalDolls = userDolls.length;
    const activeDolls = userDolls.filter(doll => doll.active).length;
    const dailyIncome = userDolls.reduce((sum, doll) => sum + (doll.active ? doll.dailyIncome : 0), 0);
    const avgLifespan = totalDolls > 0 ? 
        userDolls.reduce((sum, doll) => sum + doll.lifespan, 0) / totalDolls : 0;
    
    // 安全更新UI元素
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };
    
    updateElement('total-dolls', totalDolls);
    updateElement('active-dolls', activeDolls);
    updateElement('daily-income', dailyIncome.toFixed(2));
    updateElement('avg-lifespan', Math.round(avgLifespan));
    updateElement('expected-payout', dailyIncome.toFixed(2));
    
    // 计算分级收益
    const level1Income = userDolls
        .filter(doll => doll.level === 1 && doll.active)
        .reduce((sum, doll) => sum + doll.dailyIncome, 0);
    const level2Income = userDolls
        .filter(doll => doll.level === 2 && doll.active)
        .reduce((sum, doll) => sum + doll.dailyIncome, 0);
    const level3Income = userDolls
        .filter(doll => doll.level === 3 && doll.active)
        .reduce((sum, doll) => sum + doll.dailyIncome, 0);
        
    updateElement('level1-income', level1Income.toFixed(2));
    updateElement('level2-income', level2Income.toFixed(2));
    updateElement('level3-income', level3Income.toFixed(2));
}

// 更新我的娃娃列表
function updateMyDollsList() {
    const myDollsContainer = document.getElementById('my-dolls');
    if (!myDollsContainer) return;
    
    myDollsContainer.innerHTML = '';
    
    if (userDolls.length === 0) {
        myDollsContainer.innerHTML = '<p>您还没有任何娃娃，快去购买吧！</p>';
        return;
    }
    
    userDolls.forEach(doll => {
        const dollCard = document.createElement('div');
        dollCard.className = 'doll-card';
        dollCard.innerHTML = `
            <div class="doll-header">
                <h3>${doll.level}级娃娃</h3>
                <div class="doll-level">ID: ${doll.id}</div>
            </div>
            <div class="doll-body">
                <div class="doll-feature">
                    <i class="fas fa-gem"></i>
                    <span>每日收益 ${doll.dailyIncome} 积分</span>
                </div>
                <div class="doll-feature">
                    <i class="fas fa-clock"></i>
                    <span>剩余 ${doll.remainingDays} 天</span>
                </div>
                <div class="doll-feature">
                    <i class="fas fa-calendar"></i>
                    <span>购买日期 ${new Date(doll.purchaseDate).toLocaleDateString()}</span>
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
    // 检查是否在index.html页面
    if (!isIndexPage()) return;
    
    const hoursElement = document.getElementById('countdown-hours');
    const minutesElement = document.getElementById('countdown-minutes');
    
    if (!hoursElement || !minutesElement) {
        return; // 元素不存在，可能是profile页面
    }
    
    const now = new Date();
    const target = new Date();
    target.setHours(24, 0, 0, 0); // 设置为今天的24:00
    
    // 如果当前时间已经超过24:00，则设置为明天的24:00
    if (now > target) {
        target.setDate(target.getDate() + 1);
    }
    
    const diff = target - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    hoursElement.textContent = hours.toString().padStart(2, '0');
    minutesElement.textContent = minutes.toString().padStart(2, '0');
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
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            userDolls.push(data.doll);
            updateUI();
            
            // 只在index.html中更新统计和娃娃列表
            if (isIndexPage()) {
                updateUserStats();
                updateMyDollsList();
            }
            
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
    
    // 更新导航链接状态 - 只更新有 data-panel 属性的链接
    document.querySelectorAll('.nav-link[data-panel]').forEach(link => {
        link.classList.remove('active');
    });
    
    const targetLink = document.querySelector(`[data-panel="${panelId}"]`);
    if (targetLink) {
        targetLink.classList.add('active');
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
    
    const availableDolls = userDolls.filter(doll => doll.active && doll.level < 3);
    
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
                <div class="doll-level">ID: ${doll.id}</div>
            </div>
            <div class="doll-body">
                <div class="doll-feature">
                    <i class="fas fa-gem"></i>
                    <span>每日收益 ${doll.dailyIncome} 积分</span>
                </div>
                <div class="doll-feature">
                    <i class="fas fa-clock"></i>
                    <span>剩余 ${doll.remainingDays} 天</span>
                </div>
                <button class="btn btn-block" onclick="selectDollForSynthesisFromList(${doll.id})">选择</button>
            </div>
        `;
        availableDollsContainer.appendChild(dollCard);
    });
}

// 选择娃娃用于合成
function selectDollForSynthesis(slot) {
    // 如果已经有娃娃被选中，取消选择
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
    
    // 在实际应用中，这里应该打开一个选择娃娃的模态框
    // 这里我们简单地从第一个可用娃娃中选择
    const availableDolls = userDolls.filter(doll => doll.active && doll.level < 3);
    if (availableDolls.length === 0) {
        alert('没有可用的娃娃！');
        return;
    }
    
    // 选择一个娃娃
    const selectedDoll = availableDolls[0];
    selectedDollsForSynthesis[slot-1] = selectedDoll;
    
    // 更新UI
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
    const doll = userDolls.find(d => d.id === dollId);
    if (!doll) return;
    
    // 找到第一个空槽位
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
    
    // 更新UI
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
        if (selectedDollsForSynthesis[0] && selectedDollsForSynthesis[1]) {
            synthesisBtn.disabled = false;
        } else {
            synthesisBtn.disabled = true;
        }
    }
}

// 更新成功率
function updateSuccessRate() {
    const pointsInput = document.getElementById('synthesis-points');
    if (!pointsInput) return;
    
    const points = parseInt(pointsInput.value) || 0;
    const baseRate = 0; // 基础成功率为0%
    const successRate = baseRate + (points * 0.9); // 每投入1积分提高0.9%成功率
    
    const successRateElement = document.getElementById('success-rate');
    if (successRateElement) {
        successRateElement.textContent = `当前成功率: ${Math.min(successRate, 100).toFixed(1)}%`;
    }
}

// 合成娃娃
async function synthesizeDolls() {
    if (!selectedDollsForSynthesis[0] || !selectedDollsForSynthesis[1]) {
        alert('请选择两个娃娃进行合成！');
        return;
    }
    
    const doll1 = selectedDollsForSynthesis[0];
    const doll2 = selectedDollsForSynthesis[1];
    
    // 检查两个娃娃等级是否相同
    if (doll1.level !== doll2.level) {
        alert('只能合成相同等级的娃娃！');
        return;
    }
    
    // 检查娃娃等级是否小于3
    if (doll1.level >= 3) {
        alert('无法合成更高级别的娃娃！');
        return;
    }
    
    const pointsInput = document.getElementById('synthesis-points');
    const points = parseInt(pointsInput.value) || 0;
    
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
                doll1Id: doll1.id,
                doll2Id: doll2.id,
                points
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser.points = data.user.points;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            userDolls = data.dolls;
            updateUI();
            
            // 只在index.html中更新统计和娃娃列表
            if (isIndexPage()) {
                updateUserStats();
                updateMyDollsList();
                updateAvailableDolls();
            }
            
            if (data.success) {
                alert(`合成成功！获得${data.newDoll.level}级娃娃！`);
            } else {
                alert('合成失败！积分已消耗，娃娃保持不变。');
            }
            
            // 重置合成界面
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
    
    const slot1 = document.getElementById('slot1');
    const slot2 = document.getElementById('slot2');
    const resultSlot = document.getElementById('result-slot');
    const pointsInput = document.getElementById('synthesis-points');
    
    if (slot1) {
        slot1.innerHTML = '<i class="fas fa-plus"></i>';
        slot1.classList.remove('selected');
    }
    if (slot2) {
        slot2.innerHTML = '<i class="fas fa-plus"></i>';
        slot2.classList.remove('selected');
    }
    if (resultSlot) {
        resultSlot.innerHTML = '<i class="fas fa-question"></i>';
    }
    if (pointsInput) {
        pointsInput.value = '0';
    }
    
    updateSynthesisButton();
    updateSuccessRate();
}

// 加载管理员数据
async function loadAdminData() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('您没有管理员权限！');
        return;
    }
    
    try {
        // 获取系统配置
        const configResponse = await fetch(`${API_BASE}/admin/system-config`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (configResponse.ok) {
            const configData = await configResponse.json();
            // 更新娃娃价格输入框
            const level1Price = document.getElementById('level1-price');
            const level2Price = document.getElementById('level2-price');
            const level3Price = document.getElementById('level3-price');
            
            if (level1Price) level1Price.value = configData.config.dollPrices[1];
            if (level2Price) level2Price.value = configData.config.dollPrices[2];
            if (level3Price) level3Price.value = configData.config.dollPrices[3];
        }
        
        // 获取所有用户
        const usersResponse = await fetch(`${API_BASE}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            allUsers = usersData.users;
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
            updateDollsTable(dollsData.dolls);
        }
        
        // 获取交易记录
        const transactionsResponse = await fetch(`${API_BASE}/admin/transactions`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json();
            updateTransactionsTable(transactionsData.transactions);
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
    
    allUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.points}</td>
            <td>${user.dollCount || 0}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>${user.active ? '活跃' : '禁用'}</td>
            <td>
                <button class="btn btn-sm" onclick="adjustUserPoints(${user.id})">调整积分</button>
                <button class="btn btn-sm btn-danger" onclick="toggleUserStatus(${user.id})">${user.active ? '禁用' : '启用'}</button>
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
    
    dolls.forEach(doll => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doll.id}</td>
            <td>${doll.username || doll.userId}</td>
            <td>${doll.level}</td>
            <td>${new Date(doll.purchaseDate).toLocaleDateString()}</td>
            <td>${doll.remainingDays}</td>
            <td>${doll.dailyIncome}</td>
            <td>${doll.active ? '活跃' : '非活跃'}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteDoll(${doll.id})">删除</button>
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
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(transaction.createdAt).toLocaleString()}</td>
            <td>${transaction.username || transaction.userId}</td>
            <td>${transaction.type}</td>
            <td>${transaction.amount}</td>
            <td>${transaction.description}</td>
        `;
        transactionsTable.appendChild(row);
    });
}

// 切换管理员标签页
function switchAdminTab(tabName) {
    // 更新标签状态
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 激活选中的标签
    event.target.classList.add('active');
    const targetContent = document.getElementById(`admin-${tabName}`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// 调整用户积分（管理员功能）
async function adjustUserPoints(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newPoints = prompt(`调整用户 ${user.username} 的积分:`, user.points);
    if (newPoints !== null && !isNaN(newPoints)) {
        try {
            const response = await fetch(`${API_BASE}/admin/adjust-points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId,
                    points: parseFloat(newPoints)
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(`已更新用户 ${user.username} 的积分为 ${newPoints}`);
                loadAdminData();
            } else {
                alert(data.message || '更新失败');
            }
        } catch (error) {
            console.error('调整用户积分错误:', error);
            alert('网络错误，请稍后重试');
        }
    }
}

// 切换用户状态（管理员功能）
async function toggleUserStatus(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
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
            alert(`已${user.active ? '禁用' : '启用'}用户 ${user.username}`);
            loadAdminData();
        } else {
            alert(data.message || '操作失败');
        }
    } catch (error) {
        console.error('切换用户状态错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 创建用户（管理员功能）
async function createUser() {
    const username = prompt('请输入用户名:');
    if (!username) return;
    
    const password = prompt('请输入密码:');
    if (!password) return;
    
    const email = prompt('请输入邮箱:');
    if (!email) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ username, password, email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`已创建用户 ${username}`);
            loadAdminData();
        } else {
            alert(data.message || '创建用户失败');
        }
    } catch (error) {
        console.error('创建用户错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 删除娃娃（管理员功能）
async function deleteDoll(dollId) {
    if (!confirm('确定要删除这个娃娃吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/delete-doll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ dollId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('娃娃已删除');
            loadAdminData();
        } else {
            alert(data.message || '删除失败');
        }
    } catch (error) {
        console.error('删除娃娃错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 导出交易记录（管理员功能）
function exportTransactions() {
    alert('导出功能正在开发中...');
}

// 批量发放积分（管理员功能）
async function addUserPoints() {
    const points = prompt('请输入要发放的积分数量:');
    if (!points || isNaN(points)) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/add-points-to-all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ points: parseFloat(points) })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`已为所有用户发放 ${points} 积分`);
            loadAdminData();
        } else {
            alert(data.message || '发放积分失败');
        }
    } catch (error) {
        console.error('批量发放积分错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 更新娃娃价格（管理员功能）
async function updateDollPrices() {
    const level1Price = document.getElementById('level1-price');
    const level2Price = document.getElementById('level2-price');
    const level3Price = document.getElementById('level3-price');
    
    if (!level1Price || !level2Price || !level3Price) return;
    
    const level1 = level1Price.value;
    const level2 = level2Price.value;
    const level3 = level3Price.value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/update-doll-prices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                level1: parseFloat(level1),
                level2: parseFloat(level2),
                level3: parseFloat(level3)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('娃娃价格已更新');
            loadAdminData();
        } else {
            alert(data.message || '更新失败');
        }
    } catch (error) {
        console.error('更新娃娃价格错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 计算今日收益（管理员功能）
async function calculateDailyIncome() {
    try {
        const response = await fetch(`${API_BASE}/admin/calculate-daily-income`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`已计算今日收益，共发放 ${data.totalPayout} 积分`);
            loadAdminData();
        } else {
            alert(data.message || '计算收益失败');
        }
    } catch (error) {
        console.error('计算收益错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 重置系统（管理员功能）
async function resetSystem() {
    if (!confirm('确定要重置系统吗？此操作将删除所有用户数据和娃娃数据，不可恢复！')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/reset-system`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('系统已重置');
            loadAdminData();
        } else {
            alert(data.message || '重置失败');
        }
    } catch (error) {
        console.error('重置系统错误:', error);
        alert('网络错误，请稍后重试');
    }
}