/**
 * 数据适配器 - 修复版
 */
window.dataAdapter = {
    // 强制云端模式标志
    forceCloudModeFlag: false,
    
    /**
     * 🔧 修复：强制云端模式
     */
    forceCloudMode() {
        console.log('🌐 === 数据适配器强制云端模式 ===');
        
        this.forceCloudModeFlag = true;
        this.useLocalStorage = false;
        
        // 更新配置
        localStorage.setItem('forceCloudMode', 'true');
        localStorage.removeItem('useLocalStorage');
        
        console.log('✅ 数据适配器已强制为云端模式');
    },
    
    /**
     * 🔧 修复：安全的API请求
     */
    async request(method, endpoint, data = null) {
        try {
            // 确保使用云端模式
            if (!this.forceCloudModeFlag && !this.isCloudMode()) {
                console.log('🔄 数据适配器未强制云端模式，正在设置...');
                this.forceCloudMode();
            }
            
            // 使用通用工具的安全API请求
            if (window.Common && window.Common.safeApiRequest) {
                return await window.Common.safeApiRequest(method, endpoint, data, {
                    timeout: 15000,
                    retries: 2,
                    fallbackToLocal: true
                });
            }
            
            // 备用方案
            const baseUrl = 'https://tianchuang.onrender.com/api';
            const token = this.getAuthToken();
            
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: data ? JSON.stringify(data) : null
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('🌐 数据适配器请求失败:', error);
            
            // 降级到本地存储
            return this.fallbackToLocal(method, endpoint, data);
        }
    },
    
    /**
     * 🔧 修复：获取认证token
     */
    getAuthToken() {
        let token = localStorage.getItem('authToken');
        
        if (!token) {
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                const user = JSON.parse(currentUser);
                token = user.token;
            }
        }
        
        return token || '';
    },
    
    /**
     * 🔧 修复：降级到本地存储
     */
    fallbackToLocal(method, endpoint, data) {
        console.log('🔄 数据适配器降级到本地存储');
        
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = user.id || user.username;
            
            switch (method) {
                case 'GET':
                    if (endpoint.includes('/user')) {
                        return {
                            success: true,
                            data: user
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
     * 🔧 修复：用户登录
     */
    async login(credentials) {
        try {
            const response = await this.request('POST', '/login', credentials);
            
            if (response.success && response.data.token) {
                // 保存token
                localStorage.setItem('authToken', response.data.token);
                
                // 保存用户信息
                const userData = {
                    ...response.data.user,
                    token: response.data.token,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('currentUser', JSON.stringify(userData));
                localStorage.setItem('isLoggedIn', 'true');
                
                // 设置token过期时间
                const expiryTime = new Date();
                expiryTime.setHours(expiryTime.getHours() + 24);
                localStorage.setItem('tokenExpiry', expiryTime.toISOString());
            }
            
            return response;
        } catch (error) {
            console.error('🌐 登录失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 🔧 修复：获取用户信息
     */
    async getUserInfo() {
        try {
            const response = await this.request('GET', '/user');
            return response;
        } catch (error) {
            console.error('🌐 获取用户信息失败:', error);
            
            // 降级到本地存储
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return {
                success: true,
                data: user
            };
        }
    },
    
    /**
     * 🔧 修复：更新积分
     */
    async updatePoints(amount, reason, metadata = {}) {
        try {
            const response = await this.request('POST', '/points/update', {
                amount, reason, metadata
            });
            
            if (response.success) {
                // 更新本地积分
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                user.points = response.data.newPoints;
                user.updatedAt = new Date().toISOString();
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 触发积分更新事件
                window.dispatchEvent(new CustomEvent('pointsUpdated', {
                    detail: {
                        newPoints: response.data.newPoints,
                        change: amount,
                        reason: reason,
                        metadata: metadata
                    }
                }));
            }
            
            return response;
        } catch (error) {
            console.error('🌐 更新积分失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 🔧 修复：获取积分余额
     */
    async getPointsBalance() {
        try {
            const response = await this.request('GET', '/points/balance');
            return response;
        } catch (error) {
            console.error('🌐 获取积分余额失败:', error);
            
            // 降级到本地存储
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return {
                success: true,
                data: {
                    balance: user.points || 0
                }
            };
        }
    },
    
    /**
     * 🔧 修复：获取娃娃列表
     */
    async getDolls() {
        try {
            const response = await this.request('GET', '/dolls');
            return response;
        } catch (error) {
            console.error('🌐 获取娃娃列表失败:', error);
            
            // 降级到本地存储
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = user.id || user.username;
            const savedDolls = localStorage.getItem(`userDolls_${userId}`);
            
            return {
                success: true,
                data: savedDolls ? JSON.parse(savedDolls) : []
            };
        }
    },
    
    /**
     * 🔧 修复：购买娃娃
     */
    async buyDoll(level) {
        try {
            const response = await this.request('POST', '/dolls/buy', { level });
            return response;
        } catch (error) {
            console.error('🌐 购买娃娃失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 🔧 修复：保存娃娃数据
     */
    async saveDolls(dolls) {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = user.id || user.username;
            
            // 保存到本地
            localStorage.setItem(`userDolls_${userId}`, JSON.stringify(dolls));
            
            // 同步到云端
            if (window.Common && window.Common.syncData) {
                try {
                    await window.Common.syncData('dolls', {
                        userId: userId,
                        dolls: dolls
                    });
                } catch (syncError) {
                    console.error('🔄 云端同步失败:', syncError);
                }
            }
            
            return {
                success: true,
                data: dolls
            };
        } catch (error) {
            console.error('🌐 保存娃娃数据失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 🔧 修复：检查是否为云端模式
     */
    isCloudMode() {
        return this.forceCloudModeFlag || 
               localStorage.getItem('forceCloudMode') === 'true';
    },
    
    /**
     * 🔧 修复：初始化
     */
    init() {
        console.log('🌐 === 数据适配器初始化 ===');
        
        // 强制设置云端模式
        this.forceCloudMode();
        
        console.log('✅ 数据适配器初始化完成');
    }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.dataAdapter.init();
});
