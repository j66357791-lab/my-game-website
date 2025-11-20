// 家庭乐园前端JavaScript - 鸡蛋仓库模块
console.log('🥚 鸡蛋仓库模块加载中...');

// 扩展FamilyPark命名空间 - 鸡蛋仓库功能
FamilyPark.EggStorage = {
    // 加载鸡蛋仓库数据
    async loadEggStorageData() {
        console.log('🥚 加载鸡蛋仓库数据...');
        
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
                FamilyPark.familyEggs = data.eggs || [];
                this.updateEggStorageDisplay();
            }
        } catch (error) {
            console.error('❌ 加载鸡蛋仓库数据错误:', error);
        }
    },
    
    // 更新鸡蛋仓库显示
    updateEggStorageDisplay() {
        try {
            console.log('🥚 更新鸡蛋仓库显示');
            
            const availableEggs = document.getElementById('available-eggs');
            const eggsContainer = document.getElementById('eggs-container');
            
            if (availableEggs) {
                const totalEggs = FamilyPark.familyEggs.reduce((sum, egg) => sum + egg.quantity, 0);
                availableEggs.textContent = totalEggs;
            }
            
            if (!eggsContainer) return;
            
            eggsContainer.innerHTML = '';
            
            if (FamilyPark.familyEggs.length === 0) {
                eggsContainer.innerHTML = '<p>仓库暂无鸡蛋</p>';
                return;
            }
            
            FamilyPark.familyEggs.forEach(egg => {
                const eggCard = document.createElement('div');
                eggCard.className = 'egg-card';
                
                eggCard.innerHTML = `
                    <div class="egg-header">
                        <h3>鸡蛋</h3>
                        <div class="egg-quantity">${egg.quantity}个</div>
                    </div>
                    <div class="egg-body">
                        <div class="egg-info">
                            <div class="info-item">
                                <span class="info-label">来源:</span>
                                <span class="info-value">${egg.chickenId?.name || '未知小鸡'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">生产时间:</span>
                                <span class="info-value">${new Date(egg.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">可兑换:</span>
                                <span class="info-value">${egg.quantity * 100} 积分</span>
                            </div>
                        </div>
                        <div class="egg-actions">
                            <button class="btn btn-success btn-sm" onclick="FamilyPark.EggStorage.collectSingleEgg('${egg._id}')">
                                <i class="fas fa-coins"></i> 收集
                            </button>
                        </div>
                    </div>
                `;
                
                eggsContainer.appendChild(eggCard);
            });
        } catch (error) {
            console.error('❌ 更新鸡蛋仓库显示错误:', error);
        }
    },
    
    // 收集单个鸡蛋
    async collectSingleEgg(eggId) {
        try {
            const response = await fetch(`${FamilyPark.getApiBase()}/family/collect-eggs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eggIds: [eggId]
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.currentUser = data.user;
                FamilyPark.updateUserPoints();
                this.loadEggStorageData(); // 重新加载
                FamilyPark.updateFamilyStats();
            } else {
                FamilyPark.showNotification(data.message || '收集失败', 'error');
            }
        } catch (error) {
            console.error('❌ 收集鸡蛋错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 收集所有鸡蛋
    async collectAllEggs() {
        try {
            if (FamilyPark.familyEggs.length === 0) {
                FamilyPark.showNotification('没有可收集的鸡蛋', 'warning');
                return;
            }
            
            if (!confirm(`确定要收集所有鸡蛋吗？总共${FamilyPark.familyEggs.reduce((sum, egg) => sum + egg.quantity, 0)}个鸡蛋`)) {
                return;
            }
            
            const eggIds = FamilyPark.familyEggs.map(egg => egg._id);
            
            const response = await fetch(`${FamilyPark.getApiBase()}/family/collect-eggs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eggIds: eggIds
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                FamilyPark.showNotification(data.message, 'success');
                FamilyPark.currentUser = data.user;
                FamilyPark.updateUserPoints();
                this.loadEggStorageData(); // 重新加载
                FamilyPark.updateFamilyStats();
            } else {
                FamilyPark.showNotification(data.message || '收集失败', 'error');
            }
        } catch (error) {
            console.error('❌ 收集所有鸡蛋错误:', error);
            FamilyPark.showNotification('网络错误，请稍后重试', 'error');
        }
    }
};

console.log('🥚 鸡蛋仓库模块加载完成');
