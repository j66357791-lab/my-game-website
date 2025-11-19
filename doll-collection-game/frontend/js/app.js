// 娃娃收藏游戏 - 前端JavaScript 主入口文件

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化娃娃收藏游戏...');
    
    // 🔧 修复：检查模块是否存在再初始化
    if (window.EventManager) {
        EventManager.initEventListeners();
        console.log('EventManager 初始化完成');
    } else {
        console.error('EventManager 未找到');
    }
    
    // 🔧 修复：使用正确的方法名，并添加错误处理
    if (window.AuthManager) {
        AuthManager.validateToken().catch(error => {
            console.error('Token验证初始化失败:', error);
        });
        console.log('AuthManager 初始化完成');
    } else {
        console.error('AuthManager 未找到');
    }
    
    // 🔧 新增：初始化 UserDataManager
    if (window.UserDataManager) {
        UserDataManager.init();
        console.log('UserDataManager 初始化完成');
    } else {
        console.error('UserDataManager 未找到');
    }
    
    // 🔧 新增：初始化 UIManager
    if (window.UIManager) {
        UIManager.updateCountdown();
        setInterval(() => UIManager.updateCountdown(), 60000);
        console.log('UIManager 初始化完成');
    } else {
        console.error('UIManager 未找到');
    }
    
    // 🔧 修复：检查 SystemManager 是否存在
    if (window.SystemManager) {
        SystemManager.checkServerStatus();
        console.log('SystemManager 初始化完成');
    } else {
        console.warn('SystemManager 未找到，跳过服务器状态检查');
    }
    
    console.log('娃娃收藏游戏初始化完成');
    
    // 🔧 新增：全局错误处理
    window.addEventListener('error', function(e) {
        console.error('全局错误:', e.error);
    });
    
    // 🔧 新增：未处理的Promise拒绝
    window.addEventListener('unhandledrejection', function(e) {
        console.error('未处理的Promise拒绝:', e.reason);
    });
});
