// 家庭乐园前端JavaScript - 喂养限制模块
console.log('🍽 喂养限制模块加载中...');

// 扩展FamilyPark命名空间 - 喂养限制功能
FamilyPark.FeedLimiter = {
    // 当前喂养限制数据
    currentFeedData: {},
    
    // 加载用户喂养统计
    async loadUserFeedStats(userId = null) {
        try {
            const targetUserId = userId || FamilyPark.currentUser._id;
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/feed-limiter/user-stats/${targetUserId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentFeedData = data.stats;
                this.updateFeedLimitDisplay();
            }
        } catch (error) {
            console.error('❌ 加载用户喂养统计错误:', error);
        }
    },
    
    // 加载小鸡喂养统计
    async loadChickenFeedStats(chickenId) {
        try {
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/feed-limiter/chicken-stats/${chickenId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updateChickenFeedDisplay(data.stats);
            }
        } catch (error) {
            console.error('❌ 加载小鸡喂养统计错误:', error);
        }
    },
    
    // 检查用户是否可以喂养小鸡
    async checkCanFeed(chickenId) {
        try {
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/feed-limiter/can-feed/${chickenId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return data;
            } else {
                return { canFeed: false, reason: data.message };
            }
        } catch (error) {
            console.error('❌ 检查喂养权限错误:', error);
            return { canFeed: false, reason: '网络错误' };
        }
    },
    
    // 更新喂养限制显示
    updateFeedLimitDisplay() {
        try {
            console.log('🍽 更新喂养限制显示');
            
            const feedLimitInfo = document.getElementById('feed-limit-info');
            const todayFeeds = document.getElementById('today-feeds');
            const feedHistory = document.getElementById('feed-history');
            
            if (!this.currentFeedData) return;
            
            if (feedLimitInfo) {
                feedLimitInfo.innerHTML = `
                    <div class="limit-stat">
                        <span class="stat-label">今日喂养次数:</span>
                        <span class="stat-value">${this.getTodayFeedCount()}</span>
                    </div>
                    <div class="limit-stat">
                        <span class="stat-label">每日限制:</span>
                        <span class="stat-value">${this.getDailyLimit()}</span>
                    </div>
                    <div class="limit-stat">
                        <span class="stat-label">剩余次数:</span>
                        <span class="stat-value">${this.getRemainingFeeds()}</span>
                    </div>
                    <div class="limit-stat">
                        <span class="stat-label">下次可喂:</span>
                        <span class="stat-value">${this.getNextFeedTime()}</span>
                    </div>
                `;
            }
            
            if (todayFeeds) {
                todayFeeds.innerHTML = `
                    <h3>今日喂养记录</h3>
                    <div class="feed-timeline">
                        ${this.getTodayFeedsHTML()}
                    </div>
                `;
            }
            
            if (feedHistory) {
                this.updateFeedHistory();
            }
        } catch (error) {
            console.error('❌ 更新喂养限制显示错误:', error);
        }
    },
    
    // 更新小鸡喂养显示
    updateChickenFeedDisplay(stats) {
        try {
            console.log('🍽 更新小鸡喂养显示');
            
            const chickenFeedInfo = document.getElementById('chicken-feed-info');
            if (!chickenFeedInfo) return;
            
            if (!stats || stats.length === 0) {
                chickenFeedInfo.innerHTML = '<p>暂无喂养记录</p>';
                return;
            }
            
            chickenFeedInfo.innerHTML = `
                <h3>小鸡喂养统计</h3>
                <div class="chicken-feed-stats">
                    ${stats.map(stat => `
                        <div class="feed-stat-item">
                            <div class="feeder-info">
                                <span class="feeder-name">${stat.userInfo[0]?.username || '未知用户'}</span>
                                <span class="feed-count">喂养${stat.totalFeeds}次</span>
                                <span class="feed-points">消耗${stat.totalPoints.toFixed(2)}积分</span>
                            </div>
                            <div class="last-feed">最后喂养: ${new Date(stat.lastFeed).toLocaleString()}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('❌ 更新小鸡喂养显示错误:', error);
        }
    },
    
    // 获取今日喂养次数
    getTodayFeedCount() {
        if (!this.currentFeedData || !Array.isArray(this.currentFeedData)) {
            return 0;
        }
        
        const today = new Date().toDateString();
        const todayFeeds = this.currentFeedData.filter(feed => {
            const feedDate = new Date(feed._id.day);
            return feedDate.toDateString() === today;
        });
        
        return todayFeeds.length;
    },
    
    // 获取每日限制
    getDailyLimit() {
        return 1; // 默认每人每天只能喂养一次
    },
    
    // 获取剩余喂养次数
    getRemainingFeeds() {
        const todayCount = this.getTodayFeedCount();
        const dailyLimit = this.getDailyLimit();
        return Math.max(0, dailyLimit - todayCount);
    },
    
    // 获取下次喂养时间
    getNextFeedTime() {
        const remainingFeeds = this.getRemainingFeeds();
        
        if (remainingFeeds > 0) {
            return '现在';
        }
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        return `明天 ${tomorrow.toLocaleTimeString()}`;
    },
    
    // 获取今日喂养HTML
    getTodayFeedsHTML() {
        if (!this.currentFeedData || !Array.isArray(this.currentFeedData)) {
            return '<p>今日暂无喂养记录</p>';
        }
        
        const today = new Date().toDateString();
        const todayFeeds = this.currentFeedData.filter(feed => {
            const feedDate = new Date(feed._id.day);
            return feedDate.toDateString() === today;
        });
        
        if (todayFeeds.length === 0) {
            return '<p>今日暂无喂养记录</p>';
        }
        
        return todayFeeds.map(feed => `
            <div class="feed-timeline-item">
                <div class="feed-time">
                    <i class="fas fa-clock"></i>
                    ${new Date(feed._id.day).toLocaleTimeString()}
                </div>
                <div class="feed-details">
                    <span class="feed-level">Lv.${feed._id.level}</span>
                    <span class="feed-points">${feed._id.totalPoints}积分</span>
                </div>
            </div>
        `).join('');
    },
    
    // 更新喂养历史
    updateFeedHistory() {
        try {
            const historyContainer = document.getElementById('feed-history');
            if (!historyContainer) return;
            
            if (!this.currentFeedData || !Array.isArray(this.currentFeedData)) {
                historyContainer.innerHTML = '<p>暂无喂养历史</p>';
                return;
            }
            
            const recentHistory = this.currentFeedData.slice(-30); // 最近30条
            
            historyContainer.innerHTML = `
                <h3>喂养历史</h3>
                <div class="feed-history-list">
                    ${recentHistory.map(feed => `
                        <div class="feed-history-item">
                            <div class="history-date">
                                ${new Date(feed._id.year, feed._id.month - 1, feed._id.day).toLocaleDateString()}
                            </div>
                            <div class="history-details">
                                <span class="history-level">Lv.${feed._id.level}</span>
                                <span class="history-feeds">${feed._id.totalFeeds}次</span>
                                <span class="history-points">${feed._id.totalPoints.toFixed(2)}积分</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('❌ 更新喂养历史错误:', error);
        }
    },
    
    // 显示喂养限制提示
    showFeedLimitModal(chickenId) {
        try {
            FamilyPark.selectedChicken = FamilyPark.familyChickens.find(c => c._id === chickenId);
            if (!FamilyPark.selectedChicken) return;
            
            // 创建喂养限制模态框
            const modalHtml = `
                <div id="feed-limit-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">喂养限制信息</div>
                            <span class="close" onclick="FamilyPark.closeModal('feed-limit-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="chicken-info">
                                <h4>${FamilyPark.selectedChicken.name}</h4>
                                <p>当前等级: Lv.${FamilyPark.selectedChicken.level}</p>
                                <p>当前成长值: ${FamilyPark.selectedChicken.growthValue || 0}</p>
                            </div>
                            <div class="feed-limit-info" id="modal-feed-limit-info">
                                <p>正在加载喂养限制信息...</p>
                            </div>
                            <div class="feed-actions">
                                <button class="btn btn-primary" onclick="FamilyPark.FeedLimiter.loadChickenFeedStats('${chickenId}')">
                                    <i class="fas fa-chart-bar"></i> 查看喂养统计
                                </button>
                                <button class="btn btn-info" onclick="FamilyPark.FeedLimiter.showFeedRules()">
                                    <i class="fas fa-info-circle"></i> 查看喂养规则
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('feed-limit-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // 加载喂养限制信息
            this.loadModalFeedLimitInfo(chickenId);
        } catch (error) {
            console.error('❌ 显示喂养限制模态框错误:', error);
        }
    },
    
    // 加载模态框喂养限制信息
    async loadModalFeedLimitInfo(chickenId) {
        try {
            const canFeedResult = await this.checkCanFeed(chickenId);
            
            const modalFeedLimitInfo = document.getElementById('modal-feed-limit-info');
            if (modalFeedLimitInfo) {
                modalFeedLimitInfo.innerHTML = `
                    <div class="limit-status ${canFeedResult.canFeed ? 'can-feed' : 'cannot-feed'}">
                        <i class="fas ${canFeedResult.canFeed ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        <span>${canFeedResult.canFeed ? '可以喂养' : '无法喂养'}</span>
                    </div>
                    <div class="limit-reason">
                        <strong>原因:</strong> ${canFeedResult.reason}
                    </div>
                    ${canFeedResult.remainingFeeds !== undefined ? `
                        <div class="limit-remaining">
                            <strong>今日剩余次数:</strong> ${canFeedResult.remainingFeeds}
                        </div>
                    ` : ''}
                    ${canFeedResult.nextFeedTime ? `
                        <div class="limit-next-feed">
                            <strong>下次可喂时间:</strong> ${canFeedResult.nextFeedTime}
                        </div>
                    ` : ''}
                `;
            }
        } catch (error) {
            console.error('❌ 加载模态框喂养限制信息错误:', error);
        }
    },
    
    // 显示喂养规则
    showFeedRules() {
        try {
            const rulesModal = document.createElement('div');
            rulesModal.className = 'modal';
            rulesModal.style.display = 'flex';
            rulesModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">喂养规则说明</div>
                        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="rules-content">
                            <h4>📋 喂养限制规则</h4>
                            <div class="rule-item">
                                <i class="fas fa-user-clock"></i>
                                <span><strong>每日限制:</strong> 每个用户每天只能喂养一次</span>
                            </div>
                            <div class="rule-item">
                                <i class="fas fa-home"></i>
                                <span><strong>家庭共享:</strong> 家庭成员可以喂养家庭中的任何小鸡</span>
                            </div>
                            <div class="rule-item">
                                <i class="fas fa-users"></i>
                                <span><strong>协作喂养:</strong> 协作所有者可以参与协作喂养</span>
                            </div>
                            <div class="rule-item">
                                <i class="fas fa-clock"></i>
                                <span><strong>重置时间:</strong> 每天0点重置喂养次数</span>
                            </div>
                            <div class="rule-item">
                                <i class="fas fa-chart-line"></i>
                                <span><strong>喂养记录:</strong> 所有喂养操作都会被记录</span>
                            </div>
                        </div>
                        
                        <div class="rules-tips">
                            <h4>💡 喂养技巧</h4>
                            <ul>
                                <li>合理安排喂养时间，避免浪费</li>
                                <li>与家庭成员协作喂养，提高效率</li>
                                <li>关注小鸡健康状况，及时喂养</li>
                                <li>查看喂养统计，了解喂养情况</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(rulesModal);
        } catch (error) {
            console.error('❌ 显示喂养规则错误:', error);
        }
    },
    
    // 获取家庭喂养统计
    async loadFamilyFeedStats() {
        try {
            if (!FamilyPark.currentFamily) {
                console.log('❌ 用户没有家庭');
                return;
            }
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/feed-limiter/family-stats/${FamilyPark.currentFamily._id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updateFamilyFeedStatsDisplay(data);
            }
        } catch (error) {
            console.error('❌ 加载家庭喂养统计错误:', error);
        }
    },
    
    // 更新家庭喂养统计显示
    updateFamilyFeedStatsDisplay(data) {
        try {
            console.log('🍽 更新家庭喂养统计显示');
            
            const familyStatsContainer = document.getElementById('family-feed-stats');
            if (!familyStatsContainer) return;
            
            if (!data.success) {
                familyStatsContainer.innerHTML = '<p>暂无家庭喂养统计</p>';
                return;
            }
            
            familyStatsContainer.innerHTML = `
                <h3>家庭喂养统计</h3>
                <div class="family-stats-grid">
                    <div class="family-stat-card">
                        <div class="stat-title">总喂养次数</div>
                        <div class="stat-value">${this.getTotalFamilyFeeds(data.chickenStats)}</div>
                    </div>
                    <div class="family-stat-card">
                        <div class="stat-title">总消耗积分</div>
                        <div class="stat-value">${this.getTotalFamilyPoints(data.chickenStats)}</div>
                    </div>
                    <div class="family-stat-card">
                        <div class="stat-title">活跃成员</div>
                        <div class="stat-value">${data.memberStats.length}</div>
                    </div>
                    <div class="family-stat-card">
                        <div class="stat-title">平均喂养次数</div>
                        <div class="stat-value">${this.getAverageFeeds(data.chickenStats)}</div>
                    </div>
                </div>
                
                <div class="member-feed-stats">
                    <h4>成员喂养排行</h4>
                    <div class="member-ranking">
                        ${this.getMemberRankingHTML(data.memberStats)}
                    </div>
                </div>
                
                <div class="chicken-feed-stats">
                    <h4>小鸡喂养排行</h4>
                    <div class="chicken-ranking">
                        ${this.getChickenRankingHTML(data.chickenStats)}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 更新家庭喂养统计显示错误:', error);
        }
    },
    
    // 获取家庭总喂养次数
    getTotalFamilyFeeds(chickenStats) {
        if (!Array.isArray(chickenStats)) return 0;
        return chickenStats.reduce((sum, stat) => sum + stat.totalFeeds, 0);
    },
    
    // 获取家庭总消耗积分
    getTotalFamilyPoints(chickenStats) {
        if (!Array.isArray(chickenStats)) return 0;
        return chickenStats.reduce((sum, stat) => sum + stat.totalPoints, 0);
    },
    
    // 获取平均喂养次数
    getAverageFeeds(chickenStats) {
        if (!Array.isArray(chickenStats) || chickenStats.length === 0) return 0;
        const totalFeeds = this.getTotalFamilyFeeds(chickenStats);
        return Math.round(totalFeeds / chickenStats.length);
    },
    
    // 获取成员排行HTML
    getMemberRankingHTML(memberStats) {
        if (!Array.isArray(memberStats) || memberStats.length === 0) {
            return '<p>暂无成员数据</p>';
        }
        
        const sortedMembers = memberStats.sort((a, b) => b.totalFeeds - a.totalFeeds);
        
        return sortedMembers.map((member, index) => `
            <div class="member-ranking-item ${index === 0 ? 'rank-first' : index === 1 ? 'rank-second' : index === 2 ? 'rank-third' : ''}">
                <div class="rank-number">${index + 1}</div>
                <div class="member-info">
                    <div class="member-name">${member.userId.username}</div>
                    <div class="member-stats">
                        <span class="member-feeds">喂养${member.totalFeeds}次</span>
                        <span class="member-points">消耗${member.totalPoints.toFixed(2)}积分</span>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // 获取小鸡排行HTML
    getChickenRankingHTML(chickenStats) {
        if (!Array.isArray(chickenStats) || chickenStats.length === 0) {
            return '<p>暂无小鸡数据</p>';
        }
        
        const sortedChickens = chickenStats.sort((a, b) => b.totalFeeds - a.totalFeeds);
        
        return sortedChickens.map((chicken, index) => `
            <div class="chicken-ranking-item ${index === 0 ? 'rank-first' : index === 1 ? 'rank-second' : index === 2 ? 'rank-third' : ''}">
                <div class="rank-number">${index + 1}</div>
                <div class="chicken-info">
                    <div class="chicken-name">${chicken.chickenName}</div>
                    <div class="chicken-stats">
                        <span class="chicken-level">Lv.${chicken.level}</span>
                        <span class="chicken-feeds">喂养${chicken.totalFeeds}次</span>
                        <span class="chicken-points">消耗${chicken.totalPoints.toFixed(2)}积分</span>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // 重置喂养限制（管理员功能）
    async resetFeedLimit(chickenId = null) {
        try {
            if (FamilyPark.currentUser.role !== 'admin') {
                FamilyPark.showNotification('需要管理员权限', 'error');
                return;
            }
            
            if (!confirm('确定要重置喂养限制吗？此操作不可恢复！')) {
                return;
            }
            
            let url;
            if (chickenId) {
                url = `${FamilyPark.getApiBase()}/feed-limiter/reset-daily-limit/${chickenId}`;
            } else {
                url = `${FamilyPark.getApiBase()}/feed-limiter/reset-daily-limit`;
            }
            
            const response = await FamilyPark.debugApiCall(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                // 重新加载数据
                this.loadUserFeedStats();
            } else {
                FamilyPark.showNotification(data.message || '重置失败', 'error');
            }
        } catch (error) {
            console.error('❌ 重置喂养限制错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 初始化喂养限制面板
    initFeedLimitPanel() {
        try {
            console.log('🍽 初始化喂养限制面板');
            
            // 添加喂养限制面板到导航
            this.addFeedLimitPanel();
            
            // 加载当前用户数据
            this.loadUserFeedStats();
            
            // 设置定时更新
            this.setupAutoUpdate();
        } catch (error) {
            console.error('❌ 初始化喂养限制面板错误:', error);
        }
    },
    
    // 添加喂养限制面板
    addFeedLimitPanel() {
        try {
            const navLinks = document.querySelector('.nav-links');
            if (!navLinks) return;
            
            // 检查是否已存在
            const existingPanel = document.querySelector('[data-panel="feed-limit"]');
            if (existingPanel) return;
            
            // 添加导航链接
            const feedLimitLink = document.createElement('li');
            feedLimitLink.innerHTML = '<a href="#" class="nav-link" data-panel="feed-limit">喂养限制</a>';
            navLinks.appendChild(feedLimitLink);
            
            // 添加面板
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;
            
            const feedLimitPanel = document.createElement('div');
            feedLimitPanel.id = 'feed-limit';
            feedLimitPanel.className = 'panel';
            feedLimitPanel.innerHTML = `
                <h1>喂养限制管理</h1>
                
                <div class="feed-limit-overview">
                    <div class="limit-info" id="feed-limit-info">
                        <p>加载中...</p>
                    </div>
                </div>
                
                <div class="feed-limit-actions">
                    <div class="action-buttons">
                        <button class="btn btn-info" onclick="FamilyPark.FeedLimiter.loadFamilyFeedStats()">
                            <i class="fas fa-chart-bar"></i> 查看家庭统计
                        </button>
                        ${FamilyPark.currentUser.role === 'admin' ? `
                            <button class="btn btn-warning" onclick="FamilyPark.FeedLimiter.resetFeedLimit()">
                                <i class="fas fa-redo"></i> 重置今日限制
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="today-feeds" id="today-feeds">
                    <h3>今日喂养记录</h3>
                    <div class="feed-timeline">
                        <p>加载中...</p>
                    </div>
                </div>
                
                <div class="feed-history" id="feed-history">
                    <h3>喂养历史</h3>
                    <p>加载中...</p>
                </div>
                
                <div class="family-feed-stats" id="family-feed-stats">
                    <h3>家庭喂养统计</h3>
                    <p>加载中...</p>
                </div>
            `;
            
            mainContent.appendChild(feedLimitPanel);
        } catch (error) {
            console.error('❌ 添加喂养限制面板错误:', error);
        }
    },
    
    // 设置自动更新
    setupAutoUpdate() {
        try {
            // 每10分钟更新一次数据
            setInterval(() => {
                if (FamilyPark.currentUser) {
                    this.loadUserFeedStats();
                }
            }, 10 * 60 * 1000);
            
            // 每小时检查一次家庭统计
            setInterval(() => {
                if (FamilyPark.currentFamily) {
                    this.loadFamilyFeedStats();
                }
            }, 60 * 60 * 1000);
        } catch (error) {
            console.error('❌ 设置自动更新错误:', error);
        }
    }
};

console.log('🍽 喂养限制模块加载完成');
