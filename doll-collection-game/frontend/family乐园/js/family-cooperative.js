// 家庭乐园前端JavaScript - 协作功能模块
console.log('👥 协作功能模块加载中...');

// 扩展FamilyPark命名空间 - 协作功能
FamilyPark.Cooperative = {
    // 当前协作数据
    currentCooperativeData: {},
    
    // 加载家庭协同领养信息
    async loadCooperativeChickens() {
        try {
            if (!FamilyPark.currentFamily) {
                console.log('❌ 用户没有家庭');
                return;
            }
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/family/cooperative-chickens/${FamilyPark.currentFamily._id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentCooperativeData = data;
                this.updateCooperativeDisplay();
            }
        } catch (error) {
            console.error('❌ 加载协同领养信息错误:', error);
        }
    },
    
    // 更新协作领养显示
    updateCooperativeDisplay() {
        try {
            console.log('👥 更新协作领养显示');
            
            const cooperativeContainer = document.getElementById('cooperative-chickens');
            const cooperativeStats = document.getElementById('cooperative-stats');
            
            if (!this.currentCooperativeData || !this.currentCooperativeData.cooperativeChickens) {
                if (cooperativeContainer) {
                    cooperativeContainer.innerHTML = '<p>暂无协同领养的小鸡</p>';
                }
                return;
            }
            
            if (cooperativeContainer) {
                cooperativeContainer.innerHTML = `
                    <h3>协同领养的小鸡</h3>
                    <div class="cooperative-grid">
                        ${this.currentCooperativeData.cooperativeChickens.map(coop => this.createCooperativeCard(coop)).join('')}
                    </div>
                `;
            }
            
            if (cooperativeStats) {
                this.updateCooperativeStats();
            }
        } catch (error) {
            console.error('❌ 更新协作领养显示错误:', error);
        }
    },
    
    // 创建协作卡片
    createCooperativeCard(coop) {
        try {
            const chicken = coop.chickenId;
            const owner = coop.ownerId;
            const invitedBy = coop.invitedBy;
            
            if (!chicken) {
                return '<div class="cooperative-card error">小鸡数据加载失败</div>';
            }
            
            const qualityClass = this.getQualityClass(chicken.quality);
            const roleClass = this.getRoleClass(coop.contributionLevel);
            
            return `
                <div class="cooperative-card ${qualityClass} ${roleClass}">
                    <div class="card-header">
                        <div class="chicken-info">
                            <h4>${chicken.name}</h4>
                            <div class="chicken-meta">
                                <span class="level">Lv.${chicken.level}</span>
                                <span class="quality">${chicken.quality}</span>
                                <span class="role-badge">${coop.contributionLevel}</span>
                            </div>
                        </div>
                        <div class="coop-status ${coop.isActive ? 'active' : 'inactive'}">
                            <i class="fas ${coop.isActive ? 'fa-users' : 'fa-user-slash'}"></i>
                            <span>${coop.isActive ? '协作中' : '已停止'}</span>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="coop-details">
                            <div class="detail-item">
                                <span class="label">主人:</span>
                                <span class="value">${owner ? owner.username : '未知'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">邀请者:</span>
                                <span class="value">${invitedBy ? invitedBy.username : '未知'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">邀请时间:</span>
                                <span class="value">${new Date(coop.inviteDate).toLocaleDateString()}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">协作贡献:</span>
                                <span class="value">${this.getContributionLevel(coop.contributionLevel)}</span>
                            </div>
                        </div>
                        
                        <div class="coop-owners">
                            <h5>协作所有者</h5>
                            <div class="owners-list">
                                ${this.createOwnersList(chicken)}
                            </div>
                        </div>
                        
                        <div class="coop-actions">
                            <button class="btn btn-sm btn-info" onclick="FamilyPark.Cooperative.showCooperativeDetails('${coop._id}')">
                                <i class="fas fa-info-circle"></i> 详情
                            </button>
                            ${this.isOwner(coop) ? `
                                <button class="btn btn-sm btn-warning" onclick="FamilyPark.Cooperative.showManageCooperative('${coop._id}')">
                                    <i class="fas fa-cog"></i> 管理
                                </button>
                            ` : ''}
                            ${chicken.cooperativeOwners && chicken.cooperativeOwners.some(o => o.userId.toString() === FamilyPark.currentUser._id) ? `
                                <button class="btn btn-sm btn-success" onclick="FamilyPark.Cooperative.showCooperativeFeed('${chicken._id}')">
                                    <i class="fas fa-hand-holding-heart"></i> 协作喂养
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 创建协作卡片错误:', error);
            return '<div class="cooperative-card error">创建卡片失败</div>';
        }
    },
    
    // 创建所有者列表
    createOwnersList(chicken) {
        try {
            if (!chicken.cooperativeOwners || chicken.cooperativeOwners.length === 0) {
                return '<p class="no-owners">暂无协作所有者</p>';
            }
            
            return chicken.cooperativeOwners.map(owner => `
                <div class="owner-item">
                    <div class="owner-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="owner-info">
                        <div class="owner-name">${owner.userId ? owner.userId.username : '未知用户'}</div>
                        <div class="owner-role">${owner.role}</div>
                        <div class="owner-stats">
                            <span class="contribution-points">贡献点: ${owner.contributionPoints}</span>
                            <span class="join-date">加入: ${new Date(owner.joinDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="owner-status">
                        <div class="last-feed">
                            最后喂养: ${owner.lastFeedDate ? new Date(owner.lastFeedDate).toLocaleDateString() : '从未喂养'}
                        </div>
                        <div class="feed-count">
                            喂养次数: ${owner.feedCount || 0}
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('❌ 创建所有者列表错误:', error);
            return '<p class="error">创建所有者列表失败</p>';
        }
    },
    
    // 更新协作统计
    updateCooperativeStats() {
        try {
            const statsContainer = document.getElementById('cooperative-stats');
            if (!statsContainer) return;
            
            if (!this.currentCooperativeData || !this.currentCooperativeData.cooperativeChickens) {
                statsContainer.innerHTML = '<p>暂无协作统计数据</p>';
                return;
            }
            
            const stats = this.calculateCooperativeStats();
            
            statsContainer.innerHTML = `
                <h3>协作统计</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalCooperative}</div>
                        <div class="stat-label">协作小鸡</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalContributors}</div>
                        <div class="stat-label">总贡献者</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.avgContributors}</div>
                        <div class="stat-label">平均贡献者</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalContributionPoints}</div>
                        <div class="stat-label">总贡献点</div>
                    </div>
                </div>
                
                <div class="coop-ranking">
                    <h4>贡献排行</h4>
                    <div class="ranking-list">
                        ${this.createContributorRanking()}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 更新协作统计错误:', error);
        }
    },
    
    // 计算协作统计
    calculateCooperativeStats() {
        try {
            const chickens = this.currentCooperativeData.cooperativeChickens;
            const stats = {
                totalCooperative: chickens.length,
                totalContributors: 0,
                avgContributors: 0,
                totalContributionPoints: 0,
                contributorRanking: []
            };
            
            const contributorMap = new Map();
            
            chickens.forEach(coop => {
                const chicken = coop.chickenId;
                if (chicken && chicken.cooperativeOwners) {
                    chicken.cooperativeOwners.forEach(owner => {
                        const userId = owner.userId.toString();
                        
                        if (!contributorMap.has(userId)) {
                            contributorMap.set(userId, {
                                userId: userId,
                                username: owner.userId ? owner.userId.username : '未知',
                                totalPoints: 0,
                                feedCount: 0,
                                chickenCount: 0
                            });
                        }
                        
                        const contributor = contributorMap.get(userId);
                        contributor.totalPoints += owner.contributionPoints;
                        contributor.feedCount += owner.feedCount || 0;
                        contributor.chickenCount += 1;
                    });
                }
            });
            
            stats.totalContributors = contributorMap.size;
            stats.totalContributionPoints = Array.from(contributorMap.values()).reduce((sum, c) => sum + c.totalPoints, 0);
            stats.avgContributors = stats.totalCooperative > 0 ? Math.round(stats.totalContributors / stats.totalCooperative) : 0;
            stats.contributorRanking = Array.from(contributorMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
            
            return stats;
        } catch (error) {
            console.error('❌ 计算协作统计错误:', error);
            return {
                totalCooperative: 0,
                totalContributors: 0,
                avgContributors: 0,
                totalContributionPoints: 0,
                contributorRanking: []
            };
        }
    },
    
    // 创建贡献者排行
    createContributorRanking() {
        try {
            const stats = this.calculateCooperativeStats();
            
            if (stats.contributorRanking.length === 0) {
                return '<p class="no-ranking">暂无贡献数据</p>';
            }
            
            return stats.contributorRanking.slice(0, 10).map((contributor, index) => `
                <div class="ranking-item ${index === 0 ? 'rank-first' : index === 1 ? 'rank-second' : index === 2 ? 'rank-third' : ''}">
                    <div class="rank-number">${index + 1}</div>
                    <div class="contributor-info">
                        <div class="contributor-name">${contributor.username}</div>
                        <div class="contributor-stats">
                            <span class="points">${contributor.totalPoints}点</span>
                            <span class="chickens">${contributor.chickenCount}只</span>
                            <span class="feeds">${contributor.feedCount}次</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('❌ 创建贡献者排行错误:', error);
            return '<p class="error">创建排行失败</p>';
        }
    },
    
    // 显示协同领养模态框
    showCooperativeAdoptModal() {
        try {
            if (!FamilyPark.currentFamily) {
                FamilyPark.showNotification('您还没有家庭', 'error');
                return;
            }
            
            if (!FamilyPark.familyChickens || FamilyPark.familyChickens.length === 0) {
                FamilyPark.showNotification('您还没有小鸡', 'error');
                return;
            }
            
            const modalHtml = `
                <div id="cooperative-adopt-modal" class="modal" style="display: flex;">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <div class="modal-title">
                                <i class="fas fa-users"></i>
                                协同领养小鸡
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('cooperative-adopt-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="adopt-form">
                                <h4>选择要协同领养的小鸡</h4>
                                <div class="form-group">
                                    <label class="form-label">选择小鸡</label>
                                    <select id="adopt-chicken-select" class="form-control">
                                        <option value="">请选择小鸡</option>
                                        ${FamilyPark.familyChickens.map(chicken => `
                                            <option value="${chicken._id}">
                                                ${chicken.name} (Lv.${chicken.level} ${chicken.quality})
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">选择协作成员</label>
                                    <select id="adopt-member-select" class="form-control">
                                        <option value="">请选择家庭成员</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">协作角色</label>
                                    <select id="adopt-role-select" class="form-control">
                                        <option value="次要">次要贡献者</option>
                                        <option value="协助">协助贡献者</option>
                                    </select>
                                </div>
                                
                                <div class="adopt-benefits">
                                    <h5>协同领养的好处</h5>
                                    <ul>
                                        <li>多人共同照顾小鸡，提高存活率</li>
                                        <li>协作喂养获得额外20%成长值奖励</li>
                                        <li>分担喂养责任，减轻个人负担</li>
                                        <li>建立更紧密的家庭关系</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="adopt-actions">
                                <button class="btn btn-primary" onclick="FamilyPark.Cooperative.cooperativeAdopt()">
                                    <i class="fas fa-users"></i> 发起协同领养
                                </button>
                                <button class="btn btn-secondary" onclick="FamilyPark.closeModal('cooperative-adopt-modal')">
                                    <i class="fas fa-times"></i> 取消
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('cooperative-adopt-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // 加载家庭成员列表
            this.loadFamilyMembers();
        } catch (error) {
            console.error('❌ 显示协同领养模态框错误:', error);
        }
    },
    
    // 加载家庭成员列表
    async loadFamilyMembers() {
        try {
            if (!FamilyPark.currentFamily) return;
            
            const memberSelect = document.getElementById('adopt-member-select');
            if (!memberSelect) return;
            
            // 添加家庭成员选项
            if (FamilyPark.currentFamily.members && FamilyPark.currentFamily.members.length > 0) {
                FamilyPark.currentFamily.members.forEach(member => {
                    if (member.userId && member.userId._id !== FamilyPark.currentUser._id) {
                        const option = document.createElement('option');
                        option.value = member.userId._id;
                        option.textContent = member.userId.username;
                        memberSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('❌ 加载家庭成员列表错误:', error);
        }
    },
    
    // 协同领养小鸡
    async cooperativeAdopt() {
        try {
            const chickenId = document.getElementById('adopt-chicken-select').value;
            const targetUserId = document.getElementById('adopt-member-select').value;
            const role = document.getElementById('adopt-role-select').value;
            
            if (!chickenId) {
                FamilyPark.showNotification('请选择小鸡', 'error');
                return;
            }
            
            if (!targetUserId) {
                FamilyPark.showNotification('请选择协作成员', 'error');
                return;
            }
            
            FamilyPark.showNotification('正在发起协同领养...', 'info');
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/family/cooperative-adopt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chickenId: chickenId,
                    targetUserId: targetUserId,
                    role: role
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.closeModal('cooperative-adopt-modal');
                
                // 重新加载数据
                this.loadCooperativeChickens();
                FamilyPark.loadFamilyData();
            } else {
                FamilyPark.showNotification(data.message || '协同领养失败', 'error');
            }
        } catch (error) {
            console.error('❌ 协同领养小鸡错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示协作喂养模态框
    showCooperativeFeedModal(chickenId) {
        try {
            const chicken = FamilyPark.familyChickens.find(c => c._id === chickenId);
            if (!chicken) {
                FamilyPark.showNotification('小鸡不存在', 'error');
                return;
            }
            
            // 检查是否是协作所有者
            const isCooperativeOwner = chicken.cooperativeOwners && 
                chicken.cooperativeOwners.some(o => o.userId.toString() === FamilyPark.currentUser._id);
            
            if (!isCooperativeOwner) {
                FamilyPark.showNotification('您不是该小鸡的协作所有者', 'error');
                return;
            }
            
            const modalHtml = `
                <div id="cooperative-feed-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">
                                <i class="fas fa-hand-holding-heart"></i>
                                协作喂养 - ${chicken.name}
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('cooperative-feed-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="chicken-info">
                                <h4>${chicken.name}</h4>
                                <p>当前等级: Lv.${chicken.level}</p>
                                <p>当前成长值: ${chicken.growthValue || 0}</p>
                                <p>协作状态: <span class="status-active">协作所有者</span></p>
                            </div>
                            
                            <div class="coop-feed-info">
                                <h5>协作喂养说明</h5>
                                <div class="info-item">
                                    <i class="fas fa-star"></i>
                                    <span>协作喂养获得额外20%成长值奖励</span>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-users"></i>
                                    <span>可以邀请其他成员共同参与喂养</span>
                                </div>
                                <div class="info-item">
                                    <i class="fas fa-chart-line"></i>
                                    <span>贡献点会计入协作贡献统计</span>
                                </div>
                            </div>
                            
                            <div class="feed-options" id="coop-feed-options">
                                <p>加载饲料选项...</p>
                            </div>
                            
                            <div class="coop-feed-actions">
                                <button class="btn btn-success" onclick="FamilyPark.Cooperative.loadCooperativeFeedOptions('${chickenId}')">
                                    <i class="fas fa-sync"></i> 刷新饲料
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('cooperative-feed-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // 加载饲料选项
            this.loadCooperativeFeedOptions(chickenId);
        } catch (error) {
            console.error('❌ 显示协作喂养模态框错误:', error);
        }
    },
    
    // 加载协作喂养选项
    async loadCooperativeFeedOptions(chickenId) {
        try {
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/family/feed-shop`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                const feedOptions = document.getElementById('coop-feed-options');
                if (feedOptions) {
                    feedOptions.innerHTML = '';
                    
                    data.feeds.forEach(feed => {
                        const feedOption = document.createElement('div');
                        feedOption.className = 'coop-feed-option';
                        
                        const growthText = feed.isSpecial ? 
                            `${feed.minGrowth}-${feed.maxGrowth}` : feed.growthValue;
                        const bonusGrowth = Math.floor(feed.growthValue * 0.2);
                        const totalGrowth = feed.growthValue + bonusGrowth;
                        
                        feedOption.innerHTML = `
                            <div class="feed-info">
                                <h5>${feed.name}</h5>
                                <p>基础成长值: ${growthText}</p>
                                <p>协作奖励: +${bonusGrowth}</p>
                                <p class="total-growth">总成长值: <strong>${totalGrowth}</strong></p>
                                <p>价格: ${feed.price} 积分</p>
                                <p>${feed.description}</p>
                            </div>
                            <button class="btn btn-success" onclick="FamilyPark.Cooperative.cooperativeFeed('${chickenId}', '${feed._id}')">
                                协作喂养
                            </button>
                        `;
                        
                        feedOptions.appendChild(feedOption);
                    });
                }
            }
        } catch (error) {
            console.error('❌ 加载协作喂养选项错误:', error);
        }
    },
    
    // 协作喂养小鸡
    async cooperativeFeed(chickenId, feedId) {
        try {
            FamilyPark.showNotification('正在协作喂养...', 'info');
            
            const response = await FamilyPark.debugApiCall(`${FamilyPark.getApiBase()}/family/cooperative-feed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chickenId: chickenId,
                    feedId: feedId
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.currentUser = data.user;
                FamilyPark.updateUserPoints();
                FamilyPark.closeModal('cooperative-feed-modal');
                
                // 重新加载数据
                FamilyPark.loadChickenCoopData();
                this.loadCooperativeChickens();
            } else {
                FamilyPark.showNotification(data.message || '协作喂养失败', 'error');
            }
        } catch (error) {
            console.error('❌ 协作喂养小鸡错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示协作详情
    showCooperativeDetails(coopId) {
        try {
            const coop = this.currentCooperativeData.cooperativeChickens.find(c => c._id === coopId);
            if (!coop) {
                FamilyPark.showNotification('协作记录不存在', 'error');
                return;
            }
            
            const chicken = coop.chickenId;
            if (!chicken) {
                FamilyPark.showNotification('小鸡数据不存在', 'error');
                return;
            }
            
            const modalHtml = `
                <div id="cooperative-details-modal" class="modal" style="display: flex;">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <div class="modal-title">
                                <i class="fas fa-users"></i>
                                协作详情 - ${chicken.name}
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('cooperative-details-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="coop-overview">
                                <h4>协作概览</h4>
                                <div class="overview-grid">
                                    <div class="overview-item">
                                        <span class="label">小鸡名称:</span>
                                        <span class="value">${chicken.name}</span>
                                    </div>
                                    <div class="overview-item">
                                        <span class="label">等级:</span>
                                        <span class="value">Lv.${chicken.level}</span>
                                    </div>
                                    <div class="overview-item">
                                        <span class="label">品质:</span>
                                        <span class="value">${chicken.quality}</span>
                                    </div>
                                    <div class="overview-item">
                                        <span class="label">协作状态:</span>
                                        <span class="value ${coop.isActive ? 'active' : 'inactive'}">
                                            ${coop.isActive ? '协作中' : '已停止'}
                                        </span>
                                    </div>
                                    <div class="overview-item">
                                        <span class="label">贡献等级:</span>
                                        <span class="value">${coop.contributionLevel}</span>
                                    </div>
                                    <div class="overview-item">
                                        <span class="label">邀请时间:</span>
                                        <span class="value">${new Date(coop.inviteDate).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="coop-members">
                                <h4>协作成员</h4>
                                <div class="members-list">
                                    ${this.createDetailedOwnersList(chicken)}
                                </div>
                            </div>
                            
                            <div class="coop-activity">
                                <h4>协作活动</h4>
                                <div class="activity-stats">
                                    <div class="activity-item">
                                        <span class="label">总贡献点:</span>
                                        <span class="value">${this.getTotalContributionPoints(chicken)}</span>
                                    </div>
                                    <div class="activity-item">
                                        <span class="label">总喂养次数:</span>
                                        <span class="value">${this.getTotalFeedCount(chicken)}</span>
                                    </div>
                                    <div class="activity-item">
                                        <span class="label">最近活动:</span>
                                        <span class="value">${this.getLastActivityTime(chicken)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('cooperative-details-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            console.error('❌ 显示协作详情错误:', error);
        }
    },
    
    // 创建详细所有者列表
    createDetailedOwnersList(chicken) {
        try {
            if (!chicken.cooperativeOwners || chicken.cooperativeOwners.length === 0) {
                return '<p class="no-owners">暂无协作所有者</p>';
            }
            
            return chicken.cooperativeOwners.map(owner => `
                <div class="detailed-owner-item">
                    <div class="owner-header">
                        <div class="owner-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="owner-info">
                            <div class="owner-name">${owner.userId ? owner.userId.username : '未知用户'}</div>
                            <div class="owner-role">${owner.role}</div>
                        </div>
                        <div class="owner-contribution">
                            <span class="contribution-points">${owner.contributionPoints}点</span>
                        </div>
                    </div>
                    <div class="owner-details">
                        <div class="detail-row">
                            <span class="label">加入时间:</span>
                            <span class="value">${new Date(owner.joinDate).toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">最后喂养:</span>
                            <span class="value">${owner.lastFeedDate ? new Date(owner.lastFeedDate).toLocaleString() : '从未喂养'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">喂养次数:</span>
                            <span class="value">${owner.feedCount || 0}次</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('❌ 创建详细所有者列表错误:', error);
            return '<p class="error">创建详细列表失败</p>';
        }
    },
    
    // 获取总贡献点
    getTotalContributionPoints(chicken) {
        try {
            if (!chicken.cooperativeOwners) return 0;
            return chicken.cooperativeOwners.reduce((sum, owner) => sum + (owner.contributionPoints || 0), 0);
        } catch (error) {
            console.error('❌ 获取总贡献点错误:', error);
            return 0;
        }
    },
    
    // 获取总喂养次数
    getTotalFeedCount(chicken) {
        try {
            if (!chicken.cooperativeOwners) return 0;
            return chicken.cooperativeOwners.reduce((sum, owner) => sum + (owner.feedCount || 0), 0);
        } catch (error) {
            console.error('❌ 获取总喂养次数错误:', error);
            return 0;
        }
    },
    
    // 获取最后活动时间
    getLastActivityTime(chicken) {
        try {
            if (!chicken.cooperativeOwners) return '无活动记录';
            
            const lastActivities = chicken.cooperativeOwners
                .map(owner => owner.lastFeedDate ? new Date(owner.lastFeedDate) : null)
                .filter(date => date !== null);
            
            if (lastActivities.length === 0) return '无活动记录';
            
            const lastActivity = new Date(Math.max(...lastActivities));
            return lastActivity.toLocaleString();
        } catch (error) {
            console.error('❌ 获取最后活动时间错误:', error);
            return '计算失败';
        }
    },
    
    // 显示管理协作模态框
    showManageCooperative(coopId) {
        try {
            const coop = this.currentCooperativeData.cooperativeChickens.find(c => c._id === coopId);
            if (!coop) {
                FamilyPark.showNotification('协作记录不存在', 'error');
                return;
            }
            
            if (!this.isOwner(coop)) {
                FamilyPark.showNotification('您没有管理权限', 'error');
                return;
            }
            
            const modalHtml = `
                <div id="manage-cooperative-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">
                                <i class="fas fa-cog"></i>
                                管理协作 - ${coop.chickenId.name}
                            </div>
                            <span class="close" onclick="FamilyPark.closeModal('manage-cooperative-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="manage-options">
                                <h4>管理选项</h4>
                                <div class="option-buttons">
                                    <button class="btn btn-warning" onclick="FamilyPark.Cooperative.changeCooperativeRole('${coopId}')">
                                        <i class="fas fa-user-tag"></i> 修改协作角色
                                    </button>
                                    <button class="btn btn-info" onclick="FamilyPark.Cooperative.addCooperativeOwner('${coop.chickenId._id}')">
                                        <i class="fas fa-user-plus"></i> 添加协作所有者
                                    </button>
                                    <button class="btn btn-danger" onclick="FamilyPark.Cooperative.removeCooperativeOwner('${coopId}')">
                                        <i class="fas fa-user-minus"></i> 移除协作所有者
                                    </button>
                                    <button class="btn btn-secondary" onclick="FamilyPark.Cooperative.toggleCooperativeStatus('${coopId}')">
                                        <i class="fas ${coop.isActive ? 'fa-pause' : 'fa-play'}"></i>
                                        ${coop.isActive ? '暂停协作' : '恢复协作'}
                                    </button>
                                </div>
                            </div>
                            
                            <div class="coop-status-info">
                                <h4>当前状态</h4>
                                <div class="status-details">
                                    <div class="status-item">
                                        <span class="label">协作状态:</span>
                                        <span class="value ${coop.isActive ? 'active' : 'inactive'}">
                                            ${coop.isActive ? '活跃' : '暂停'}
                                        </span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">贡献等级:</span>
                                        <span class="value">${coop.contributionLevel}</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="label">协作所有者数量:</span>
                                        <span class="value">${coop.chickenId.cooperativeOwners ? coop.chickenId.cooperativeOwners.length : 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('manage-cooperative-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            console.error('❌ 显示管理协作模态框错误:', error);
        }
    },
    
    // 判断是否是所有者
    isOwner(coop) {
        try {
            return coop.ownerId && coop.ownerId.toString() === FamilyPark.currentUser._id;
        } catch (error) {
            console.error('❌ 判断是否是所有者错误:', error);
            return false;
        }
    },
    
    // 获取品质样式类
    getQualityClass(quality) {
        const qualityMap = {
            '普通': 'normal',
            '精英': 'elite',
            '传说': 'legend',
            '神话': 'myth'
        };
        return qualityMap[quality] || 'normal';
    },
    
    // 获取角色样式类
    getRoleClass(role) {
        const roleMap = {
            '主要': 'primary',
            '次要': 'secondary',
            '协助': 'assistant'
        };
        return roleMap[role] || 'secondary';
    },
    
    // 获取贡献等级描述
    getContributionLevel(level) {
        const levelMap = {
            '主要': '主要贡献者',
            '次要': '次要贡献者',
            '协助': '协助贡献者'
        };
        return levelMap[level] || '未知';
    },
    
    // 初始化协作功能面板
    initCooperativePanel() {
        try {
            console.log('👥 初始化协作功能面板');
            
            // 添加协作功能面板到导航
            this.addCooperativePanel();
            
            // 加载数据
            this.loadCooperativeChickens();
            
            // 设置定时更新
            this.setupAutoUpdate();
        } catch (error) {
            console.error('❌ 初始化协作功能面板错误:', error);
        }
    },
    
    // 添加协作功能面板
    addCooperativePanel() {
        try {
            const navLinks = document.querySelector('.nav-links');
            if (!navLinks) return;
            
            // 检查是否已存在
            const existingPanel = document.querySelector('[data-panel="cooperative"]');
            if (existingPanel) return;
            
            // 添加导航链接
            const cooperativeLink = document.createElement('li');
            cooperativeLink.innerHTML = '<a href="#" class="nav-link" data-panel="cooperative">协作功能</a>';
            navLinks.appendChild(cooperativeLink);
            
            // 添加面板
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;
            
            const cooperativePanel = document.createElement('div');
            cooperativePanel.id = 'cooperative';
            cooperativePanel.className = 'panel';
            cooperativePanel.innerHTML = `
                <h1>协作功能</h1>
                
                <div class="cooperative-actions">
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="FamilyPark.Cooperative.showCooperativeAdoptModal()">
                            <i class="fas fa-users"></i> 发起协同领养
                        </button>
                        <button class="btn btn-info" onclick="FamilyPark.Cooperative.loadCooperativeChickens()">
                            <i class="fas fa-sync"></i> 刷新数据
                        </button>
                    </div>
                </div>
                
                <div class="cooperative-chickens" id="cooperative-chickens">
                    <h3>协同领养的小鸡</h3>
                    <p>加载中...</p>
                </div>
                
                <div class="cooperative-stats" id="cooperative-stats">
                    <h3>协作统计</h3>
                    <p>加载中...</p>
                </div>
            `;
            
            mainContent.appendChild(cooperativePanel);
        } catch (error) {
            console.error('❌ 添加协作功能面板错误:', error);
        }
    },
    
    // 设置自动更新
    setupAutoUpdate() {
        try {
            // 每5分钟更新一次数据
            setInterval(() => {
                if (FamilyPark.currentFamily) {
                    this.loadCooperativeChickens();
                }
            }, 5 * 60 * 1000);
        } catch (error) {
            console.error('❌ 设置自动更新错误:', error);
        }
    }
};

console.log('👥 协作功能模块加载完成');
