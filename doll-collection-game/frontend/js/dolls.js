// 娃娃相关功能
const Dolls = {
    // 加载用户数据
    async loadUserData() {
        if (!currentUser) return;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/dolls/my-dolls`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('从API获取的娃娃数据:', data.dolls);
                userDolls = Array.isArray(data.dolls) ? data.dolls : [];
                Dolls.updateUserStats();
                Dolls.updateMyDollsList();
                Dolls.updateBackpackDisplay();
                Dolls.updateBackpackStats(userDolls.length, userDolls.length);
            }
        } catch (error) {
            console.error('加载用户数据错误:', error);
        }
    },
    
    // 更新用户统计信息
    updateUserStats() {
        if (!userDolls || !Array.isArray(userDolls)) {
            console.error('userDolls不是有效的数组:', userDolls);
            Dolls.resetStats();
            return;
        }
        
        const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
        
        const totalDolls = validDolls.length;
        const activeDolls = validDolls.filter(doll => doll.active).length;
        const dailyIncome = validDolls.reduce((sum, doll) => {
            return sum + (doll.active ? (doll.dailyIncome || 0) : 0);
        }, 0);
        
        const avgLifespan = totalDolls > 0 ? 
            validDolls.reduce((sum, doll) => sum + (doll.lifespan || 0), 0) / totalDolls : 0;
        
        // 更新UI
        const elements = {
            'total-dolls': totalDolls,
            'active-dolls': activeDolls,
            'daily-income': dailyIncome.toFixed(2),
            'avg-lifespan': Math.round(avgLifespan),
            'expected-payout': dailyIncome.toFixed(2)
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
        
        // 计算分级收益
        const level1Income = validDolls
            .filter(doll => doll.level === 1 && doll.active)
            .reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
        const level2Income = validDolls
            .filter(doll => doll.level === 2 && doll.active)
            .reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
        const level3Income = validDolls
            .filter(doll => doll.level === 3 && doll.active)
            .reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
            
        const levelElements = {
            'level1-income': level1Income.toFixed(2),
            'level2-income': level2Income.toFixed(2),
            'level3-income': level3Income.toFixed(2)
        };
        
        Object.keys(levelElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = levelElements[id];
            }
        });
    },
    
    // 重置统计信息
    resetStats() {
        const elements = [
            'total-dolls', 'active-dolls', 'daily-income', 
            'avg-lifespan', 'expected-payout', 'level1-income', 
            'level2-income', 'level3-income'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = id.includes('income') || id === 'expected-payout' ? '0.00' : '0';
            }
        });
    },
    
    // 更新我的娃娃列表
    updateMyDollsList() {
        const myDollsContainer = document.getElementById('my-dolls');
        if (!myDollsContainer) return;
        
        myDollsContainer.innerHTML = '';
        
        if (!userDolls || !Array.isArray(userDolls)) {
            myDollsContainer.innerHTML = '<p>数据加载中...</p>';
            return;
        }
        
        const validDolls = userDolls.filter(doll => doll && typeof doll === 'object');
        
        if (validDolls.length === 0) {
            myDollsContainer.innerHTML = '<p>您还没有任何娃娃，快去购买吧！</p>';
            return;
        }
        
        validDolls.forEach(doll => {
            const dollCard = document.createElement('div');
            dollCard.className = 'doll-card';
            dollCard.innerHTML = `
                <div class="doll-header">
                    <h3>${doll.level}级娃娃</h3>
                    <div class="doll-level">ID: ${doll._id ? doll._id.substring(0, 8) + '...' : '未知'}</div>
                </div>
                <div class="doll-body">
                    <div class="doll-feature">
                        <i class="fas fa-gem"></i>
                        <span>每日收益 ${doll.dailyIncome || 0} 积分</span>
                    </div>
                    <div class="doll-feature">
                        <i class="fas fa-clock"></i>
                        <span>剩余 ${doll.remainingDays || 0} 天</span>
                    </div>
                    <div class="doll-feature">
                        <i class="fas fa-calendar"></i>
                        <span>购买日期 ${Utils.formatDate(doll.purchaseDate)}</span>
                    </div>
                    <div class="doll-feature">
                        <i class="fas fa-power-off"></i>
                        <span>状态: ${doll.active ? '活跃' : '非活跃'}</span>
                    </div>
                </div>
            `;
            myDollsContainer.appendChild(dollCard);
        });
    },
    
    // 购买娃娃
    async buyDoll(level) {
        if (!currentUser) {
            Auth.showLoginModal();
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/dolls/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ level })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                currentUser.points = data.user.points;
                
                if (data.doll && typeof data.doll === 'object') {
                    userDolls.push(data.doll);
                }
                
                UI.updateUI();
                Dolls.updateUserStats();
                Dolls.updateMyDollsList();
                Dolls.updateBackpackDisplay();
                Dolls.updateBackpackStats(userDolls.length, userDolls.length);
                Utils.showNotification(`成功购买${level}级娃娃！`, 'success');
            } else {
                Utils.showNotification(data.message || '购买失败', 'error');
            }
        } catch (error) {
            console.error('购买娃娃错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 背包筛选功能
    filterBackpackDolls() {
        if (!userDolls || !Array.isArray(userDolls)) {
            console.error('userDolls不是有效的数组:', userDolls);
            Dolls.updateBackpackDisplay();
            Dolls.updateBackpackStats(0, 0);
            return;
        }
        
        const levelFilter = document.getElementById('backpack-level-filter')?.value || 'all';
        const statusFilter = document.getElementById('backpack-status-filter')?.value || 'all';
        const sortFilter = document.getElementById('backpack-sort-filter')?.value || 'newest';
        
        let filteredDolls = [...userDolls];
        
        // 应用筛选条件
        if (levelFilter !== 'all') {
            filteredDolls = filteredDolls.filter(doll => doll.level === parseInt(levelFilter));
        }
        
        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'active';
            filteredDolls = filteredDolls.filter(doll => doll.active === isActive);
        }
        
        // 应用排序
        switch (sortFilter) {
            case 'newest':
                filteredDolls.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
                break;
            case 'oldest':
                filteredDolls.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
                break;
            case 'level-desc':
                filteredDolls.sort((a, b) => b.level - a.level);
                break;
            case 'level-asc':
                filteredDolls.sort((a, b) => a.level - b.level);
                break;
            case 'income-desc':
                filteredDolls.sort((a, b) => (b.dailyIncome || 0) - (a.dailyIncome || 0));
                break;
            case 'income-asc':
                filteredDolls.sort((a, b) => (a.dailyIncome || 0) - (b.dailyIncome || 0));
                break;
        }
        
        Dolls.updateBackpackDisplay(filteredDolls);
        Dolls.updateBackpackStats(userDolls.length, filteredDolls.length);
    },
    
    // 重置背包筛选器
    resetBackpackFilters() {
        document.getElementById('backpack-level-filter').value = 'all';
        document.getElementById('backpack-status-filter').value = 'all';
        document.getElementById('backpack-sort-filter').value = 'newest';
        Dolls.filterBackpackDolls();
    },
    
    // 更新背包显示
    updateBackpackDisplay(dolls = null) {
        const backpackGrid = document.getElementById('my-dolls');
        if (!backpackGrid) return;
        
        backpackGrid.innerHTML = '';
        
        const dollsToDisplay = dolls || userDolls;
        
        if (!dollsToDisplay || !Array.isArray(dollsToDisplay)) {
            backpackGrid.innerHTML = '<p>您还没有任何娃娃，快去购买吧！</p>';
            return;
        }
        
        if (dollsToDisplay.length === 0) {
            backpackGrid.innerHTML = '<p>您还没有任何娃娃，快去购买吧！</p>';
            return;
        }
        
        dollsToDisplay.forEach((doll, index) => {
            const backpackItem = document.createElement('div');
            backpackItem.className = `backpack-item ${!doll.active ? 'inactive' : ''}`;
            backpackItem.innerHTML = `
                <div class="backpack-item-header level-${doll.level}">
                    <div class="backpack-item-title">${doll.level}级娃娃</div>
                    <div class="backpack-item-id">ID: ${doll._id ? doll._id.substring(0, 8) + '...' : '未知'}</div>
                    <div class="backpack-item-status">${doll.active ? '活跃' : '非活跃'}</div>
                </div>
                <div class="backpack-item-body">
                    <div class="backpack-item-info">
                        <div class="backpack-item-info-item">
                            <i class="fas fa-gem"></i>
                            <span>每日收益 ${doll.dailyIncome || 0} 积分</span>
                        </div>
                        <div class="backpack-item-info-item">
                            <i class="fas fa-clock"></i>
                            <span>剩余 ${doll.remainingDays || 0} 天</span>
                        </div>
                        <div class="backpack-item-info-item">
                            <i class="fas fa-calendar"></i>
                            <span>购买日期 ${Utils.formatDate(doll.purchaseDate)}</span>
                        </div>
                    </div>
                    <div class="backpack-item-income">
                        <i class="fas fa-coins"></i>
                        每日收益: ${doll.dailyIncome || 0} 积分
                    </div>
                    <div class="backpack-item-actions">
                        ${doll.active ? 
                            `<button class="btn btn-sm btn-success" onclick="Dolls.activateDoll('${doll._id}')">激活</button>` :
                            `<button class="btn btn-sm btn-warning" onclick="Dolls.activateDoll('${doll._id}')">激活</button>`
                        }
                        <button class="btn btn-sm btn-danger" onclick="Dolls.sellDoll('${doll._id}')">出售</button>
                    </div>
                </div>
            `;
            backpackItem.style.animationDelay = `${index * 0.05}s`;
            backpackGrid.appendChild(backpackItem);
        });
    },
    
    // 更新背包统计
    updateBackpackStats(total, filtered) {
        const totalElement = document.getElementById('backpack-total');
        const filteredElement = document.getElementById('backpack-filtered');
        const valueElement = document.getElementById('backpack-total-value');
        
        if (totalElement) totalElement.textContent = total;
        if (filteredElement) filteredElement.textContent = filtered;
        if (valueElement) {
            const totalValue = userDolls.reduce((sum, doll) => {
                return sum + (doll.level === 1 ? CONFIG.DOLL_PRICES[1] : doll.level === 2 ? CONFIG.DOLL_PRICES[2] : doll.level === 3 ? CONFIG.DOLL_PRICES[3] : 0);
            }, 0);
            valueElement.textContent = `${totalValue} 积分`;
        }
    },
    
    // 激活娃娃
    async activateDoll(dollId) {
        if (!currentUser) {
            Auth.showLoginModal();
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/dolls/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ dollId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification('娃娃激活成功！', 'success');
                Dolls.loadUserData();
            } else {
                Utils.showNotification(data.message || '激活失败', 'error');
            }
        } catch (error) {
            console.error('激活娃娃错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 出售娃娃
    async sellDoll(dollId) {
        const doll = userDolls.find(d => d._id === dollId);
        if (!doll) return;
        
        const sellPrice = doll.level === 1 ? 25 : doll.level === 2 ? 100 : 250;
        
        if (!confirm(`确定要以 ${sellPrice} 积分的价格出售这个${doll.level}级娃娃吗？此操作不可恢复！`)) {
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/dolls/sell`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ dollId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                currentUser.points = data.user.points;
                UI.updateUI();
                Dolls.loadUserData();
                Utils.showNotification(`娃娃出售成功！获得 ${sellPrice} 积分`, 'success');
            } else {
                Utils.showNotification(data.message || '出售失败', 'error');
            }
        } catch (error) {
            console.error('出售娃娃错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 初始化娃娃事件监听器
    initEventListeners() {
        // 购买按钮
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const level = parseInt(this.getAttribute('data-level'));
                Dolls.buyDoll(level);
            });
        });
        
        // 背包筛选器
        const levelFilter = document.getElementById('backpack-level-filter');
        const statusFilter = document.getElementById('backpack-status-filter');
        const sortFilter = document.getElementById('backpack-sort-filter');
        
        if (levelFilter) levelFilter.addEventListener('change', Dolls.filterBackpackDolls);
        if (statusFilter) statusFilter.addEventListener('change', Dolls.filterBackpackDolls);
        if (sortFilter) sortFilter.addEventListener('change', Dolls.filterBackpackDolls);
    }
};
