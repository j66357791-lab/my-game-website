// 工具函数
const Utils = {
    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.innerHTML = `
            <div class="alert-content">
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    },
    
    // 显示收益通知
    showIncomeNotification(amount) {
        const notification = document.createElement('div');
        notification.className = 'income-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-coins"></i>
                <div class="notification-text">
                    <div class="notification-title">收益发放成功！</div>
                    <div class="notification-amount">+${amount.toFixed(2)} 积分</div>
                    <div class="notification-time">${new Date().toLocaleTimeString()}</div>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            animation: slideInRight 0.5s ease-out;
            max-width: 350px;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
        }, CONFIG.ANIMATION_DURATION);
    },
    
    // 防抖函数
    debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    // 格式化日期
    formatDate(date) {
        return new Date(date).toLocaleDateString();
    },
    
    // 格式化日期时间
    formatDateTime(date) {
        return new Date(date).toLocaleString();
    },
    
    // 生成ID
    generateId(length = 8) {
        return Math.random().toString(36).substring(2, 2 + length);
    }
};

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .income-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        animation: slideInRight 0.5s ease-out;
        max-width: 350px;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-text {
        text-align: left;
    }
    
    .notification-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 2px;
    }
    
    .notification-amount {
        font-size: 18px;
        font-weight: bold;
    }
    
    .notification-time {
        font-size: 12px;
        opacity: 0.8;
        margin-top: 2px;
    }
`;
document.head.appendChild(style);
