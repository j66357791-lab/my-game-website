// Token验证
async validateToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await fetch(`${AppState.API_BASE}/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            AppState.updateState({ currentUser: data.user });
            
            // 🔧 修复：调用正确的方法
            UserDataManager.updateUserStats();
            UserDataManager.updateMyDollsList();
            
            return true;
        } else {
            localStorage.removeItem('token');
            return false;
        }
    } catch (error) {
        console.error('Token验证失败:', error);
        localStorage.removeItem('token');
        return false;
    }
},

// 处理登录
async handleLogin(event) {
    event.preventDefault();
    
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
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            AppState.updateState({ currentUser: data.user });
            
            // 🔧 修复：调用正确的方法
            UserDataManager.updateUserStats();
            UserDataManager.updateMyDollsList();
            
            this.showPanel('dashboard');
        } else {
            alert(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('登录失败，请稍后重试');
    }
},
