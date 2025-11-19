// 主入口文件
console.log('🌐 API基础地址:', CONFIG.API_BASE);
console.log('🚀 当前环境:', window.location.hostname);

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化娃娃收藏游戏...');
    
    // 确保所有模块都已加载
    if (typeof Auth === 'undefined') {
        console.error('Auth模块未加载');
        return;
    }
    if (typeof Dolls === 'undefined') {
        console.error('Dolls模块未加载');
        return;
    }
    if (typeof Synthesis === 'undefined') {
        console.error('Synthesis模块未加载');
        return;
    }
    if (typeof Transfer === 'undefined') {
        console.error('Transfer模块未加载');
        return;
    }
    if (typeof Admin === 'undefined') {
        console.error('Admin模块未加载');
        return;
    }
    if (typeof AutoIncome === 'undefined') {
        console.error('AutoIncome模块未加载');
        return;
    }
    
    console.log('✅ 所有模块加载完成');
    
    // 初始化事件监听器
    initEventListeners();
    
    // 检查登录状态
    Auth.checkLoginStatus();
    
    // 启动自动收益系统
    AutoIncome.startAutoIncomeSystem();
    
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
    
    // 初始化各模块事件监听器
    try {
        Auth.initEventListeners();
        Dolls.initEventListeners();
        Synthesis.initEventListeners();
        Transfer.initEventListeners();
        Admin.initEventListeners();
        console.log('✅ 所有模块事件监听器初始化完成');
    } catch (error) {
        console.error('❌ 初始化事件监听器时出错:', error);
    }
}

// 显示面板
function showPanel(panelId) {
    console.log('显示面板:', panelId);
    
    if (!currentUser) {
        console.log('用户未登录，显示登录模态框');
        Auth.showLoginModal();
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
        console.log('✅ 面板显示成功:', panelId);
    } else {
        console.error('❌ 找不到面板:', panelId);
        return;
    }
    
    // 更新导航链接状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-panel="${panelId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // 加载特定面板的数据 - 增加错误处理
    try {
        if (panelId === 'synthesis-panel') {
            if (typeof Synthesis !== 'undefined') {
                console.log('加载合成面板数据...');
                Synthesis.updateAvailableDolls();
                Synthesis.loadSynthesisRecords();
            } else {
                console.error('❌ Synthesis模块未定义');
            }
        } else if (panelId === 'transfer-panel') {
            if (typeof Transfer !== 'undefined') {
                console.log('加载转增面板数据...');
                Transfer.loadTransferRecords();
            } else {
                console.error('❌ Transfer模块未定义');
            }
        } else if (panelId === 'admin-panel' && currentUser.role === 'admin') {
            if (typeof Admin !== 'undefined') {
                console.log('加载管理员面板数据...');
                Admin.loadAdminData();
            } else {
                console.error('❌ Admin模块未定义');
            }
        }
    } catch (error) {
        console.error('❌ 加载面板数据时出错:', error);
    }
}

// 检查服务器状态
async function checkServerStatus() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/health`);
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

// UI更新相关
const UI = {
    // 更新UI
    updateUI() {
        console.log('更新UI...');
        
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
            
            // 显示用户角色
            const userRole = document.querySelector('.user-role');
            if (userRole) {
                userRole.innerHTML = `
                    <span class="user-role">
                        <span class="role-badge ${currentUser.role}">
                            ${currentUser.role === 'merchant' ? '<i class="fas fa-crown"></i> 商人' : currentUser.role === 'admin' ? '<i class="fas fa-user-shield"></i> 管理员' : '<i class="fas fa-user"></i> 用户'}
                        </span>
                    </span>
                `;
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
        
        console.log('✅ UI更新完成');
    }
};
