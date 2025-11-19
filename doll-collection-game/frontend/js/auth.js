// 认证相关功能 - 云端部署版本
const Auth = {
    // 检查登录状态
    checkLoginStatus() {
        console.log('🔐 检查登录状态...');
        const token = localStorage.getItem('token');
        if (token) {
            Auth.validateToken(token);
        } else {
            Auth.showLoginModal();
        }
    },
    
    // 验证token
    async validateToken(token) {
        try {
            console.log('🔐 验证token:', token.substring(0, 20) + '...');
            
            const response = await fetch(`${CONFIG.API_BASE}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('🔐 Token验证响应状态:', response.status);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('🔐 Token验证成功，用户数据:', userData.user.username);
                currentUser = userData.user;
                UI.updateUI();
                Dolls.loadUserData();
                Transfer.loadTransferSettings();
            } else {
                console.log('🔐 Token验证失败，清除token');
                localStorage.removeItem('token');
                Auth.showLoginModal();
            }
        } catch (error) {
            console.error('🔐 Token验证错误:', error);
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.error('🔐 网络连接错误，可能是服务器未启动');
                Utils.showNotification('无法连接到服务器，请检查网络连接', 'error');
            } else {
                console.error('🔐 其他错误:', error);
                Utils.showNotification('登录验证失败，请刷新页面重试', 'error');
            }
            
            Auth.showLoginModal();
        }
    },
    
    // 显示登录模态框
    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    // 显示注册模态框
    showRegisterModal() {
        Auth.closeModal('login-modal');
        const modal = document.getElementById('register-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    // 关闭模态框
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // 处理登录
    async handleLogin(e) {
        e.preventDefault();
        console.log('🔐 开始登录处理...');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('🔐 登录表单数据:', { username, password: password ? '***' : '空' });
        
        if (!CONFIG.API_BASE) {
            Utils.showNotification('服务器配置错误，请刷新页面重试', 'error');
            return;
        }
        
        try {
            console.log('🔐 发送登录请求到:', CONFIG.API_BASE + '/auth/login');
            
            const response = await fetch(`${CONFIG.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            console.log('🔐 登录响应状态:', response.status);
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('🔐 服务器返回非JSON响应:', text.substring(0, 200));
                throw new Error('服务器返回了错误的响应格式');
            }
            
            const data = await response.json();
            console.log('🔐 登录响应数据:', data);
            
            if (response.ok) {
                localStorage.setItem('token', data.token);
                currentUser = data.user;
                UI.updateUI();
                Auth.closeModal('login-modal');
                Dolls.loadUserData();
                Utils.showNotification('登录成功！', 'success');
            } else {
                console.error('🔐 登录失败:', data.message);
                Utils.showNotification(data.message || '登录失败', 'error');
            }
        } catch (error) {
            console.error('🔐 登录错误:', error);
            
            if (error.message.includes('Failed to fetch')) {
                Utils.showNotification('无法连接到服务器，请检查网络连接', 'error');
            } else if (error.message.includes('JSON')) {
                Utils.showNotification('服务器连接错误，请检查后端服务是否运行', 'error');
            } else {
                Utils.showNotification('网络错误，请稍后重试', 'error');
            }
        }
    },
    
    // 处理注册
    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const email = document.getElementById('reg-email').value;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification('注册成功！请登录。', 'success');
                Auth.showLoginModal();
            } else {
                Utils.showNotification(data.message || '注册失败', 'error');
            }
        } catch (error) {
            console.error('注册错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 处理退出
    handleLogout() {
        // 停止自动收益系统
        if (autoIncomeTimer) {
            clearInterval(autoIncomeTimer);
            autoIncomeTimer = null;
        }
        
        localStorage.removeItem('token');
        currentUser = null;
        userDolls = [];
        UI.updateUI();
        Auth.showLoginModal();
    },
    
    // 初始化认证事件监听器
    initEventListeners() {
        // 表单提交
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', Auth.handleLogin);
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', Auth.handleRegister);
        }
        
        // 退出按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', Auth.handleLogout);
        }
    }
};
