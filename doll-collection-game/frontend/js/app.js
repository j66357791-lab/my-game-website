// 全局变量
let currentUser = null;
let userDolls = [];
let allUsers = []; // 仅管理员可见
let selectedDollsForSynthesis = [null, null];
const API_BASE = 'https://tianchuang.onrender.com/api';

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    // 检查用户是否已登录
    checkLoginStatus();
    
    // 设置收益倒计时
    updateCountdown();
    setInterval(updateCountdown, 60000); // 每分钟更新一次
    
    // 绑定表单提交事件
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // 绑定导航链接事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const panelId = this.getAttribute('data-panel');
            showPanel(panelId);
        });
    });
    
    // 绑定退出按钮事件
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // 检查服务器连接状态
    checkServerStatus();
});

// 检查服务器状态
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            document.getElementById('server-status').textContent = '在线';
            document.getElementById('server-status').style.color = 'green';
        } else {
            document.getElementById('server-status').textContent = '离线';
            document.getElementById('server-status').style.color = 'red';
        }
    } catch (error) {
        document.getElementById('server-status').textContent = '连接失败';
        document.getElementById('server-status').style.color = 'red';
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
    document.getElementById('login-modal').style.display = 'flex';
}

// 显示注册模态框
function showRegisterModal() {
    closeModal('login-modal');
    document.getElementById('register-modal').style.display = 'flex';
}

// 关闭模态框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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
            currentUser = data.user;
            updateUI();
            closeModal('login-modal');
            loadUserData();
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
    currentUser = null;
    userDolls = [];
    updateUI();
    showLoginModal();
}

// 更新UI
function updateUI() {
    if (currentUser) {
        document.getElementById('user-points').textContent = currentUser.points.toFixed(2) + ' 积分';
        document.getElementById('user-avatar').innerHTML = `<i class="fas fa-user"></i> ${currentUser.username.charAt(0).toUpperCase()}`;
        
        if (currentUser.role === 'admin') {
            document.getElementById('admin-link').style.display = 'block';
        }
    } else {
        document.getElementById('user-points').textContent = '0.00 积分';
        document.getElementById('user-avatar').innerHTML = '<i class="fas fa-user"></i>';
        document.getElementById('admin-link').style.display = 'none';
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
            updateUserStats();
            updateMyDollsList();
        }
    } catch (error) {
        console.error('加载用户数据错误:', error);
    }
}

// 更新用户统计信息
function updateUserStats() {
    // 计算统计数据
    const totalDolls = userDolls.length;
    const activeDolls = userDolls.filter(doll => doll.active).length;
    const dailyIncome = userDolls.reduce((sum, doll) => sum + (doll.active ? doll.dailyIncome : 0), 0);
    const avgLifespan = totalDolls > 0 ? 
        userDolls.reduce((sum, doll) => sum + doll.lifespan, 0) / totalDolls : 0;
    
    // 更新UI
    document.getElementById('total-dolls').textContent = totalDolls;
    document.getElementById('active-dolls').textContent = activeDolls;
    document.getElementById('daily-income').textContent = dailyIncome.toFixed(2);
    document.getElementById('avg-lifespan').textContent = Math.round(avgLifespan);
    document.getElementById('expected-payout').textContent = dailyIncome.toFixed(2);
    
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
        
    document.getElementById('level1-income').textContent = level1Income.toFixed(2);
    document.getElementById('level2-income').textContent = level2Income.toFixed(2);
    document.getElementById('level3-income').textContent = level3Income.toFixed(2);
}

// 更新我的娃娃列表
function updateMyDollsList() {
    const myDollsContainer = document.getElementById('my-dolls');
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
    
    document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('countdown-minutes').textContent = minutes.toString().padStart(2, '0');
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
            userDolls.push(data.doll);
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
    document.getElementById(panelId).classList.add('active');
    
    // 更新导航链接状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-panel="${panelId}"]`).classList.add('active');
    
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
        document.getElementById(`slot${slot}`).innerHTML = '<i class="fas fa-plus"></i>';
        document.getElementById(`slot${slot}`).classList.remove('selected');
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
    document.getElementById(`slot${slot}`).innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-doll" style="font-size: 30px;"></i>
            <div style="margin-top: 5px;">${selectedDoll.level}级</div>
        </div>
    `;
    document.getElementById(`slot${slot}`).classList.add('selected');
    
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
    document.getElementById(`slot${emptySlot+1}`).innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-doll" style="font-size: 30px;"></i>
            <div style="margin-top: 5px;">${doll.level}级</div>
        </div>
    `;
    document.getElementById(`slot${emptySlot+1}`).classList.add('selected');
    
    updateSynthesisButton();
    updateSuccessRate();
}

// 更新合成按钮状态
function updateSynthesisButton() {
    const synthesisBtn = document.getElementById('synthesis-btn');
    if (selectedDollsForSynthesis[0] && selectedDollsForSynthesis[1]) {
        synthesisBtn.disabled = false;
    } else {
        synthesisBtn.disabled = true;
    }
}

// 更新成功率
function updateSuccessRate() {
    const pointsInput = document.getElementById('synthesis-points');
    const points = parseInt(pointsInput.value) || 0;
    const baseRate = 0; // 基础成功率为0%
    const successRate = baseRate + (points * 0.9); // 每投入1积分提高0.9%成功率
    
    document.getElementById('success-rate').textContent = `当前成功率: ${Math.min(successRate, 100).toFixed(1)}%`;
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
            userDolls = data.dolls;
            updateUI();
            updateUserStats();
            updateMyDollsList();
            updateAvailableDolls();
            
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
    document.getElementById('slot1').innerHTML = '<i class="fas fa-plus"></i>';
    document.getElementById('slot2').innerHTML = '<i class="fas fa-plus"></i>';
    document.getElementById('result-slot').innerHTML = '<i class="fas fa-question"></i>';
    document.getElementById('slot1').classList.remove('selected');
    document.getElementById('slot2').classList.remove('selected');
    document.getElementById('synthesis-points').value = '0';
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
    }
}

// 更新用户表格
function updateUsersTable() {
    const usersTable = document.getElementById('users-table');
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
    dollsTable.innerHTML = '';
    
    dolls.forEach(doll => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doll.id}</td>
            <td>${doll.userId}</td>
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
    transactionsTable.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(transaction.createdAt).toLocaleString()}</td>
            <td>${transaction.userId}</td>
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
    document.getElementById(`admin-${tabName}`).classList.add('active');
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
    const level1Price = document.getElementById('level1-price').value;
    const level2Price = document.getElementById('level2-price').value;
    const level3Price = document.getElementById('level3-price').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/update-doll-prices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                level1: parseFloat(level1Price),
                level2: parseFloat(level2Price),
                level3: parseFloat(level3Price)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('娃娃价格已更新');
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