// 娃娃收藏游戏 - 前端JavaScript 主入口文件

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化娃娃收藏游戏...');
    
    // 初始化事件监听器
    EventManager.initEventListeners();
    
    // 检查登录状态
    AuthManager.checkLoginStatus();
    
    // 设置收益倒计时
    UIManager.updateCountdown();
    setInterval(UIManager.updateCountdown, 60000);
    
    // 检查服务器连接状态
    SystemManager.checkServerStatus();
    
    console.log('娃娃收藏游戏初始化完成');
});
