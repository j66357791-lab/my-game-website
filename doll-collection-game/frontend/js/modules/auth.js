// 认证管理模块
const AuthManager = {
    // 检查登录状态
    checkLoginStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            this.validateToken(token);
        } else {
            UIManager.showLoginModal();
        }
    },

    // 验证token
    async validateToken(token) {
        try {
            const response = await fetch(`${AppState.API_BASE}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                AppState.updateState({ currentUser: userData.user });
                UIManager.updateUI();
                UserDataManager.loadUserData();
            } else {
                localStorage.removeItem('token');
                UIManager.showLoginModal();
            }
        } catch (error) {
            console.error('Token验证失败:', error);
            UIManager.showLoginModal();
        }
    },

    // 处理登录
    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${AppState.API_BASE}/auth/login`, {
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
                AppState.updateState({ currentUser: data.user });
                UIManager.updateUI();
                UIManager.closeModal('login-modal');
                UserDataManager.loadUserData();
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
    },

    // 处理注册
    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const email = document.getElementById('reg-email').value;
        
        try {
            const response = await fetch(`${AppState.API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('注册成功！请登录。');
                UIManager.showLoginModal();
            } else {
                alert(data.message || '注册失败');
            }
        } catch (error) {
            console.error('注册错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 处理退出
    handleLogout() {
        localStorage.removeItem('token');
        AppState.updateState({ 
            currentUser: null, 
            userDolls: [] 
        });
        UIManager.updateUI();
        UIManager.showLoginModal();
    }
};

// 导出到全局作用域
window.AuthManager = AuthManager;
