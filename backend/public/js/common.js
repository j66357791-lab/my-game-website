/**
 * 通用页面脚本 - 强制云端同步版
 */

// 数据源切换功能 - 已禁用，强制云端
function toggleDataSource() {
    // 显示云端模式提示
    if (window.showNotification) {
        window.showNotification('已强制启用云端模式，无法切换到本地模式', 'info');
    }
    
    // 强制设置云端模式
    if (window.dataAdapter) {
        window.dataAdapter.forceCloudMode();
    }
    
    if (window.apiService) {
        window.apiService.forceCloudMode();
    }
}

// 显示通知的函数 - 增强版
function showNotification(message, type = 'info') {
    // 移除现有通知
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // 创建新通知
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ️'}</div>
        <div class="notification-content">
            <div class="notification-title">云端系统提示</div>
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
    
    // 显示动画
    setTimeout(() => notification.classList.add('show'), 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 页面初始化 - 云端版
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 通用脚本：页面加载完成（云端模式）');
    
    // 强制启用云端模式
    forceCloudMode();
    
    // 初始化数据适配器
    if (window.dataAdapter) {
        console.log('🌐 通用脚本：数据适配器已加载（云端模式）');
        window.dataAdapter.forceCloudMode();
    }
    
    // 初始化API服务
    if (window.apiService) {
        console.log('🌐 通用脚本：API服务已加载（云端模式）');
        window.apiService.forceCloudMode();
    }
    
    // 初始化用户系统
    if (window.userSystem) {
        console.log('🌐 通用脚本：用户系统已加载（云端模式）');
        if (!window.userSystem.isLoggedIn) {
            window.userSystem.init();
        }
    }
    
    // 初始化积分系统
    if (window.pointsSystem) {
        console.log('🌐 通用脚本：积分系统已加载（云端模式）');
        if (!window.pointsSystem.isInitialized) {
            window.pointsSystem.init();
        }
    }
    
    // 检查登录状态
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUser = localStorage.getItem('currentUser');
    
    if (!isLoggedIn || !currentUser) {
        console.log('🌐 通用脚本：用户未登录，跳转到登录页面');
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
    
    // 监听积分更新事件
    window.addEventListener('pointsUpdated', (e) => {
        const { newPoints } = e.detail;
        window.updatePointsDisplay(newPoints);
    });
    
    // 监听积分显示更新事件
    window.addEventListener('pointsDisplayUpdated', (e) => {
        const { points } = e.detail;
        window.updatePointsDisplay(points);
    });
    
    // 监听用户信息更新事件
    window.addEventListener('userInfoUpdated', (e) => {
        const { user } = e.detail;
        if (window.userSystem) {
            window.userSystem.updateUserInfo();
        }
    });
    
    // 监听数据源切换事件（但会强制云端）
    window.addEventListener('dataSourceChanged', (e) => {
        console.log('🌐 通用脚本：数据源事件', e.detail);
        if (e.detail.useLocalStorage) {
            // 强制切换回云端模式
            setTimeout(() => {
                forceCloudMode();
            }, 100);
        }
    });
    
    // 监听用户登录事件
    window.addEventListener('userLoggedIn', (e) => {
        console.log('🌐 通用脚本：用户登录事件', e.detail);
        // 重新初始化系统
        if (window.pointsSystem) {
            window.pointsSystem.init();
        }
        if (window.userSystem) {
            window.userSystem.updateUserInfo();
        }
        // 强制云端模式
        forceCloudMode();
    });
});

/**
 * 强制启用云端模式
 */
function forceCloudMode() {
    console.log('🌐 通用脚本：强制启用云端模式');
    
    // 设置云端模式标识
    localStorage.setItem('forceCloudMode', 'true');
    localStorage.removeItem('useLocalStorage');
    
    // 强制所有服务使用云端模式
    if (window.dataAdapter) {
        window.dataAdapter.forceCloudMode();
    }
    
    if (window.apiService) {
        window.apiService.forceCloudMode();
    }
    
    // 更新UI显示
    const dataSourceText = document.getElementById('dataSourceText');
    if (dataSourceText) {
        dataSourceText.textContent = '云端模式';
    }
    
    // 显示云端模式提示
    setTimeout(() => {
        if (window.showNotification) {
            window.showNotification('已连接到云端服务器', 'success');
        }
    }, 1000);
}

// 全局函数 - 云端版
function updatePointsDisplay(points) {
    console.log('🌐 通用脚本：更新积分显示（云端）', points);
    
    const userPoints = document.getElementById('userPoints');
    if (userPoints) {
        userPoints.textContent = points;
    }
    
    // 更新所有积分显示元素
    const allPointsElements = document.querySelectorAll('.user-points-display');
    allPointsElements.forEach(element => {
        element.textContent = points;
    });
    
    // 触发积分显示更新事件
    window.dispatchEvent(new CustomEvent('pointsDisplayUpdated', { points }));
}

// 导出全局函数
window.toggleDataSource = toggleDataSource;
window.showNotification = showNotification;
window.updatePointsDisplay = updatePointsDisplay;
window.forceCloudMode = forceCloudMode;
