// 事件管理模块
const EventManager = {
    // 初始化所有事件监听器
    initEventListeners() {
        console.log('初始化事件监听器...');
        
        // 导航链接
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const panelId = link.getAttribute('data-panel');
                console.log('切换面板:', panelId);
                UIManager.showPanel(panelId);
            });
        });
        
        // 表单提交
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', AuthManager.handleLogin.bind(AuthManager));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', AuthManager.handleRegister.bind(AuthManager));
        }
        
        // 退出按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', AuthManager.handleLogout.bind(AuthManager));
        }
        
        // 合成积分输入
        const synthesisPoints = document.getElementById('synthesis-points');
        if (synthesisPoints) {
            synthesisPoints.addEventListener('input', SynthesisManager.updateSuccessRate.bind(SynthesisManager));
        }
        
        console.log('事件监听器初始化完成');
    }
};

// 导出到全局作用域
window.EventManager = EventManager;
