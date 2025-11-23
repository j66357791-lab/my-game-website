// 家庭乐园前端JavaScript - 鸡蛋积分池模块
console.log('🥚 鸡蛋积分池模块加载中...');

// 扩展FamilyPark命名空间 - 鸡蛋积分池功能
FamilyPark.EggPool = {
    // 当前积分池数据
    currentPoolData: null,
    
    // 加载鸡蛋积分池数据
    async loadEggPoolData() {
        console.log('🥚 加载鸡蛋积分池数据...');
        
        if (!FamilyPark.currentFamily) {
            console.log('❌ 用户没有家庭');
            return;
        }
        
        try {
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/egg-pool/family/${FamilyPark.currentFamily._id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentPoolData = data.eggPool;
                this.updateEggPoolDisplay();
                this.updateEggPoolStats();
            }
        } catch (error) {
            console.error('❌ 加载鸡蛋积分池数据错误:', error);
        }
    },
    
    // 更新鸡蛋积分池显示
    updateEggPoolDisplay() {
        try {
            console.log('🥚 更新鸡蛋积分池显示');
            
            const poolInfo = document.getElementById('egg-pool-info');
            const poolProgress = document.getElementById('egg-pool-progress');
            const releaseHistory = document.getElementById('release-history');
            
            if (!this.currentPoolData) return;
            
            if (poolInfo) {
                poolInfo.innerHTML = `
                    <div class="pool-stat">
                        <span class="stat-label">总鸡蛋数:</span>
                        <span class="stat-value">${this.currentPoolData.totalEggs}</span>
                    </div>
                    <div class="pool-stat">
                        <span class="stat-label">总积分池:</span>
                        <span class="stat-value">${this.currentPoolData.totalPoints.toFixed(2)}</span>
                    </div>
                    <div class="pool-stat">
                        <span class="stat-label">每日释放率:</span>
                        <span class="stat-value">${(this.currentPoolData.dailyReleaseRate * 100).toFixed(1)}%</span>
                    </div>
                    <div class="pool-stat">
                        <span class="stat-label">上次释放:</span>
                        <span class="stat-value">${new Date(this.currentPoolData.lastReleaseDate).toLocaleDateString()}</span>
                    </div>
                    <div class="pool-stat">
                        <span class="stat-label">下次释放:</span>
                        <span class="stat-value">${this.getNextReleaseTime()}</span>
                    </div>
                    <div class="pool-stat">
                        <span class="stat-label">状态:</span>
                        <span class="stat-value ${this.currentPoolData.isActive ? 'active' : 'inactive'}">
                            ${this.currentPoolData.isActive ? '活跃' : '非活跃'}
                        </span>
                    </div>
                `;
            }
            
            if (poolProgress) {
                const maxPoolSize = 10000; // 假设最大池大小
                const releasePercentage = Math.min((this.currentPoolData.totalPoints / maxPoolSize) * 100, 100);
                
                poolProgress.innerHTML = `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${releasePercentage}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>池容量: ${releasePercentage.toFixed(1)}%</span>
                        <span>${this.currentPoolData.totalPoints.toFixed(2)} / ${maxPoolSize}</span>
                    </div>
                `;
            }
            
            if (releaseHistory) {
                this.updateReleaseHistory();
            }
        } catch (error) {
            console.error('❌ 更新鸡蛋积分池显示错误:', error);
        }
    },
    
    // 更新积分池统计
    updateEggPoolStats() {
        try {
            const statsContainer = document.getElementById('egg-pool-stats');
            if (!statsContainer) return;
            
            if (!this.currentPoolData) {
                statsContainer.innerHTML = '<p>暂无积分池数据</p>';
                return;
            }
            
            // 计算预计下次释放
            const nextRelease = this.getNextReleaseTime();
            const timeUntilRelease = this.getTimeUntilRelease(nextRelease);
            
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">当前池容量:</span>
                        <span class="stat-value">${this.currentPoolData.totalPoints.toFixed(2)} 积分</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">预计下次释放:</span>
                        <span class="stat-value">${timeUntilRelease}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">预计释放积分:</span>
                        <span class="stat-value">${(this.currentPoolData.totalPoints * this.currentPoolData.dailyReleaseRate).toFixed(2)} 积分</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">历史释放次数:</span>
                        <span class="stat-value">${this.currentPoolData.releaseHistory.length} 次</span>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 更新积分池统计错误:', error);
        }
    },
    
    // 更新释放历史
    updateReleaseHistory() {
        try {
            const historyContainer = document.getElementById('release-history');
            if (!historyContainer) return;
            
            if (!this.currentPoolData || !this.currentPoolData.releaseHistory.length) {
                historyContainer.innerHTML = '<p>暂无释放历史</p>';
                return;
            }
            
            const recentHistory = this.currentPoolData.releaseHistory.slice(-10); // 最近10次
            
            historyContainer.innerHTML = `
                <h3>最近释放历史</h3>
                <div class="history-list">
                    ${recentHistory.map(release => `
                        <div class="history-item">
                            <div class="history-date">${new Date(release.date).toLocaleString()}</div>
                            <div class="history-details">
                                <span class="history-eggs">鸡蛋: ${release.eggsReleased}</span>
                                <span class="history-points">积分: ${release.pointsReleased.toFixed(2)}</span>
                                <span class="history-members">成员: ${release.userShares.length}</span>
                            </div>
                            <div class="history-shares">
                                ${release.userShares.map(share => `
                                    <div class="share-item">
                                        <span class="share-user">用户${share.userId.toString().slice(-6)}</span>
                                        <span class="share-points">${share.pointsReceived.toFixed(2)}积分</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('❌ 更新释放历史错误:', error);
        }
    },
    
    // 手动释放积分池
    async manualRelease() {
        try {
            if (!FamilyPark.currentFamily) {
                FamilyPark.showNotification('您还没有家庭', 'error');
                return;
            }
            
            // 检查是否是家庭主人
            if (!FamilyPark.currentFamily.ownerId.equals(FamilyPark.currentUser._id)) {
                FamilyPark.showNotification('只有家庭主人可以手动释放积分', 'error');
                return;
            }
            
            if (!confirm('确定要手动释放积分池吗？')) {
                return;
            }
            
            FamilyPark.showNotification('正在释放积分池...', 'info');
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/egg-pool/daily-release/${FamilyPark.currentFamily._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                this.loadEggPoolData(); // 重新加载数据
            } else {
                FamilyPark.showNotification(data.message || '释放失败', 'error');
            }
        } catch (error) {
            console.error('❌ 手动释放积分池错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 兑换鸡蛋到积分池
    async exchangeEggsToPool(exchangeAll = false) {
        try {
            if (!FamilyPark.currentFamily) {
                FamilyPark.showNotification('您还没有家庭', 'error');
                return;
            }
            
            if (!FamilyPark.familyEggs || FamilyPark.familyEggs.length === 0) {
                FamilyPark.showNotification('没有可兑换的鸡蛋', 'warning');
                return;
            }
            
            let eggIds = [];
            let totalEggs = 0;
            
            if (exchangeAll) {
                // 兑换所有未收集的鸡蛋
                eggIds = FamilyPark.familyEggs.map(egg => egg._id);
                totalEggs = FamilyPark.familyEggs.reduce((sum, egg) => sum + egg.quantity, 0);
            } else {
                // 这里可以添加选择特定鸡蛋的逻辑
                FamilyPark.showNotification('请选择要兑换的鸡蛋', 'warning');
                return;
            }
            
            if (eggIds.length === 0) {
                FamilyPark.showNotification('没有可兑换的鸡蛋', 'warning');
                return;
            }
            
            if (!confirm(`确定要兑换${totalEggs}个鸡蛋到积分池吗？`)) {
                return;
            }
            
            FamilyPark.showNotification('正在兑换鸡蛋...', 'info');
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/egg-pool/exchange-eggs/${FamilyPark.currentFamily._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eggIds: eggIds,
                    exchangeAll: exchangeAll
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                this.loadEggPoolData(); // 重新加载数据
                FamilyPark.loadEggStorageData(); // 重新加载鸡蛋数据
            } else {
                FamilyPark.showNotification(data.message || '兑换失败', 'error');
            }
        } catch (error) {
            console.error('❌ 兑换鸡蛋到积分池错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 获取下次释放时间
    getNextReleaseTime() {
        if (!this.currentPoolData) return '未知';
        
        const lastRelease = new Date(this.currentPoolData.lastReleaseDate);
        const nextRelease = new Date(lastRelease);
        nextRelease.setDate(nextRelease.getDate() + 1);
        nextRelease.setHours(0, 0, 0, 0);
        
        return nextRelease.toLocaleString();
    },
    
    // 获取距离下次释放的时间
    getTimeUntilRelease(nextRelease) {
        try {
            const now = new Date();
            const release = new Date(nextRelease);
            const diff = release - now;
            
            if (diff <= 0) return '即将释放';
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days > 0) {
                return `${days}天${hours}小时`;
            } else if (hours > 0) {
                return `${hours}小时${minutes}分钟`;
            } else {
                return `${minutes}分钟`;
            }
        } catch (error) {
            return '计算中...';
        }
    },
    
    // 获取积分池历史记录
    async loadPoolHistory() {
        try {
            if (!FamilyPark.currentFamily) return;
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/egg-pool/history/${FamilyPark.currentFamily._id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.displayPoolHistory(data.history);
            }
        } catch (error) {
            console.error('❌ 加载积分池历史错误:', error);
        }
    },
    
    // 显示积分池历史
    displayPoolHistory(history) {
        try {
            const historyContainer = document.getElementById('pool-history-container');
            if (!historyC