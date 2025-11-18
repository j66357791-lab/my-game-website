// 认证相关功能 - 修复版本
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
    
    // 验证token - 修复版本
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
            
            // 检查是否是网络错误
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.error('🔐 网络连接错误，可能是服务器未启动');
                alert('无法连接到服务器，请检查:\n1. 服务器是否正在运行 (node server.js)\n2. 端口3000是否被占用\n3. 是否通过HTTP访问页面');
            } else {
                console.error('🔐 其他错误:', error);
                alert('登录验证失败，请刷新页面重试');
            }
            
            Auth.showLoginModal();
        }
    },
    
    // 处理登录 - 修复版本
    async handleLogin(e) {
        e.preventDefault();
        console.log('🔐 开始登录处理...');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('🔐 登录表单数据:', { username, password: password ? '***' : '空' });
        
        // 验证API地址
        if (!CONFIG.API_BASE || CONFIG.API_BASE.startsWith('file:///')) {
            alert('服务器配置错误，请刷新页面重试');
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
            
            // 详细的错误处理
            if (error.message.includes('Failed to fetch')) {
                Utils.showNotification('无法连接到服务器，请检查:\n1. 服务器是否正在运行\n2. 端口3000是否被占用\n3. 是否通过HTTP访问页面', 'error');
            } else if (error.message.includes('JSON')) {
                Utils.showNotification('服务器连接错误，请检查后端服务是否运行', 'error');
            } else {
                Utils.showNotification('网络错误，请稍后重试', 'error');
            }
        }
    },
    
    // 其他方法保持不变...
};
