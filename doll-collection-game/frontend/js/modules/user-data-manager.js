// 用户数据管理模块
const UserDataManager = {
    // 初始化
    init() {
        this.updateUserStats();
        this.updateMyDollsList();
        this.showTransactionHistory();
        this.initializeFilters();
    },

    // 🔧 新增：加载用户娃娃数据
    async loadUserDolls() {
        const { currentUser } = AppState;
        if (!currentUser) {
            console.log('用户未登录，无法加载娃娃数据');
            return;
        }

        try {
            console.log('开始加载用户娃娃数据...');
            const response = await fetch(`${AppState.API_BASE}/dolls/my-dolls`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                AppState.updateState({ userDolls: data.dolls || [] });
                console.log('用户娃娃数据加载完成:', data.dolls);
            } else {
                console.error('加载娃娃数据失败:', response.status);
                AppState.updateState({ userDolls: [] });
            }
        } catch (error) {
            console.error('加载娃娃数据错误:', error);
            AppState.updateState({ userDolls: [] });
        }
    },

    // 初始化筛选功能
    initializeFilters() {
        // 创建筛选控件
        const myDollsSection = document.querySelector('.my-dolls-section');
        if (!myDollsSection) return;

        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-container';
        filterContainer.innerHTML = `
            <div class="filter-controls">
                <div class="filter-group">
                    <label>级别筛选:</label>
                    <select id="level-filter">
                        <option value="all">全部</option>
                        <option value="1">1级</option>
                        <option value="2">2级</option>
                        <option value="3">3级</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>状态筛选:</label>
                    <select id="status-filter">
                        <option value="all">全部</option>
                        <option value="active">活跃</option>
                        <option value="inactive">非活跃</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>购买日期:</label>
                    <select id="date-filter">
                        <option value="all">全部</option>
                        <option value="7">最近7天</option>
                        <option value="30">最近30天</option>
                        <option value="custom">自定义</option>
                    </select>
                </div>
                <div class="filter-group">
                    <button class="btn btn-secondary" onclick="UserDataManager.resetFilters()">重置</button>
                </div>
                <div class="filter-results">
                    <span id="filter-count">共 0 个娃娃</span>
                </div>
            </div>
        `;

        // 插入到标题下方
        const titleElement = myDollsSection.querySelector('h2');
        if (titleElement) {
            titleElement.insertAdjacentElement('afterend', filterContainer);
        }

        // 绑定筛选事件
        document.getElementById('level-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('status-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('date-filter').addEventListener('change', () => this.applyFilters());
    },

    // 应用筛选
    applyFilters() {
        const { userDolls } = AppState;
        if (!userDolls || !Array.isArray(userDolls)) return;

        const levelFilter = document.getElementById('level-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        const dateFilter = document.getElementById('date-filter').value;

        let filteredDolls = userDolls.filter(doll => doll && typeof doll === 'object');

        // 级别筛选
        if (levelFilter !== 'all') {
            filteredDolls = filteredDolls.filter(doll => doll.level === parseInt(levelFilter));
        }

        // 状态筛选
        if (statusFilter === 'active') {
            filteredDolls = filteredDolls.filter(doll => doll.active);
        } else if (statusFilter === 'inactive') {
            filteredDolls = filteredDolls.filter(doll => !doll.active);
        }

        // 日期筛选
        if (dateFilter !== 'all') {
            const now = new Date();
            const daysAgo = parseInt(dateFilter);
            const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            
            filteredDolls = filteredDolls.filter(doll => {
                const purchaseDate = new Date(doll.purchaseDate);
                return purchaseDate >= cutoffDate;
            });
        }

        // 更新显示
        this.renderFilteredDolls(filteredDolls);
        
        // 更新计数
        document.getElementById('filter-count').textContent = `共 ${filteredDolls.length} 个娃娃`;
    },

    // 渲染筛选后的娃娃列表
    renderFilteredDolls(dolls) {
        const myDollsContainer = document.getElementById('my-dolls');
        if (!myDollsContainer) return;

        myDollsContainer.innerHTML = '';

        if (dolls.length === 0) {
            myDollsContainer.innerHTML = '<p>没有符合条件的娃娃！</p>';
            return;
        }

        dolls.forEach(doll => {
            const dollCard = this.createDollCard(doll);
            myDollsContainer.appendChild(dollCard);
        });
    },

    // 创建娃娃卡片
    createDollCard(doll) {
        const dollCard = document.createElement('div');
        dollCard.className = 'doll-card';
        dollCard.dataset.dollId = doll._id;
        
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
                    <i class="fas fa-hourglass-half"></i>
                    <span>总寿命 ${doll.lifespan || 0} 天</span>
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

        return dollCard;
    },

    // 重置筛选
    resetFilters() {
        document.getElementById('level-filter').value = 'all';
        document.getElementById('status-filter').value = 'all';
        document.getElementById('date-filter').value = 'all';
        
        this.applyFilters();
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
            const dollCard = this.createDollCard(doll);
            myDollsContainer.appendChild(dollCard);
        });

        // 更新筛选计数
        const filterCount = document.getElementById('filter-count');
        if (filterCount) {
            filterCount.textContent = `共 ${validDolls.length} 个娃娃`;
        }
    },

    // 更新用户统计
    updateUserStats() {
        const { currentUser, userDolls } = AppState;
        
        if (!currentUser) return;
        
        const statsContainer = document.getElementById('user-stats');
        if (!statsContainer) return;
        
        const totalDolls = userDolls ? userDolls.length : 0;
        const activeDolls = userDolls ? userDolls.filter(doll => doll.active).length : 0;
        const totalDailyIncome = userDolls ? 
            userDolls.filter(doll => doll.active).reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0) : 0;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <i class="fas fa-doll"></i>
                <div class="stat-info">
                    <span class="stat-value">${totalDolls}</span>
                    <span class="stat-label">总娃娃数</span>
                </div>
            </div>
            <div class="stat-item">
                <i class="fas fa-check-circle"></i>
                <div class="stat-info">
                    <span class="stat-value">${activeDolls}</span>
                    <span class="stat-label">活跃娃娃</span>
                </div>
            </div>
            <div class="stat-item">
                <i class="fas fa-coins"></i>
                <div class="stat-info">
                    <span class="stat-value">${totalDailyIncome}</span>
                    <span class="stat-label">每日收益</span>
                </div>
            </div>
            <div class="stat-item">
                <i class="fas fa-wallet"></i>
                <div class="stat-info">
                    <span class="stat-value">${currentUser.points || 0}</span>
                    <span class="stat-label">当前积分</span>
                </div>
            </div>
        `;
    },

    // 显示交易记录
    showTransactionHistory() {
        const { currentUser } = AppState;
        const historyContainer = document.getElementById('transaction-history');
        if (!historyContainer) return;
        
        if (!currentUser || !currentUser.transactionHistory || currentUser.transactionHistory.length === 0) {
            historyContainer.innerHTML = '<p>暂无交易记录</p>';
            return;
        }
        
        const recentTransactions = currentUser.transactionHistory.slice(-10).reverse();
        
        historyContainer.innerHTML = recentTransactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <span class="transaction-type">${transaction.type}</span>
                    <span class="transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                        ${transaction.amount >= 0 ? '+' : ''}${transaction.amount}
                    </span>
                </div>
                <div class="transaction-date">
                    ${new Date(transaction.date).toLocaleString()}
                </div>
            </div>
        `).join('');
    }
};

// 导出到全局作用域
window.UserDataManager = UserDataManager;
