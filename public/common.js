/**
 * 通用页面脚本 - 所有页面共享的功能
 */

// 数据源切换功能
function toggleDataSource() {
    if (window.dataAdapter) {
        const currentMode = window.dataAdapter.useLocalStorage;
        const newMode = !currentMode;
        
        // 切换数据源
        window.dataAdapter.setUseLocalStorage(newMode);
        
        // 更新按钮文本
        const dataSourceText = document.getElementById('dataSourceText');
        if (dataSourceText) {
            dataSourceText.textContent = newMode ? '本地模式' : '在线模式';
        }
        
        // 显示提示
        const message = newMode ? '已切换到本地模式' : '已切换到在线模式';
        showNotification(message, 'info');
        
        // 如果切换到在线模式，需要重新加载数据
        if (!newMode) {
            setTimeout(() => {
                location.reload();
            }, 1000);
        }
    }
}

// 显示通知的函数
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ️'}</div>
        <div class="notification-content">
            <div class="notification-title">系统提示</div>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        backdrop-filter: blur(10px);
    `;
    
    const colors = {
        success: 'linear-gradient(135deg, #28a745, #20c997)',
        error: 'linear-gradient(135deg, #dc3545, #c82333)',
        info: 'linear-gradient(135deg, #17a2b8, #138496)',
        warning: 'linear-gradient(135deg, #ffc107, #e0a800)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成');
    
    // 初始化数据适配器
    if (window.dataAdapter) {
        console.log('数据适配器已加载');
    }
    
    // 初始化用户系统
    if (window.userSystem) {
        window.userSystem.init();
    }
    
    // 初始化积分系统
    if (window.pointsSystem) {
        window.pointsSystem.init();
    }
    
    // 检查登录状态
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUser = localStorage.getItem('currentUser');
    
    if (!isLoggedIn || !currentUser) {
        console.log('用户未登录，跳转到登录页面');
        window.location.href = 'login.html';
        return;
    }
    
    // 更新用户信息显示
    if (window.userSystem) {
        window.userSystem.updateUserInfo();
    }
    
    // 更新积分显示
    if (window.pointsSystem) {
        const currentPoints = window.pointsSystem.getPoints();
        window.updatePointsDisplay(currentPoints);
    }
});

// 监听积分更新事件
window.addEventListener('pointsUpdated', (e) => {
    const { newPoints } = e.detail;
    window.updatePointsDisplay(newPoints);
});

// 监听用户信息更新事件
window.addEventListener('userInfoUpdated', (e) => {
    const { user } = e.detail;
    if (window.userSystem) {
        window.userSystem.updateUserInfo();
    }
});

// 监听数据源切换事件
window.addEventListener('dataSourceChanged', (e) => {
    console.log('数据源已切换:', e.detail);
});

// 全局函数
function updatePointsDisplay(points) {
    const userPoints = document.getElementById('userPoints');
    if (userPoints) {
        userPoints.textContent = points;
    }
    
    // 更新所有积分显示元素
    const allPointsElements = document.querySelectorAll('.user-points-display');
    allPointsElements.forEach(element => {
        element.textContent = points;
    });
}

// 导出全局函数
window.toggleDataSource = toggleDataSource;
window.showNotification = showNotification;
window.updatePointsDisplay = updatePointsDisplay;
