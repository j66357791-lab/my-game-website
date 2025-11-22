// 家庭乐园前端JavaScript - 养鸡场模块
console.log('🐔 养鸡场模块加载中...');

// 扩展FamilyPark命名空间 - 养鸡场功能
FamilyPark.ChickenCoop = {
    // 加载养鸡场数据
    async loadChickenCoopData() {
        console.log('🐔 加载养鸡场数据...');
        
        if (!FamilyPark.currentFamily) {
            console.log('❌ 用户没有家庭');
            return;
        }
        
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/family/my-family`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.familyChickens = data.chickens || [];
                FamilyPark.updateChickenCoopDisplay();
            }
        } catch (error) {
            console.error('❌ 加载养鸡场数据错误:', error);
        }
    },
    
    // 更新养鸡场显示
    updateChickenCoopDisplay() {
        try {
            console.log('🐔 更新养鸡场显示');
            
            const chickensContainer = document.getElementById('chickens-container');
            if (!chickensContainer) return;
            
            chickensContainer.innerHTML = '';
            
            if (FamilyPark.familyChickens.length === 0) {
                chickensContainer.innerHTML = '<p>养鸡场还没有小鸡，快去邀请好友或抽取小鸡吧！</p>';
                return;
            }
            
            FamilyPark.familyChickens.forEach(chicken => {
                const chickenCard = document.createElement('div');
                chickenCard.className = 'chicken-card';
                
                const qualityClass = this.getQualityClass(chicken.quality);
                const healthStatus = chicken.checkHealth ? '健康' : '需要喂养';
                const healthClass = chicken.checkHealth ? 'healthy' : 'unhealthy';
                
                // 检查是否为当前用户的小鸡
                const isMyChicken = chicken.ownerId && chicken.ownerId._id === FamilyPark.currentUser._id;
                const ownerClass = isMyChicken ? 'my-chicken' : '';
                
                chickenCard.innerHTML = `
                    <div class="chicken-header ${qualityClass} ${ownerClass}">
                        <h3>${chicken.name}</h3>
                        <div class="chicken-level">Lv.${chicken.level}</div>
                        <div class="chicken-quality">${chicken.quality}</div>
                        ${isMyChicken ? '<div class="owner-badge">我的小鸡</div>' : ''}
                    </div>
                    <div class="chicken-body">
                        <div class="chicken-info">
                            <div class="info-item">
                                <span class="info-label">成长值:</span>
                                <span class="info-value">${chicken.growthValue || 0}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">下一级:</span>
                                <span class="info-value">${this.getNextLevelRequirement(chicken.level, chicken.quality)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">健康状态:</span>
                                <span class="info-value ${healthClass}">${healthStatus}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">寿命:</span>
                                <span class="info-value">${chicken.remainingDays || 180}天</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">主人:</span>
                                <span class="info-value">${chicken.ownerId ? chicken.ownerId.username : '未知'}</span>
                            </div>
                        </div>
                        <div class="chicken-actions">
                            <button class="btn btn-success btn-sm" onclick="FamilyPark.ChickenCoop.showFeedModal('${chicken._id}')">
                                <i class="fas fa-seedling"></i> 喂养
                            </button>
                            ${chicken.level >= 3 ? `
                                <button class="btn btn-primary btn-sm" onclick="FamilyPark.ChickenCoop.collectEgg('${chicken._id}')">
                                    <i class="fas fa-egg"></i> 收蛋
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
                
                chickensContainer.appendChild(chickenCard);
            });
            
            // 更新抽取按钮显示状态
            this.updateDrawButtonStatus();
        } catch (error) {
            console.error('❌ 更新养鸡场显示错误:', error);
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
    
    // 获取下一级所需成长值
    getNextLevelRequirement(level, quality) {
        const baseRequirements = {
            1: 200,
            2: 500,
            3: 1250,
            4: 3125,
            5: 7813,
            6: 19530
        };
        
        const qualityMultipliers = {
            '普通': 2.5,
            '精英': 2.3,
            '传说': 2.2,
            '神话': 2.0
        };
        
        const multiplier = qualityMultipliers[quality] || 2.5;
        const baseReq = baseRequirements[level] || 0;
        
        return Math.floor(baseReq * multiplier);
    },
    
    // 更新抽取按钮状态
    updateDrawButtonStatus() {
        try {
            const drawBtn = document.getElementById('draw-btn');
            if (!drawBtn) return;
            
            // 检查是否有3级以上的小鸡
            const hasLevel3Chicken = FamilyPark.familyChickens.some(c => c.level >= 3);
            
            if (hasLevel3Chicken) {
                drawBtn.style.display = 'inline-block';
            } else {
                drawBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ 更新抽取按钮状态错误:', error);
        }
    },
    
    // 显示喂养模态框
    showFeedModal(chickenId) {
        try {
            FamilyPark.selectedChicken = FamilyPark.familyChickens.find(c => c._id === chickenId);
            if (!FamilyPark.selectedChicken) return;
            
            // 创建喂养模态框
            const modalHtml = `
                <div id="feed-modal" class="modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <div class="modal-title">喂养小鸡</div>
                            <span class="close" onclick="FamilyPark.closeModal('feed-modal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div class="chicken-info">
                                <h4>${FamilyPark.selectedChicken.name}</h4>
                                <p>当前等级: Lv.${FamilyPark.selectedChicken.level}</p>
                                <p>当前成长值: ${FamilyPark.selectedChicken.growthValue || 0}</p>
                                <p>下一级需要: ${this.getNextLevelRequirement(FamilyPark.selectedChicken.level, FamilyPark.selectedChicken.quality)}</p>
                                <p>主人: ${FamilyPark.selectedChicken.ownerId ? FamilyPark.selectedChicken.ownerId.username : '未知'}</p>
                            </div>
                            <div class="feed-options" id="feed-options">
                                <p>加载中...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 移除已存在的模态框
            const existingModal = document.getElementById('feed-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // 添加新模态框
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // 加载饲料选项
            this.loadFeedOptions();
        } catch (error) {
            console.error('❌ 显示喂养模态框错误:', error);
        }
    },
    
    // 加载饲料选项
    async loadFeedOptions() {
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/family/feed-shop`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.feedShopItems = data.feeds || [];
                this.displayFeedOptions();
            }
        } catch (error) {
            console.error('❌ 加载饲料选项错误:', error);
        }
    },
    
    // 显示饲料选项
    displayFeedOptions() {
        try {
            const feedOptions = document.getElementById('feed-options');
            if (!feedOptions) return;
            
            feedOptions.innerHTML = '';
            
            FamilyPark.feedShopItems.forEach(feed => {
                const feedOption = document.createElement('div');
                feedOption.className = 'feed-option';
                
                const growthText = feed.isSpecial ? 
                    `${feed.minGrowth}-${feed.maxGrowth}` : feed.growthValue;
                
                feedOption.innerHTML = `
                    <div class="feed-info">
                        <h5>${feed.name}</h5>
                        <p>成长值: ${growthText}</p>
                        <p>价格: ${feed.price} 积分</p>
                        <p>${feed.description}</p>
                    </div>
                    <button class="btn btn-success" onclick="FamilyPark.ChickenCoop.feedChicken('${feed._id}')">
                        喂养
                    </button>
                `;
                
                feedOptions.appendChild(feedOption);
            });
        } catch (error) {
            console.error('❌ 显示饲料选项错误:', error);
        }
    },
    
    // 喂养小鸡
    async feedChicken(feedId) {
        if (!FamilyPark.selectedChicken) return;
        
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/family/feed-chicken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chickenId: FamilyPark.selectedChicken._id,
                    feedId: feedId
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.currentUser = data.user;
                FamilyPark.updateUserPoints();
                FamilyPark.closeModal('feed-modal');
                
                // 重新加载养鸡场数据
                FamilyPark.ChickenCoop.loadChickenCoopData();
                FamilyPark.updateFamilyStats();
            } else {
                FamilyPark.showNotification(data.message || '喂养失败', 'error');
            }
        } catch (error) {
            console.error('❌ 喂养小鸡错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 收集鸡蛋
    async collectEgg(chickenId) {
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/family/collect-eggs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eggIds: [chickenId] // 这里简化处理，实际应该是鸡蛋ID
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.currentUser = data.user;
                FamilyPark.updateUserPoints();
                
                // 重新加载鸡蛋仓库数据
                FamilyPark.EggStorage.loadEggStorageData();
                FamilyPark.updateFamilyStats();
            } else {
                FamilyPark.showNotification(data.message || '收蛋失败', 'error');
            }
        } catch (error) {
            console.error('❌ 收集鸡蛋错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示抽取小鸡模态框
    showDrawModal() {
        try {
            console.log('🎲 显示抽取小鸡模态框');
            const modal = document.getElementById('draw-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        } catch (error) {
            console.error('❌ 显示抽取小鸡模态框错误:', error);
        }
    },
    
    // 抽取小鸡
    async drawChicken() {
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/family/draw-chicken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.currentUser = data.user;
                FamilyPark.updateUserPoints();
                FamilyPark.closeModal('draw-modal');
                
                // 重新加载养鸡场数据
                FamilyPark.ChickenCoop.loadChickenCoopData();
                FamilyPark.updateFamilyStats();
            } else {
                FamilyPark.showNotification(data.message || '抽取失败', 'error');
            }
        } catch (error) {
            console.error('❌ 抽取小鸡错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示升级养鸡场模态框
    showUpgradeModal() {
        try {
            console.log('🔧 显示升级养鸡场模态框');
            const modal = document.getElementById('upgrade-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        } catch (error) {
            console.error('❌ 显示升级养鸡场模态框错误:', error);
        }
    },
    
    // 升级养鸡场
    async upgradeCoop(targetLevel) {
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/family/upgrade-coop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetLevel: targetLevel })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.currentUser = data.user;
                FamilyPark.updateUserPoints();
                FamilyPark.closeModal('upgrade-modal');
                
                // 重新加载家庭数据
                FamilyPark.loadFamilyData();
                FamilyPark.updateFamilyStats();
            } else {
                FamilyPark.showNotification(data.message || '升级失败', 'error');
            }
        } catch (error) {
            console.error('❌ 升级养鸡场错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    }
};

console.log('🐔 养鸡场模块加载完成');