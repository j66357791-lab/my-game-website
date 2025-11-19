// 认证管理模块
const AuthManager = {
    // API基础URL
    API_BASE: 'https://my-game-website-5uz0.onrender.com/api',

    // 初始化
    init() {
        this.setupEventListeners();
        this.validateToken();
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

    // 🔧 修复：添加错误处理的 Token验证
    async validateToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showLoginIfNotAuthenticated();
            return false;
        }

        try {
            const response = await fetch(`${this.API_BASE}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // 包含 cookies
            });

            if (response.ok) {
                const data = await response.json();
                AppState.updateState({ currentUser: data.user });
                
                // 修复：调用正确的方法
                if (window.UserDataManager) {
                    UserDataManager.updateUserStats();
                    UserDataManager.updateMyDollsList();
                }
                
                return true;
            } else {
                localStorage.removeItem('token');
                this.showLoginIfNotAuthenticated();
                return false;
            }
        } catch (error) {
            console.error('Token验证失败:', error);
            
            // 🔧 新增：处理 CORS 和网络错误
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.showMessage('无法连接到服务器，请检查网络或联系管理员', 'error');
            } else {
                this.showMessage('验证失败，请重新登录', 'error');
            }
            
            localStorage.removeItem('token');
            this.showLoginIfNotAuthenticated();
            return false;
        }
    },

    // 🔧 新增：显示登录界面
    showLoginIfNotAuthenticated() {
        // 隐藏所有面板
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 显示登录模态框
        if (window.UIManager && UIManager.showLoginModal) {
            UIManager.showLoginModal();
        }
    },

    // 🔧 修复：添加错误处理的登录
    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showMessage('请输入用户名和密码', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.token);
                AppState.updateState({ currentUser: data.user });
                
                // 修复：调用正确的方法
                if (window.UserDataManager) {
                    UserDataManager.updateUserStats();
                    UserDataManager.updateMyDollsList();
                }
                
                // 关闭登录模态框
                if (window.UIManager && UIManager.closeModal) {
                    UIManager.closeModal('login-modal');
                }
                
                // 显示成功消息
                this.showMessage('登录成功！', 'success');
                
                // 显示仪表板
                this.showPanel('dashboard');
                
            } else {
                this.showMessage(data.message || '登录失败', 'error');
            }
        } catch (error) {
            console.error('登录错误:', error);
            
            // 🔧 新增：处理 CORS 和网络错误
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.showMessage('无法连接到服务器，请检查网络或联系管理员', 'error');
            } else {
                this.showMessage('登录失败，请稍后重试', 'error');
            }
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
                    if (window.UIManager && UIManager.closeModal) {
                        UIManager.closeModal('register-modal');
                    }
                    if (window.UIManager && UIManager.showLoginModal) {
                        UIManager.showLoginModal();
                    }
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
        this.showPanel('login');
        this.showMessage('已成功登出', 'success');
    },

    // 显示面板
    showPanel(panelId) {
        // 隐藏所有面板
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 显示目标面板
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
    },

    // 显示消息
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        
        // 设置背景颜色
        switch(type) {
            case 'success':
                messageDiv.style.backgroundColor = '#28a745';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#dc3545';
                break;
            case 'warning':
                messageDiv.style.backgroundColor = '#ffc107';
                messageDiv.style.color = '#212529';
                break;
            default:
                messageDiv.style.backgroundColor = '#17a2b8';
        }
        
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

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
