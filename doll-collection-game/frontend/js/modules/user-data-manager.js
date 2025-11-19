// 用户数据管理模块
const UserDataManager = {
    // 初始化
    init() {
        this.updateUserStats();
        this.updateMyDollsList();
        this.showTransactionHistory();
        this.initializeFilters();
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
            <div class="batch-actions" id="batch-actions" style="display: none;">
                <button class="btn btn-danger" onclick="UserDataManager.batchDelete()">删除选中</button>
                <button class="btn btn-secondary" onclick="UserDataManager.selectAll()">全选</button>
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

    // 创建娃娃卡片（新增删除功能）
    createDollCard(doll) {
        const dollCard = document.createElement('div');
        dollCard.className = 'doll-card';
        dollCard.dataset.dollId = doll._id;
        
        dollCard.innerHTML = `
            <div class="doll-header">
                <h3>${doll.level}级娃娃</h3>
                <div class="doll-actions">
                    <input type="checkbox" class="doll-checkbox" onchange="UserDataManager.toggleBatchActions()">
                    <button class="btn-delete" onclick="UserDataManager.confirmDelete('${doll._id}')" title="删除娃娃">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="doll-level">ID: ${doll._id ? doll._id.substring(0, 8) + '...' : '未知'}</div>
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

    // 确认删除娃娃
    confirmDelete(dollId) {
        const { userDolls } = AppState;
        const doll = userDolls.find(d => d._id === dollId);
        
        if (!doll) {
            alert('娃娃不存在！');
            return;
        }

        const confirmMessage = `确定要删除这个娃娃吗？\n\n` +
            `级别：${doll.level}级娃娃\n` +
            `每日收益：${doll.dailyIncome} 积分\n` +
            `剩余天数：${doll.remainingDays} 天\n` +
            `状态：${doll.active ? '活跃' : '非活跃'}\n\n` +
            `删除后将无法恢复！`;

        if (confirm(confirmMessage)) {
            this.deleteDoll(dollId);
        }
    },

    // 删除娃娃
    async deleteDoll(dollId) {
        try {
            const response = await fetch(`${AppState.API_BASE}/dolls/${dollId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                // 更新本地数据
                const { userDolls } = AppState;
                const updatedDolls = userDolls.filter(doll => doll._id !== dollId);
                AppState.updateState({ userDolls: updatedDolls });

                // 刷新显示
                this.updateUserStats();
                this.applyFilters(); // 重新应用筛选
                
                alert('娃娃删除成功！');
            } else {
                alert(data.message || '删除失败');
            }
        } catch (error) {
            console.error('删除娃娃错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 切换批量操作显示
    toggleBatchActions() {
        const checkboxes = document.querySelectorAll('.doll-checkbox:checked');
        const batchActions = document.getElementById('batch-actions');
        
        if (checkboxes.length > 0) {
            batchActions.style.display = 'block';
        } else {
            batchActions.style.display = 'none';
        }
    },

    // 全选/取消全选
    selectAll() {
        const checkboxes = document.querySelectorAll('.doll-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        this.toggleBatchActions();
    },

    // 批量删除
    batchDelete() {
        const checkboxes = document.querySelectorAll('.doll-checkbox:checked');
        const dollIds = Array.from(checkboxes).map(cb => cb.closest('.doll-card').dataset.dollId);
        
        if (dollIds.length === 0) {
            alert('请选择要删除的娃娃！');
            return;
        }

        const confirmMessage = `确定要删除选中的 ${dollIds.length} 个娃娃吗？\n\n删除后将无法恢复！`;
        
        if (confirm(confirmMessage)) {
            this.batchDeleteDolls(dollIds);
        }
    },

    // 执行批量删除
    async batchDeleteDolls(dollIds) {
        try {
            const response = await fetch(`${AppState.API_BASE}/dolls/batch-delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ dollIds })
            });

            const data = await response.json();

            if (response.ok) {
                // 更新本地数据
                const { userDolls } = AppState;
                const updatedDolls = userDolls.filter(doll => !dollIds.includes(doll._id));
                AppState.updateState({ userDolls: updatedDolls });

                // 刷新显示
                this.updateUserStats();
                this.applyFilters();
                
                alert(`成功删除 ${data.deletedCount} 个娃娃！`);
            } else {
                alert(data.message || '批量删除失败');
            }
        } catch (error) {
            console.error('批量删除错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 重置筛选
    resetFilters() {
        document.getElementById('level-filter').value = 'all';
        document.getElementById('status-filter').value = 'all';
        document.getElementById('date-filter').value = 'all';
        
        // 清除所有复选框
        document.querySelectorAll('.doll-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('batch-actions').style.display = 'none';
        
        this.applyFilters();
    },

    // 更新我的娃娃列表（修改原方法）
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
        document.getElementById('filter-count').textContent = `共 ${validDolls.length} 个娃娃`;
    },

    // 其他现有方法保持不变...
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
