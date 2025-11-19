// 用户数据管理模块
const UserDataManager = {
    // 加载用户数据
    async loadUserData() {
        const { currentUser } = AppState;
        if (!currentUser) return;
        
        try {
            // 获取用户娃娃
            const response = await fetch(`${AppState.API_BASE}/dolls/my-dolls`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('从API获取的娃娃数据:', data.dolls);
                const userDolls = Array.isArray(data.dolls) ? data.dolls : [];
                AppState.updateState({ userDolls });
                this.updateUserStats();
                this.updateMyDollsList();
            }
            
            // 获取交易记录
            this.showTransactionHistory();
            
        } catch (error) {
            console.error('加载用户数据错误:', error);
        }
    },

    // 显示交易记录
    async showTransactionHistory() {
        const { currentUser } = AppState;
        if (!currentUser) return;
        
        try {
            const response = await fetch(`${AppState.API_BASE}/transactions/my-transactions`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                UIManager.updateTransactionHistory(data.transactions);
            }
        } catch (error) {
            console.error('获取交易记录错误:', error);
        }
    },

    // 更新用户统计信息
    updateUserStats() {
        const { userDolls } = AppState;
        
        if (!userDolls || !Array.isArray(userDolls)) {
            console.error('userDolls不是有效的数组:', userDolls);
            this.resetStats();
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
        const { userDolls } = AppState;
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
                        <span>购买日期 ${doll.purchaseDate ? new Date(doll.purchaseDate).toLocaleDateString() : '未知日期'}</span>
                    </div>
                    <div class="doll-feature">
                        <i class="fas fa-power-off"></i>
                        <span>状态: ${doll.active ? '活跃' : '非活跃'}</span>
                    </div>
                </div>
            `;
            myDollsContainer.appendChild(dollCard);
        });
    }
};

// 导出到全局作用域
window.UserDataManager = UserDataManager;
