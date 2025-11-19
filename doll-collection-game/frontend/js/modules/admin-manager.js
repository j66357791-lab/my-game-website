// 管理员功能模块
const AdminManager = {
    // 初始化
    init() {
        console.log('AdminManager 初始化...');
        // 管理员面板初始化在用户登录后进行
    },

    // API基础URL - 使用 AppState 的配置
    get API_BASE() {
        return AppState.API_BASE + '/admin';
    },

    // 加载管理员数据
    async loadAdminData() {
        const { currentUser } = AppState;
        if (!currentUser || currentUser.role !== 'admin') {
            console.log('非管理员用户，拒绝加载数据');
            return;
        }
        
        console.log('开始加载管理员数据...');
        
        try {
            // 显示加载状态
            this.showLoadingState();
            
            // 并行加载所有数据
            const [usersResponse, dollsResponse, transactionsResponse] = await Promise.all([
                this.fetchWithErrorHandling(`${this.API_BASE}/users`),
                this.fetchWithErrorHandling(`${this.API_BASE}/dolls`),
                this.fetchWithErrorHandling(`${this.API_BASE}/transactions`)
            ]);
            
            // 处理用户数据
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                const allUsers = Array.isArray(usersData.users) ? usersData.users : [];
                AppState.updateState({ allUsers });
                this.updateUsersTable(allUsers);
                console.log('用户数据加载完成:', allUsers.length, '个用户');
            } else {
                console.error('用户数据加载失败:', usersResponse.status);
                this.updateUsersTable([]);
            }
            
            // 处理娃娃数据
            if (dollsResponse.ok) {
                const dollsData = await dollsResponse.json();
                const allDolls = Array.isArray(dollsData.dolls) ? dollsData.dolls : [];
                AppState.updateState({ allDolls });
                this.updateDollsTable(allDolls);
                console.log('娃娃数据加载完成:', allDolls.length, '个娃娃');
            } else {
                console.error('娃娃数据加载失败:', dollsResponse.status);
                this.updateDollsTable([]);
            }
            
            // 处理交易数据
            if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                const allTransactions = Array.isArray(transactionsData.transactions) ? transactionsData.transactions : [];
                this.updateTransactionsTable(allTransactions);
                console.log('交易数据加载完成:', allTransactions.length, '条记录');
            } else {
                console.error('交易数据加载失败:', transactionsResponse.status);
                this.updateTransactionsTable([]);
            }
            
        } catch (error) {
            console.error('加载管理员数据错误:', error);
            this.showErrorState();
        }
    },

    // 带错误处理的fetch
    async fetchWithErrorHandling(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response;
        } catch (error) {
            console.error('网络请求失败:', url, error);
            throw error;
        }
    },

    // 显示加载状态
    showLoadingState() {
        const usersTable = document.getElementById('users-table');
        const dollsTable = document.getElementById('dolls-table');
        const transactionsTable = document.getElementById('transactions-table');
        
        if (usersTable) usersTable.innerHTML = '<tr><td colspan="8">加载中...</td></tr>';
        if (dollsTable) dollsTable.innerHTML = '<tr><td colspan="9">加载中...</td></tr>';
        if (transactionsTable) transactionsTable.innerHTML = '<tr><td colspan="5">加载中...</td></tr>';
    },

    // 显示错误状态
    showErrorState() {
        const usersTable = document.getElementById('users-table');
        const dollsTable = document.getElementById('dolls-table');
        const transactionsTable = document.getElementById('transactions-table');
        
        if (usersTable) usersTable.innerHTML = '<tr><td colspan="8">加载失败，请刷新重试</td></tr>';
        if (dollsTable) dollsTable.innerHTML = '<tr><td colspan="9">加载失败，请刷新重试</td></tr>';
        if (transactionsTable) transactionsTable.innerHTML = '<tr><td colspan="5">加载失败，请刷新重试</td></tr>';
    },

    // 🔧 修复：切换管理员标签页
    switchAdminTab(tabName) {
        console.log('切换到管理员标签页:', tabName);
        
        // 移除所有活动状态
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 添加活动状态到当前标签
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        // 🔧 修复：显示对应内容
        const targetContent = document.getElementById(`admin-${tabName}`);
        if (targetContent) {
            targetContent.classList.add('active');
            console.log('管理员标签页显示成功:', tabName);
        } else {
            console.error('管理员标签页不存在:', `admin-${tabName}`);
        }
        
        // 如果是娃娃管理标签，初始化筛选器
        if (tabName === 'dolls') {
            this.initializeDollFilters();
        }
    },

    // 初始化娃娃筛选器
    initializeDollFilters() {
        const filterContainer = document.getElementById('doll-filters');
        if (!filterContainer) return;
        
        // 如果已经初始化过，就不再重复初始化
        if (filterContainer.children.length > 0) return;
        
        filterContainer.innerHTML = `
            <div class="filter-row">
                <div class="filter-group">
                    <label>级别筛选</label>
                    <select id="doll-level-filter" onchange="AdminManager.updateDollsTable(AppState.allDolls || [])">
                        <option value="all">全部</option>
                        <option value="1">1级</option>
                        <option value="2">2级</option>
                        <option value="3">3级</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>状态筛选</label>
                    <select id="doll-status-filter" onchange="AdminManager.updateDollsTable(AppState.allDolls || [])">
                        <option value="all">全部</option>
                        <option value="active">活跃</option>
                        <option value="inactive">非活跃</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>用户搜索</label>
                    <input type="text" id="doll-user-filter" placeholder="输入用户名" 
                           oninput="AdminManager.updateDollsTable(AppState.allDolls || [])">
                </div>
            </div>
        `;
    },

    // 更新用户表格
    updateUsersTable(users) {
        const usersTable = document.getElementById('users-table');
        if (!usersTable) {
            console.error('users-table 元素不存在');
            return;
        }
        
        usersTable.innerHTML = '';
        
        if (!Array.isArray(users) || users.length === 0) {
            usersTable.innerHTML = '<tr><td colspan="8">暂无用户数据</td></tr>';
            return;
        }
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user._id ? user._id.substring(0, 8) + '...' : '未知ID'}</td>
                <td>${user.username || '未知用户'}</td>
                <td>${user.email || '未知邮箱'}</td>
                <td>${user.points || 0}</td>
                <td>${user.role || 'user'}</td>
                <td>
                    <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
                        ${user.active ? '活跃' : '禁用'}
                    </span>
                </td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知日期'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="AdminManager.editUser('${user._id}')">编辑</button>
                    <button class="btn btn-sm btn-warning" onclick="AdminManager.adjustUserPoints('${user._id}')">积分</button>
                    <button class="btn btn-sm ${user.active ? 'btn-danger' : 'btn-success'}" 
                            onclick="AdminManager.toggleUserStatus('${user._id}')">
                        ${user.active ? '禁用' : '启用'}
                    </button>
                </td>
            `;
            usersTable.appendChild(row);
        });
    },

    // 更新娃娃表格
    updateDollsTable(dolls) {
        const dollsTable = document.getElementById('dolls-table');
        if (!dollsTable) {
            console.error('dolls-table 元素不存在');
            return;
        }
        
        dollsTable.innerHTML = '';
        
        if (!Array.isArray(dolls) || dolls.length === 0) {
            dollsTable.innerHTML = '<tr><td colspan="9">暂无娃娃数据</td></tr>';
            return;
        }
        
        // 获取筛选条件
        const levelFilter = document.getElementById('doll-level-filter')?.value || 'all';
        const statusFilter = document.getElementById('doll-status-filter')?.value || 'all';
        const userFilter = document.getElementById('doll-user-filter')?.value?.toLowerCase() || '';
        
        // 筛选娃娃
        let filteredDolls = dolls.filter(doll => {
            // 等级筛选
            if (levelFilter !== 'all' && doll.level !== parseInt(levelFilter)) {
                return false;
            }
            
            // 状态筛选
            if (statusFilter !== 'all') {
                const isActive = statusFilter === 'active';
                if (doll.active !== isActive) {
                    return false;
                }
            }
            
            // 用户筛选
            if (userFilter && doll.userId) {
                const username = doll.userId.username || doll.userId || '';
                if (!username.toLowerCase().includes(userFilter)) {
                    return false;
                }
            }
            
            return true;
        });
        
        if (filteredDolls.length === 0) {
            dollsTable.innerHTML = '<tr><td colspan="9">没有符合筛选条件的娃娃</td></tr>';
            return;
        }
        
        filteredDolls.forEach(doll => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doll._id ? doll._id.substring(0, 8) + '...' : '未知ID'}</td>
                <td>${doll.userId && doll.userId.username ? doll.userId.username : (doll.userId || '未知用户')}</td>
                <td>
                    <span class="level-badge level-${doll.level}">${doll.level}级</span>
                </td>
                <td>${doll.purchaseDate ? new Date(doll.purchaseDate).toLocaleDateString() : '未知日期'}</td>
                <td>${doll.lifespan || 0}</td>
                <td>${doll.remainingDays || 0}</td>
                <td>${(doll.dailyIncome || 0).toFixed(2)}</td>
                <td>
                    <span class="status-badge ${doll.active ? 'status-active' : 'status-inactive'}">
                        ${doll.active ? '活跃' : '非活跃'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="AdminManager.deleteDoll('${doll._id}')">删除</button>
                </td>
            `;
            dollsTable.appendChild(row);
        });
    },

    // 更新交易表格
    updateTransactionsTable(transactions) {
        const transactionsTable = document.getElementById('transactions-table');
        if (!transactionsTable) {
            console.error('transactions-table 元素不存在');
            return;
        }
        
        transactionsTable.innerHTML = '';
        
        if (!Array.isArray(transactions) || transactions.length === 0) {
            transactionsTable.innerHTML = '<tr><td colspan="5">暂无交易记录</td></tr>';
            return;
        }
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '未知时间'}</td>
                <td>${transaction.userId && transaction.userId.username ? transaction.userId.username : (transaction.userId || '未知用户')}</td>
                <td>${transaction.type || '未知类型'}</td>
                <td>${transaction.amount || 0}</td>
                <td>${transaction.description || '无描述'}</td>
            `;
            transactionsTable.appendChild(row);
        });
    },

    // 其他方法保持简化实现
    adjustUserPoints(userId) {
        console.log('调整用户积分:', userId);
        alert('调整积分功能开发中');
    },

    toggleUserStatus(userId) {
        console.log('切换用户状态:', userId);
        alert('切换用户状态功能开发中');
    },

    editUser(userId) {
        console.log('编辑用户:', userId);
        alert('编辑用户功能开发中');
    },

    deleteDoll(dollId) {
        console.log('删除娃娃:', dollId);
        alert('删除娃娃功能开发中');
    },

    showBatchGrantModal() {
        console.log('显示批量发放积分模态框');
        alert('批量发放积分功能开发中');
    },

    createUser() {
        console.log('创建用户');
        alert('创建用户功能开发中');
    },

    updateDollPrices() {
        console.log('更新娃娃价格');
        alert('更新娃娃价格功能开发中');
    },

    calculateDailyIncome() {
        console.log('计算今日收益');
        alert('计算今日收益功能开发中');
    },

    resetSystem() {
        console.log('重置系统');
        alert('重置系统功能开发中');
    }
};

// 导出到全局作用域
window.AdminManager = AdminManager;
