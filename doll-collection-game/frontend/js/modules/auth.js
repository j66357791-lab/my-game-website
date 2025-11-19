// 认证管理模块
const AuthManager = {
    // 🔧 修改：使用 AppState 的 API_BASE
    get API_BASE() {
        return AppState.API_BASE;
    },

    // 初始化
    init() {
        this.setupEventListeners();
        // 🔧 修复：延迟验证，确保所有模块加载完成
        setTimeout(() => {
            this.validateToken();
        }, 100);
    },

    // 设置事件监听器
    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    },

    // 🔧 修复：改进 Token验证逻辑
    async validateToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('没有找到token，显示登录界面');
            this.showLoginIfNotAuthenticated();
            return false;
        }

        try {
            console.log('开始验证token...');
            console.log('Token:', token.substring(0, 20) + '...');
            console.log('API地址:', this.API_BASE);

            const response = await fetch(`${this.API_BASE}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            console.log('Token验证响应状态:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Token验证成功:', data);
                
                // 🔧 关键修复：更新 AppState
                AppState.updateState({ currentUser: data.user });
                
                // 🔧 修复：更新UI
                if (window.UIManager) {
                    UIManager.updateUI();
                }
                
                // 🔧 修复：加载用户数据
                if (window.UserDataManager) {
                    UserDataManager.loadUserDolls().then(() => {
                        UserDataManager.updateUserStats();
                        UserDataManager.updateMyDollsList();
                    });
                }
                
                // 🔧 修复：关闭登录模态框
                this.closeLoginModal();
                
                // 🔧 修复：确保显示正确的面板
                this.showPanel('user-panel');
                
                // 🔧 新增：如果是管理员，加载管理员数据
                if (data.user && data.user.role === 'admin' && window.AdminManager) {
                    console.log('检测到管理员身份，加载管理员数据');
                    setTimeout(() => {
                        AdminManager.loadAdminData();
                    }, 500);
                }
                
                return true;
            } else {
                console.log('Token验证失败，状态码:', response.status);
                const errorData = await response.json().catch(() => ({}));
                console.log('错误信息:', errorData);
                
                localStorage.removeItem('token');
                this.showLoginIfNotAuthenticated();
                return false;
            }
        } catch (error) {
            console.error('Token验证失败:', error);
            
            // 🔧 修复：处理网络错误
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                console.warn('网络连接问题，可能是CORS错误');
            } else {
                this.showMessage('验证失败，请重新登录', 'error');
            }
            
            localStorage.removeItem('token');
            this.showLoginIfNotAuthenticated();
            return false;
        }
    },

    // 🔧 新增：关闭登录模态框
    closeLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.style.display = 'none';
        }
    },

    // 🔧 新增：显示登录界面
    showLoginIfNotAuthenticated() {
        console.log('显示登录界面');
        
        // 隐藏所有面板
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 显示用户面板（但会显示登录模态框）
        const userPanel = document.getElementById('user-panel');
        if (userPanel) {
            userPanel.classList.add('active');
        }
        
        // 显示登录模态框
        setTimeout(() => {
            if (window.UIManager && UIManager.showLoginModal) {
                UIManager.showLoginModal();
            } else {
                // 备用方案：直接显示模态框
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.style.display = 'flex';
                }
            }
        }, 100);
    },

    // 🔧 修复：改进登录处理
    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('尝试登录:', username);
        
        if (!username || !password) {
            this.showMessage('请输入用户名和密码', 'error');
            return;
        }
        
        // 🔧 新增：显示加载状态
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '登录中...';
        submitBtn.disabled = true;
        
        try {
            console.log('开始登录请求...');
            console.log('登录API地址:', `${this.API_BASE}/auth/login`);

            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            console.log('登录响应状态:', response.status);
            console.log('登录响应数据:', data);
            
            if (response.ok) {
                // 🔧 修复：保存token和用户信息
                localStorage.setItem('token', data.token);
                AppState.updateState({ currentUser: data.user });
                
                console.log('登录成功，用户信息:', data.user);
                
                // 🔧 修复：更新UI
                if (window.UIManager) {
                    UIManager.updateUI();
                }
                
                // 🔧 修复：加载用户数据
                if (window.UserDataManager) {
                    UserDataManager.loadUserDolls().then(() => {
                        UserDataManager.updateUserStats();
                        UserDataManager.updateMyDollsList();
                    });
                }
                
                // 🔧 修复：关闭登录模态框
                this.closeLoginModal();
                
                // 清空表单
                event.target.reset();
                
                // 显示成功消息
                this.showMessage('登录成功！', 'success');
                
                // 🔧 修复：显示用户面板
                setTimeout(() => {
                    this.showPanel('user-panel');
                    
                    // 🔧 新增：如果是管理员，加载管理员数据
                    if (data.user && data.user.role === 'admin' && window.AdminManager) {
                        console.log('管理员登录，加载管理员数据');
                        AdminManager.loadAdminData();
                    }
                }, 500);
                
            } else {
                this.showMessage(data.message || '登录失败', 'error');
            }
        } catch (error) {
            console.error('登录错误:', error);
            
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.showMessage('无法连接到服务器，请检查网络或联系管理员', 'error');
            } else {
                this.showMessage('登录失败，请稍后重试', 'error');
            }
        } finally {
            // 🔧 修复：恢复按钮状态
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    },

    // 处理注册
    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        
        if (password !== confirmPassword) {
            this.showMessage('两次输入的密码不一致！', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage('注册成功！请登录', 'success');
                
                // 清空注册表单
                document.getElementById('register-form').reset();
                
                // 切换到登录面板
                setTimeout(() => {
                    this.closeModal('register-modal');
                    this.showLoginModal();
                }, 1500);
                
            } else {
                this.showMessage(data.message || '注册失败', 'error');
            }
        } catch (error) {
            console.error('注册错误:', error);
            
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.showMessage('无法连接到服务器，请检查网络或联系管理员', 'error');
            } else {
                this.showMessage('注册失败，请稍后重试', 'error');
            }
        }
    },

    // 处理登出
    handleLogout() {
        localStorage.removeItem('token');
        AppState.updateState({ currentUser: null });
        
        // 🔧 修复：更新UI
        if (window.UIManager) {
            UIManager.updateUI();
        }
        
        // 🔧 修复：显示登录界面
        this.showLoginIfNotAuthenticated();
        
        this.showMessage('已成功登出', 'success');
    },

    // 🔧 修复：改进面板显示逻辑
    showPanel(panelId) {
        console.log('显示面板:', panelId);
        
        // 检查用户是否已登录（除了登录和注册面板）
        if (panelId !== 'user-panel' && panelId !== 'login' && panelId !== 'register') {
            const { currentUser } = AppState;
            if (!currentUser) {
                console.log('用户未登录，显示登录界面');
                this.showLoginIfNotAuthenticated();
                return;
            }
        }
        
        // 隐藏所有面板
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 显示目标面板
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            console.log('面板显示成功:', panelId);
        } else {
            console.error('面板不存在:', panelId);
        }
        
        // 更新导航链接状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-panel="${panelId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    },

    // 🔧 新增：显示登录模态框
    showLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.style.display = 'flex';
        }
    },

    // 🔧 新增：关闭模态框
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // 显示消息
    showMessage(message, type = 'info') {
        // 移除现有消息
        const existingMessages = document.querySelectorAll('.message-toast');
        existingMessages.forEach(msg => msg.remove());
        
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-toast ${type}`;
        messageDiv.textContent = message;
        
        // 添加到页面
        document.body.appendChild(messageDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }
};

// 导出到全局作用域
window.AuthManager = AuthManager;
