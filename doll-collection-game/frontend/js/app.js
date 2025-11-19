// 娃娃收藏游戏 - 前端JavaScript 主入口文件

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化娃娃收藏游戏...');
    
    // 🔧 修复：按正确顺序初始化模块
    const initModules = async () => {
        // 1. 初始化事件管理器
        if (window.EventManager) {
            EventManager.initEventListeners();
            console.log('EventManager 初始化完成');
        }
        
        // 2. 初始化认证管理器
        if (window.AuthManager) {
            AuthManager.init();
            console.log('AuthManager 初始化完成');
        }
        
        // 3. 初始化用户数据管理器
        if (window.UserDataManager) {
            UserDataManager.init();
            console.log('UserDataManager 初始化完成');
        }
        
        // 4. 初始化UI管理器
        if (window.UIManager) {
            UIManager.updateCountdown();
            setInterval(() => UIManager.updateCountdown(), 60000);
            console.log('UIManager 初始化完成');
        }
        
        // 5. 检查系统管理器
        if (window.SystemManager) {
            SystemManager.checkServerStatus();
            console.log('SystemManager 初始化完成');
        }
        
        console.log('娃娃收藏游戏初始化完成');
    };
    
    // 🔧 修复：延迟初始化，确保所有脚本加载完成
    setTimeout(initModules, 100);
    
    // 🔧 新增：全局错误处理
    window.addEventListener('error', function(e) {
        console.error('全局错误:', e.error);
    });
    
    // 🔧 新增：未处理的Promise拒绝
    window.addEventListener('unhandledrejection', function(e) {
        console.error('未处理的Promise拒绝:', e.reason);
    });
});
