/**
 * 通用工具函数 - 修复版
 */
window.Common = {
    // 强制云端模式标志
    forceCloudModeFlag: false,
    
    /**
     * 🔧 修复：强制设置云端模式
     */
    forceCloudMode() {
        console.log('🌐 === 强制设置云端模式 ===');
        
        // 设置标志
        this.forceCloudModeFlag = true;
        
        // 强制设置localStorage
        localStorage.setItem('forceCloudMode', 'true');
        localStorage.removeItem('useLocalStorage');
        
        // 更新API配置
        if (window.API_CONFIG) {
            window.API_CONFIG.ENV = 'production';
            window.API_CONFIG.BASE_URL = 'https://tianchuang.onrender.com/api';
            console.log('🌐 API配置已更新:', window.API_CONFIG.BASE_URL);
        }
        
        // 强制更新数据适配器
        if (window.dataAdapter) {
            window.dataAdapter.forceCloudModeFlag = true;
            window.dataAdapter.useLocalStorage = false;
            console.log('🌐 数据适配器已强制为云端模式');
        }
        
        // 强制更新API服务
        if (window.apiService) {
            window.apiService.forceCloudModeFlag = true;
            window.apiService.useLocalStorage = false;
            console.log('🌐 API服务已强制为云端模式');
        }
        
        // 强制更新积分系统
        if (window.pointsSystem) {
            window.pointsSystem.forceCloudMode = true;
            window.pointsSystem.useLocalStorage = false;
            console.log('🌐 积分系统已强制为云端模式');
        }
        
        // 触发云端模式事件
        window.dispatchEvent(new CustomEvent('cloudModeForced', {
            detail: {
                timestamp: new Date().toISOString(),
                source: 'common.js'
            }
        }));
        
        console.log('✅ 云端模式强制设置完成');
    },
    
    /**
     * 🔧 修复：检查是否为云端模式
     */
    isCloudMode() {
        return this.forceCloudModeFlag || 
               localStorage.getItem('forceCloudMode') === 'true' ||
               (window.API_CONFIG && window.API_CONFIG.ENV === 'production');
    },
    
    /**
     * 🔧 修复：安全的API请求
     */
    async safeApiRequest(method, endpoint, data = null, options = {}) {
        try {
            // 确保使用云端模式
            if (!this.isCloudMode()) {
                console.warn('⚠️ 未强制云端模式，正在设置...');
                this.forceCloudMode();
            }
            
            // 获取认证token
            const token = this.getAuthToken();
            
            // 构建请求配置
            const requestConfig = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                    ...options.headers
                },
                ...options
            };
            
            // 添加请求体
            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                requestConfig.body = JSON.stringify(data);
            }
            
            // 构建完整URL
            const baseUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://tianchuang.onrender.com/api';
            const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
            
            console.log('🌐 API请求:', method, fullUrl);
            
            // 发送请求
            const response = await fetch(fullUrl, requestConfig);
            
            // 检查响应状态
            if (!response.ok) {
                if (response.status === 401) {
                    console.log('🔐 认证失败，尝试刷新token');
                    await this.refreshAuthToken();
                    // 重试一次
                    const retryResponse = await fetch(fullUrl, {
                        ...requestConfig,
                        headers: {
                            ...requestConfig.headers,
                            'Authorization': `Bearer ${this.getAuthToken()}`
                        }
                    });
                    return await this.handleApiResponse(retryResponse);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            return await this.handleApiResponse(response);
        } catch (error) {
            console.error('🌐 API请求失败:', error);
            
            // 降级到本地存储
            if (options.fallbackToLocal) {
                console.log('🔄 降级到本地存储');
                return this.fallbackToLocalStorage(method, endpoint, data);
            }
            
            throw error;
        }
    },
    
    /**
     * 🔧 修复：处理API响应
     */
    async handleApiResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            // 检查响应格式
            if (data.success === false) {
                throw new Error(data.message || '请求失败');
            }
            
            return data;
        } else {
            return {
                success: response.ok,
                data: await response.text(),
                status: response.status
            };
        }
    },
    
    /**
     * 🔧 修复：获取认证token
     */
    getAuthToken() {
        // 多种方式获取token
        let token = localStorage.getItem('authToken');
        
        if (!token) {
            // 从用户数据中获取
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                const user = JSON.parse(currentUser);
                token = user.token;
            }
        }
        
        if (!token) {
            // 从URL参数中获取
            const urlParams = new URLSearchParams(window.location.search);
            token = urlParams.get('token');
        }
        
        return token || '';
    },
    
    /**
     * 🔧 修复：刷新认证token
     */
    async refreshAuthToken() {
        try {
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                throw new Error('用户未登录');
            }
            
            const user = JSON.parse(currentUser);
            const refreshToken = user.refreshToken;
            
            if (!refreshToken) {
                throw new Error('无刷新token');
            }
            
            const response = await this.safeApiRequest('POST', '/auth/refresh', {
                refreshToken: refreshToken
            });
            
            if (response.success && response.data.token) {
                // 更新token
                user.token = response.data.token;
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('authToken', response.data.token);
                
                // 更新token过期时间
                const expiryTime = new Date();
                expiryTime.setHours(expiryTime.getHours() + 24);
                localStorage.setItem('tokenExpiry', expiryTime.toISOString());
                
                return response.data.token;
            }
            
            throw new Error('刷新token失败');
        } catch (error) {
            console.error('🔐 刷新token失败:', error);
            // 清除认证信息
            this.clearAuth();
            throw error;
        }
    },
    
    /**
     * 🔧 修复：清除认证信息
     */
    clearAuth() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.setItem('isLoggedIn', 'false');
        localStorage.removeItem('currentUser');
    },
    
    /**
     * 🔧 修复：降级到本地存储
     */
    fallbackToLocalStorage(method, endpoint, data) {
        console.log('🔄 降级到本地存储:', method, endpoint);
        
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = user.id || user.username;
            
            switch (method) {
                case 'GET':
                    if (endpoint.includes('/points/balance')) {
                        return {
                            success: true,
                            data: {
                                balance: user.points || 0
                            }
                        };
                    }
                    break;
                    
                case 'POST':
                    if (endpoint.includes('/points/update')) {
                        const amount = data.amount || 0;
                        user.points = Math.max(0, (user.points || 0) + amount);
                        localStorage.setItem('currentUser', JSON.stringify(user));
                        
                        return {
                            success: true,
                            data: {
                                newPoints: user.points
                            }
                        };
                    }
                    break;
            }
            
            return {
                success: false,
                error: '本地存储不支持该操作'
            };
        } catch (error) {
            console.error('🔄 本地存储操作失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 🔧 修复：数据同步
     */
    async syncData(dataType, data) {
        try {
            console.log('🔄 === 数据同步开始 ===');
            console.log('🔄 数据类型:', dataType);
            console.log('🔄 数据大小:', JSON.stringify(data).length, 'bytes');
            
            // 确保云端模式
            if (!this.isCloudMode()) {
                this.forceCloudMode();
            }
            
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = user.id || user.username;
            
            if (!userId) {
                throw new Error('用户ID不存在');
            }
            
            // 构建同步端点
            const syncEndpoint = `/sync/${dataType}`;
            
            // 发送同步请求
            const response = await this.safeApiRequest('POST', syncEndpoint, {
                userId: userId,
                dataType: dataType,
                data: data,
                timestamp: new Date().toISOString(),
                clientVersion: '1.0.0'
            }, {
                timeout: 30000,
                retries: 3,
                fallbackToLocal: true
            });
            
            if (response.success) {
                console.log('✅ 数据同步成功:', response.data);
                
                // 触发同步成功事件
                window.dispatchEvent(new CustomEvent('dataSyncSuccess', {
                    detail: {
                        dataType: dataType,
                        response: response.data,
                        timestamp: new Date().toISOString()
                    }
                }));
                
                return response.data;
            } else {
                throw new Error(response.error || '同步失败');
            }
        } catch (error) {
            console.error('🔄 数据同步失败:', error);
            
            // 触发同步失败事件
            window.dispatchEvent(new CustomEvent('dataSyncFailed', {
                detail: {
                    dataType: dataType,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            }));
            
            throw error;
        }
    },
    
    /**
     * 🔧 修复：显示通知
     */
    showNotification(message, type = 'info', duration = 3000) {
        try {
            // 移除现有通知
            const existingNotification = document.querySelector('.notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 创建新通知
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ️'}</div>
                <div class="notification-content">
                    <div class="notification-title">${type === 'success' ? '成功' : type === 'error' ? '错误' : '提示'}</div>
                    <div class="notification-message">${message}</div>
                </div>
            `;
            
            // 添加样式
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 240, 245, 0.95));
                backdrop-filter: blur(20px);
                padding: 15px 20px;
                border-radius: 15px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 1rem;
                transform: translateX(400px);
                transition: all 0.3s ease;
                max-width: 350px;
                border-left: 4px solid ${type === 'success' ? '#27AE60' : type === 'error' ? '#E74C3C' : '#3498DB'};
            `;
            
            document.body.appendChild(notification);
            
            // 显示动画
            setTimeout(() => {
                notification.classList.add('show');
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // 自动隐藏
            setTimeout(() => {
                notification.style.transform = 'translateX(400px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }, duration);
        } catch (error) {
            console.error('🔔 显示通知失败:', error);
        }
    },
    
    /**
     * 🔧 修复：格式化数字
     */
    formatNumber(num) {
        return new Intl.NumberFormat('zh-CN').format(num);
    },
    
    /**
     * 🔧 修复：格式化日期
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(new Date(date));
    },
    
    /**
     * 🔧 修复：防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * 🔧 修复：节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * 🔧 修复：初始化
     */
    init() {
        console.log('🔧 === 通用工具初始化 ===');
        
        // 强制设置云端模式
        this.forceCloudMode();
        
        // 监听云端模式事件
        window.addEventListener('cloudModeForced', (e) => {
            console.log('🌐 收到云端模式强制事件:', e.detail);
        });
        
        // 监听数据同步事件
        window.addEventListener('dataSyncSuccess', (e) => {
            console.log('✅ 数据同步成功:', e.detail);
            this.showNotification('数据同步成功', 'success');
        });
        
        window.addEventListener('dataSyncFailed', (e) => {
            console.log('❌ 数据同步失败:', e.detail);
            this.showNotification('数据同步失败: ' + e.detail.error, 'error');
        });
        
        console.log('✅ 通用工具初始化完成');
    }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.Common.init();
});

// 导出给全局使用
window.forceCloudMode = () => window.Common.forceCloudMode();
window.safeApiRequest = (method, endpoint, data, options) => window.Common.safeApiRequest(method, endpoint, data, options);
window.syncData = (dataType, data) => window.Common.syncData(dataType, data);
window.showNotification = (message, type, duration) => window.Common.showNotification(message, type, duration);
