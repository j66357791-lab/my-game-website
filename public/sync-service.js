/**
 * 数据同步服务 - 统一管理数据同步
 */
class SyncService {
    constructor() {
        this.apiService = window.apiService;
        this.syncInterval = API_CONFIG.SYNC_INTERVAL || 30000; // 30秒同步一次
        this.syncTimer = null;
        this.isOnline = false;
        this.lastSyncTime = null;
        this.syncQueue = [];
        this.isSyncing = false;
    }
    
    /**
     * 启动自动同步
     */
    startAutoSync() {
        this.stopAutoSync();
        
        // 检查网络状态
        this.checkNetworkStatus();
        
        // 立即同步一次
        this.syncAllData();
        
        // 设置定时同步
        this.syncTimer = setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this.syncAllData();
            }
        }, this.syncInterval);
        
        console.log('数据自动同步已启动，间隔:', this.syncInterval / 1000, '秒');
        
        // 监听网络状态变化
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('网络已连接，恢复同步');
            this.syncAllData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('网络已断开，暂停同步');
        });
    }
    
    /**
     * 停止自动同步
     */
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
        console.log('数据自动同步已停止');
    }
    
    /**
     * 检查网络状态
     */
    async checkNetworkStatus() {
        try {
            const response = await this.apiService.healthCheck();
            this.isOnline = response.success;
            console.log('网络状态检查:', this.isOnline ? '在线' : '离线');
        } catch (error) {
            this.isOnline = false;
            console.log('网络状态检查失败:', error);
        }
    }
    
    /**
     * 同步所有数据
     */
    async syncAllData() {
        if (this.isSyncing) {
            console.log('同步正在进行中，跳过本次同步');
            return;
        }
        
        this.isSyncing = true;
        
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!user.id) {
                console.log('用户未登录，跳过同步');
                this.isSyncing = false;
                return;
            }
            
            console.log('开始同步所有数据...');
            
            // 并行同步各种数据
            const syncPromises = [
                this.syncUserData(user.id),
                this.syncDollData(user.id),
                this.syncDollKingData(user.id),
                this.syncBagData(user.id),
                this.syncPointsData(user.id)
            ];
            
            const results = await Promise.allSettled(syncPromises);
            
            // 处理同步结果
            results.forEach((result, index) => {
                const syncTypes = ['用户数据', '娃娃数据', '娃娃之王数据', '背包数据', '积分数据'];
                if (result.status === 'fulfilled') {
                    console.log(`✅ ${syncTypes[index]} 同步成功`);
                } else {
                    console.error(`❌ ${syncTypes[index]} 同步失败:`, result.reason);
                }
            });
            
            this.lastSyncTime = new Date();
            this.notifySyncComplete('all', {
                success: true,
                timestamp: this.lastSyncTime.toISOString()
            });
            
        } catch (error) {
            console.error('同步所有数据失败:', error);
            this.notifySyncComplete('all', {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } finally {
            this.isSyncing = false;
        }
    }
    
    /**
     * 同步用户数据
     */
    async syncUserData(userId) {
        try {
            // 从本地获取用户数据
            const localUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            // 上传到服务器
            const response = await this.apiService.updateUserInfo(localUser);
            
            if (response.success) {
                // 从服务器获取最新数据
                const serverResponse = await this.apiService.getUserInfo();
                if (serverResponse.success) {
                    localStorage.setItem('currentUser', JSON.stringify(serverResponse.data.user));
                    this.notifyDataUpdate('userData', serverResponse.data.user);
                }
            }
            
            return response;
        } catch (error) {
            console.error('同步用户数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 同步娃娃数据
     */
    async syncDollData(userId) {
        try {
            // 从本地获取娃娃数据
            const localDolls = JSON.parse(localStorage.getItem(`userDolls_${userId}`) || '[]');
            
            // 上传到服务器
            const response = await this.apiService.request('/games/doll/sync', {
                method: 'POST',
                body: JSON.stringify({ dolls: localDolls })
            });
            
            if (response.success) {
                // 从服务器获取最新数据
                const serverResponse = await this.apiService.getDollList();
                if (serverResponse.success) {
                    localStorage.setItem(`userDolls_${userId}`, JSON.stringify(serverResponse.data.dolls));
                    this.notifyDataUpdate('dollData', serverResponse.data.dolls);
                }
            }
            
            return response;
        } catch (error) {
            console.error('同步娃娃数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 同步娃娃之王数据
     */
    async syncDollKingData(userId) {
        try {
            // 从本地获取娃娃之王数据
            const localKingGame = JSON.parse(localStorage.getItem(`kingGame_${userId}`) || '{}');
            
            // 上传到服务器
            const response = await this.apiService.saveDollKingData(localKingGame);
            
            if (response.success) {
                // 从服务器获取最新数据
                const serverResponse = await this.apiService.getDollKingData();
                if (serverResponse.success) {
                    localStorage.setItem(`kingGame_${userId}`, JSON.stringify(serverResponse.data));
                    this.notifyDataUpdate('dollKingData', serverResponse.data);
                }
            }
            
            return response;
        } catch (error) {
            console.error('同步娃娃之王数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 同步背包数据
     */
    async syncBagData(userId) {
        try {
            // 从本地获取背包数据
            const localBagItems = JSON.parse(localStorage.getItem(`bagItems_${userId}`) || '[]');
            
            // 上传到服务器
            const response = await this.apiService.request('/backpack/sync', {
                method: 'POST',
                body: JSON.stringify({ items: localBagItems })
            });
            
            if (response.success) {
                // 从服务器获取最新数据
                const serverResponse = await this.apiService.getBackpackItems();
                if (serverResponse.success) {
                    localStorage.setItem(`bagItems_${userId}`, JSON.stringify(serverResponse.data.items));
                    this.notifyDataUpdate('bagData', serverResponse.data.items);
                }
            }
            
            return response;
        } catch (error) {
            console.error('同步背包数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 同步积分数据
     */
    async syncPointsData(userId) {
        try {
            // 从本地获取积分数据
            const localPoints = window.pointsSystem ? window.pointsSystem.getPoints() : 0;
            
            // 从服务器获取最新数据
            const response = await this.apiService.getPointsBalance();
            
            if (response.success) {
                // 如果服务器数据更新，同步到本地
                if (response.data.balance !== localPoints) {
                    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    user.points = response.data.balance;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    
                    if (window.pointsSystem) {
                        window.pointsSystem.currentUser = user;
                    }
                    
                    this.notifyDataUpdate('pointsData', {
                        balance: response.data.balance
                    });
                }
            }
            
            return response;
        } catch (error) {
            console.error('同步积分数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 强制同步数据
     */
    async forceSync() {
        console.log('开始强制同步数据...');
        
        // 检查网络状态
        await this.checkNetworkStatus();
        
        if (!this.isOnline) {
            throw new Error('网络未连接，无法同步');
        }
        
        // 执行同步
        await this.syncAllData();
        
        console.log('强制同步完成');
    }
    
    /**
     * 添加到同步队列
     */
    addToSyncQueue(dataType, data) {
        this.syncQueue.push({
            type: dataType,
            data: data,
            timestamp: new Date().toISOString()
        });
        
        console.log('已添加到同步队列:', dataType);
    }
    
    /**
     * 处理同步队列
     */
    async processSyncQueue() {
        if (this.syncQueue.length === 0) {
            return;
        }
        
        console.log('处理同步队列，队列长度:', this.syncQueue.length);
        
        const itemsToProcess = [...this.syncQueue];
        this.syncQueue = [];
        
        for (const item of itemsToProcess) {
            try {
                switch (item.type) {
                    case 'userData':
                        await this.syncUserData(item.data.userId);
                        break;
                    case 'dollData':
                        await this.syncDollData(item.data.userId);
                        break;
                    case 'dollKingData':
                        await this.syncDollKingData(item.data.userId);
                        break;
                    case 'bagData':
                        await this.syncBagData(item.data.userId);
                        break;
                    case 'pointsData':
                        await this.syncPointsData(item.data.userId);
                        break;
                    default:
                        console.warn('未知的同步类型:', item.type);
                }
            } catch (error) {
                console.error('处理同步队列项失败:', error);
            }
        }
    }
    
    /**
     * 通知数据更新
     */
    notifyDataUpdate(dataType, data) {
        window.dispatchEvent(new CustomEvent('dataSynced', {
            detail: {
                type: dataType,
                data: data,
                timestamp: new Date().toISOString()
            }
        }));
    }
    
    /**
     * 通知同步完成
     */
    notifySyncComplete(dataType, result) {
        window.dispatchEvent(new CustomEvent('syncCompleted', {
            detail: {
                type: dataType,
                result: result,
                timestamp: new Date().toISOString()
            }
        }));
    }
    
    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            queueLength: this.syncQueue.length,
            syncInterval: this.syncInterval
        };
    }
    
    /**
     * 手动触发同步
     */
    async triggerSync(dataType = 'all') {
        if (this.isSyncing) {
            console.log('同步正在进行中，请稍后再试');
            return;
        }
        
        console.log('手动触发同步:', dataType);
        
        switch (dataType) {
            case 'all':
                await this.syncAllData();
                break;
            case 'userData':
                const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                await this.syncUserData(user.id);
                break;
            case 'dollData':
                const user2 = JSON.parse(localStorage.getItem('currentUser') || '{}');
                await this.syncDollData(user2.id);
                break;
            case 'dollKingData':
                const user3 = JSON.parse(localStorage.getItem('currentUser') || '{}');
                await this.syncDollKingData(user3.id);
                break;
            case 'bagData':
                const user4 = JSON.parse(localStorage.getItem('currentUser') || '{}');
                await this.syncBagData(user4.id);
                break;
            case 'pointsData':
                const user5 = JSON.parse(localStorage.getItem('currentUser') || '{}');
                await this.syncPointsData(user5.id);
                break;
            default:
                console.warn('未知的同步类型:', dataType);
        }
    }
}

// 创建全局同步服务实例
window.syncService = new SyncService();
