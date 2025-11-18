// profile.js - 个人资料页面专用JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化个人资料页面...');
    initializeProfilePage();
    loadProfileData();
});

// 初始化个人资料页面
function initializeProfilePage() {
    // 初始化模态框
    initializeModals();
    
    // 初始化事件监听器
    initializeEventListeners();
    
    // 初始化图表
    initializeChart();
}

// 初始化模态框
function initializeModals() {
    // 修改密码表单提交
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword();
        });
    }
    
    // 密码强度检测
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }
}

// 初始化事件监听器
function initializeEventListeners() {
    // 退出按钮事件
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('确定要退出登录吗？')) {
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            }
        });
    }
    
    console.log('个人资料页面事件监听器初始化完成');
}

// 加载个人资料数据
function loadProfileData() {
    // 从localStorage或API获取用户数据
    const userData = JSON.parse(localStorage.getItem('currentUser')) || {
        username: 'user123',
        email: 'user@example.com',
        nickname: '娃娃收藏家',
        registerDate: '2023-05-15',
        lastLogin: new Date().toLocaleString('zh-CN'),
        points: 156.75,
        totalDolls: 12,
        totalIncome: 156.75,
        accountAge: 158,
        synthesisCount: 3,
        dollStats: {
            level1: 8,
            level2: 3,
            level3: 1
        }
    };
    
    updateProfileDisplay(userData);
}

// 更新个人资料显示
function updateProfileDisplay(userData) {
    // 更新基本信息
    document.getElementById('static-username').textContent = userData.username;
    document.getElementById('edit-username').value = userData.username;
    document.getElementById('static-email').textContent = userData.email;
    document.getElementById('edit-email').value = userData.email;
    document.getElementById('static-nickname').textContent = userData.nickname;
    document.getElementById('edit-nickname').value = userData.nickname;
    document.getElementById('static-register-date').textContent = userData.registerDate;
    document.getElementById('static-last-login').textContent = userData.lastLogin;
    
    // 更新账户统计
    document.getElementById('profile-total-dolls').textContent = userData.totalDolls;
    document.getElementById('profile-total-income').textContent = userData.totalIncome.toFixed(2);
    document.getElementById('profile-account-age').textContent = userData.accountAge;
    document.getElementById('profile-synthesis-count').textContent = userData.synthesisCount;
    
    // 更新娃娃收藏统计
    updateDollStatsDisplay(userData.dollStats);
    
    // 更新用户积分显示
    updateUserPoints(userData.points);
}

// 更新娃娃统计显示
function updateDollStatsDisplay(dollStats) {
    const totalDolls = dollStats.level1 + dollStats.level2 + dollStats.level3;
    
    // 更新娃娃数量显示
    const dollCounts = document.querySelectorAll('.doll-stat-count');
    if (dollCounts.length >= 3) {
        dollCounts[0].textContent = dollStats.level1;
        dollCounts[1].textContent = dollStats.level2;
        dollCounts[2].textContent = dollStats.level3;
    }
    
    // 更新进度条
    if (totalDolls > 0) {
        const dollProgresses = document.querySelectorAll('.doll-stat-progress');
        if (dollProgresses.length >= 3) {
            dollProgresses[0].style.width = `${(dollStats.level1 / totalDolls) * 100}%`;
            dollProgresses[1].style.width = `${(dollStats.level2 / totalDolls) * 100}%`;
            dollProgresses[2].style.width = `${(dollStats.level3 / totalDolls) * 100}%`;
        }
    }
    
    // 更新收藏目标
    const goalPercentage = document.getElementById('goal-percentage');
    if (goalPercentage) {
        const targetDolls = 20; // 假设目标是20个娃娃
        const progress = Math.min((totalDolls / targetDolls) * 100, 100);
        goalPercentage.textContent = `${Math.round(progress)}%`;
        
        const goalProgressFill = document.querySelector('.goal-progress-fill');
        if (goalProgressFill) {
            goalProgressFill.style.width = `${progress}%`;
        }
    }
}

// 更新用户积分显示
function updateUserPoints(points) {
    const userPoints = document.getElementById('user-points');
    if (userPoints) {
        userPoints.textContent = `${points.toFixed(2)} 积分`;
    }
}

// 切换编辑模式
function toggleEditMode(section) {
    if (section === 'basic-info') {
        const staticElements = document.querySelectorAll('#basic-info .form-static');
        const inputElements = document.querySelectorAll('#basic-info .form-control');
        const actions = document.getElementById('basic-info-actions');
        
        staticElements.forEach(el => el.style.display = 'none');
        inputElements.forEach(el => el.style.display = 'block');
        if (actions) actions.style.display = 'flex';
    }
}

// 取消编辑模式
function cancelEditMode(section) {
    if (section === 'basic-info') {
        const staticElements = document.querySelectorAll('#basic-info .form-static');
        const inputElements = document.querySelectorAll('#basic-info .form-control');
        const actions = document.getElementById('basic-info-actions');
        
        staticElements.forEach(el => el.style.display = 'block');
        inputElements.forEach(el => el.style.display = 'none');
        if (actions) actions.style.display = 'none';
        
        // 恢复原始值
        loadProfileData();
    }
}

// 保存基本信息
function saveBasicInfo() {
    const username = document.getElementById('edit-username').value;
    const email = document.getElementById('edit-email').value;
    const nickname = document.getElementById('edit-nickname').value;
    
    // 获取当前用户数据
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    
    // 更新用户数据
    currentUser.username = username;
    currentUser.email = email;
    currentUser.nickname = nickname;
    
    // 保存到localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // 更新显示
    document.getElementById('static-username').textContent = username;
    document.getElementById('static-email').textContent = email;
    document.getElementById('static-nickname').textContent = nickname;
    
    // 退出编辑模式
    cancelEditMode('basic-info');
    
    alert('基本信息更新成功！');
}

// 更换头像
function changeAvatar() {
    alert('头像更换功能开发中...');
    // 实际实现中，这里会上传图片文件并更新头像
}

// 显示修改密码模态框
function showChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.style.display = 'flex';
        // 重置表单
        document.getElementById('change-password-form').reset();
        const strengthFill = document.querySelector('.password-strength-fill');
        const strengthText = document.querySelector('.password-strength-text');
        if (strengthFill) strengthFill.style.width = '0%';
        if (strengthText) strengthText.textContent = '密码强度: 无';
    }
}

// 显示登录历史模态框
function showLoginHistory() {
    const modal = document.getElementById('login-history-modal');
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

// 检查密码强度
function checkPasswordStrength() {
    const password = document.getElementById('new-password').value;
    const strengthBar = document.querySelector('.password-strength-fill');
    const strengthText = document.querySelector('.password-strength-text');
    
    if (!strengthBar || !strengthText) return;
    
    let strength = 0;
    let text = '无';
    let color = '#ddd';
    
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
    
    if (strength >= 75) {
        text = '强';
        color = '#28a745';
    } else if (strength >= 50) {
        text = '中';
        color = '#ffc107';
    } else if (strength >= 25) {
        text = '弱';
        color = '#fd7e14';
    } else {
        text = '无';
        color = '#dc3545';
    }
    
    strengthBar.style.width = `${strength}%`;
    strengthBar.style.backgroundColor = color;
    strengthText.textContent = `密码强度: ${text}`;
}

// 修改密码
function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // 简单验证
    if (!currentPassword) {
        alert('请输入当前密码');
        return;
    }
    
    if (!newPassword) {
        alert('请输入新密码');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('新密码和确认密码不一致');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('密码长度至少6位');
        return;
    }
    
    // 在实际应用中，这里会发送请求到服务器验证当前密码并更新密码
    // 这里我们只做前端演示
    
    alert('密码修改成功！');
    closeModal('change-password-modal');
}

// 初始化图表
function initializeChart() {
    const canvas = document.getElementById('income-chart');
    if (!canvas) return;
    
    // 设置canvas尺寸为容器尺寸
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 200;
    
    const ctx = canvas.getContext('2d');
    
    // 简单模拟收益数据
    const data = {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月'],
        datasets: [{
            label: '月收益',
            data: [12.5, 19.2, 15.3, 25.1, 22.4, 30.6, 28.3, 35.2, 32.1, 38.7],
            backgroundColor: 'rgba(106, 90, 205, 0.2)',
            borderColor: 'rgba(106, 90, 205, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
        }]
    };
    
    // 绘制简单折线图
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置样式
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // 计算比例
    const maxValue = Math.max(...data.datasets[0].data);
    const xStep = (canvas.width - 40) / (data.labels.length - 1);
    const yScale = (canvas.height - 40) / maxValue;
    
    // 绘制网格和标签
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // 水平网格线
    for (let i = 0; i <= 5; i++) {
        const y = canvas.height - 30 - (i * (canvas.height - 40) / 5);
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(canvas.width - 10, y);
        ctx.stroke();
        
        // Y轴标签
        ctx.fillStyle = '#666';
        ctx.fillText((maxValue * i / 5).toFixed(0), 20, y + 4);
    }
    
    // X轴标签
    data.labels.forEach((label, i) => {
        ctx.fillStyle = '#666';
        ctx.fillText(label, 30 + i * xStep, canvas.height - 10);
    });
    
    // 绘制数据线
    ctx.beginPath();
    ctx.strokeStyle = data.datasets[0].borderColor;
    ctx.lineWidth = 3;
    
    data.datasets[0].data.forEach((value, i) => {
        const x = 30 + i * xStep;
        const y = canvas.height - 30 - value * yScale;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // 绘制数据点
    ctx.fillStyle = data.datasets[0].borderColor;
    data.datasets[0].data.forEach((value, i) => {
        const x = 30 + i * xStep;
        const y = canvas.height - 30 - value * yScale;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // 填充区域
    ctx.beginPath();
    ctx.moveTo(30, canvas.height - 30);
    data.datasets[0].data.forEach((value, i) => {
        const x = 30 + i * xStep;
        const y = canvas.height - 30 - value * yScale;
        ctx.lineTo(x, y);
    });
    ctx.lineTo(30 + (data.labels.length - 1) * xStep, canvas.height - 30);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(106, 90, 205, 0.3)');
    gradient.addColorStop(1, 'rgba(106, 90, 205, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fill();
}

// 页面卸载时清理
window.addEventListener('beforeunload', function() {
    // 关闭所有打开的模态框
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
});

// 窗口大小改变时重新绘制图表
window.addEventListener('resize', function() {
    initializeChart();
});