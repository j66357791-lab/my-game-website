// 事件管理模块
const EventManager = {
    // 初始化事件监听器
    initEventListeners() {
        // 导航链接点击事件
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const panelId = link.getAttribute('data-panel');
                
                console.log('导航点击:', panelId);
                
                // 🔧 修复：使用 AuthManager 的面板显示逻辑
                if (window.AuthManager) {
                    AuthManager.showPanel(panelId);
                }
            });
        });

        // 管理员面板切换
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 移除所有活动状态
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-content').forEach(c => c.classList.remove('active'));
                
                // 添加活动状态
                tab.classList.add('active');
                const contentId = tab.getAttribute('data-content');
                const content = document.getElementById(contentId);
                if (content) {
                    content.classList.add('active');
                }
            });
        });

        // 其他全局事件
        this.setupGlobalEvents();
    },

    // 设置全局事件
    setupGlobalEvents() {
        // 页面加载完成事件
        window.addEventListener('load', () => {
            console.log('页面加载完成');
        });

        // 网络状态监听
        window.addEventListener('online', () => {
            if (window.AuthManager) {
                AuthManager.showMessage('网络已连接', 'success');
            }
        });

        window.addEventListener('offline', () => {
            if (window.AuthManager) {
                AuthManager.showMessage('网络已断开', 'warning');
            }
        });

        // 防止表单重复提交
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                const submitBtn = form.querySelector('[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    setTimeout(() => {
                        submitBtn.disabled = false;
                    }, 2000);
                }
            });
        });
    }
};

// 导出到全局作用域
window.EventManager = EventManager;
