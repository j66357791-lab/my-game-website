// 管理员功能 - 完整修复版本
const Admin = {
    // 加载管理员数据
    async loadAdminData() {
        if (!currentUser || currentUser.role !== 'admin') {
            Utils.showNotification('您没有管理员权限！', 'error');
            return;
        }
        
        try {
            console.log('🔧 开始加载管理员数据...');
            
            // 获取所有用户
            const usersResponse = await fetch(`${CONFIG.API_BASE}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                allUsers = Array.isArray(usersData.users) ? usersData.users : [];
                Admin.updateUsersTable();
            }
            
            // 获取所有娃娃
            const dollsResponse = await fetch(`${CONFIG.API_BASE}/admin/dolls`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (dollsResponse.ok) {
                const dollsData = await dollsResponse.json();
                Admin.updateDollsTable(Array.isArray(dollsData.dolls) ? dollsData.dolls : []);
                Admin.loadDollFilters();
            }
            
            // 获取交易记录
            await Admin.loadTransactions();
            
            // 获取商人数据
            await Admin.loadMerchantList();
            
            // 获取系统配置
            const configResponse = await fetch(`${CONFIG.API_BASE}/admin/system-config`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (configResponse.ok) {
                const configData = await configResponse.json();
                // 更新价格输入框
                const level1PriceInput = document.getElementById('level1-price');
                const level2PriceInput = document.getElementById('level2-price');
                const level3PriceInput = document.getElementById('level3-price');
                
                if (level1PriceInput) level1PriceInput.value = configData.config.dollPrices[1] || CONFIG.DOLL_PRICES[1];
                if (level2PriceInput) level2PriceInput.value = configData.config.dollPrices[2] || CONFIG.DOLL_PRICES[2];
                if (level3PriceInput) level3PriceInput.value = configData.config.dollPrices[3] || CONFIG.DOLL_PRICES[3];
            }
            
            console.log('🔧 管理员数据加载完成');
            
        } catch (error) {
            console.error('🔧 加载管理员数据错误:', error);
            Utils.showNotification('加载管理员数据失败: ' + error.message, 'error');
        }
    },
    
    // 更新用户表格（增强版）
    updateUsersTable() {
        const usersTable = document.getElementById('users-table');
        if (!usersTable) return;
        
        usersTable.innerHTML = '';
        
        if (!Array.isArray(allUsers)) {
            usersTable.innerHTML = '<tr><td colspan="9">暂无用户数据</td></tr>';
            return;
        }
        
        allUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user._id ? user._id.substring(0, 8) + '...' : '未知ID'}</td>
                <td>${user.username || '未知用户'}</td>
                <td>${user.email || '未知邮箱'}</td>
                <td>${user.points || 0}</td>
                <td>
                    <span class="user-role">
                        <span class="role-badge ${user.role}">
                            ${user.role === 'merchant' ? '<i class="fas fa-crown"></i> 商人' : user.role === 'admin' ? '<i class="fas fa-user-shield"></i> 管理员' : '<i class="fas fa-user"></i> 用户'}
                        </span>
                    </span>
                </td>
                <td>
                    <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
                        ${user.active ? '活跃' : '禁用'}
                    </span>
                </td>
                <td>${Utils.formatDate(user.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="Admin.editUser('${user._id}')">编辑</button>
                    <button class="btn btn-sm btn-warning" onclick="Admin.adjustUserPoints('${user._id}')">积分</button>
                    <button class="btn btn-sm ${user.active ? 'btn-danger' : 'btn-success'}" 
                            onclick="Admin.toggleUserStatus('${user._id}')">
                        ${user.active ? '禁用' : '启用'}
                    </button>
                    <button class="btn btn-sm ${user.role === 'merchant' ? 'btn-warning' : 'btn-secondary'}" 
                            onclick="${user.role === 'merchant' ? 'Admin.revokeMerchant' : 'Admin.appointMerchant'}('${user._id}')">
                        ${user.role === 'merchant' ? '撤销商人' : '任命商人'}
                    </button>
                </td>
            `;
            usersTable.appendChild(row);
        });
    },
    
    // 更新娃娃表格
    updateDollsTable(dolls) {
        const dollsTable = document.getElementById('dolls-table');
        if (!dollsTable) return;
        
        dollsTable.innerHTML = '';
        
        if (!Array.isArray(dolls) || dolls.length === 0) {
            dollsTable.innerHTML = '<tr><td colspan="8">暂无娃娃数据</td></tr>';
            return;
        }
        
        dolls.forEach(doll => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doll._id ? doll._id.substring(0, 8) + '...' : '未知ID'}</td>
                <td>${doll.userId ? (doll.userId.username || doll.userId._id.substring(0, 8) + '...') : '未知用户'}</td>
                <td>${doll.level}级</td>
                <td>${Utils.formatDate(doll.purchaseDate)}</td>
                <td>${doll.remainingDays || 0} 天</td>
                <td>${doll.dailyIncome || 0} 积分</td>
                <td>
                    <span class="status-badge ${doll.active ? 'status-active' : 'status-inactive'}">
                        ${doll.active ? '活跃' : '非活跃'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="Admin.deleteDoll('${doll._id}')">删除</button>
                </td>
            `;
            dollsTable.appendChild(row);
        });
    },
    
    // 加载娃娃筛选器
    loadDollFilters() {
        const filtersContainer = document.getElementById('doll-filters');
        if (!filtersContainer) return;
        
        filtersContainer.innerHTML = `
            <div class="filter-group">
                <label>等级筛选:</label>
                <select id="doll-level-filter" class="form-control" onchange="Admin.filterDolls()">
                    <option value="all">全部等级</option>
                    <option value="1">1级</option>
                    <option value="2">2级</option>
                    <option value="3">3级</option>
                </select>
            </div>
            <div class="filter-group">
                <label>状态筛选:</label>
                <select id="doll-status-filter" class="form-control" onchange="Admin.filterDolls()">
                    <option value="all">全部状态</option>
                    <option value="active">活跃</option>
                    <option value="inactive">非活跃</option>
                </select>
            </div>
            <div class="filter-group">
                <label>&nbsp;</label>
                <button class="btn btn-secondary" onclick="Admin.resetDollFilters()">重置筛选</button>
            </div>
        `;
    },
    
    // 筛选娃娃
    filterDolls() {
        const levelFilter = document.getElementById('doll-level-filter')?.value || 'all';
        const statusFilter = document.getElementById('doll-status-filter')?.value || 'all';
        
        const allDollsRows = document.querySelectorAll('#dolls-table tr');
        
        allDollsRows.forEach(row => {
            const level = row.cells[2]?.textContent || '';
            const status = row.cells[6]?.textContent || '';
            
            let showRow = true;
            
            if (levelFilter !== 'all' && !level.includes(levelFilter + '级')) {
                showRow = false;
            }
            
            if (statusFilter !== 'all' && !status.includes(statusFilter === 'active' ? '活跃' : '非活跃')) {
                showRow = false;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    },
    
    // 重置娃娃筛选器
    resetDollFilters() {
        const levelFilter = document.getElementById('doll-level-filter');
        const statusFilter = document.getElementById('doll-status-filter');
        
        if (levelFilter) levelFilter.value = 'all';
        if (statusFilter) statusFilter.value = 'all';
        
        Admin.filterDolls();
    },
    
    // 加载交易记录
    async loadTransactions() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/transactions`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                Admin.updateTransactionsTable(Array.isArray(data.transactions) ? data.transactions : []);
            } else {
                console.error('获取交易记录失败');
                Admin.updateTransactionsTable([]);
            }
        } catch (error) {
            console.error('加载交易记录错误:', error);
            Admin.updateTransactionsTable([]);
        }
    },
    
    // 更新交易记录表格
    updateTransactionsTable(transactions) {
        const transactionsTable = document.getElementById('transactions-table');
        if (!transactionsTable) return;
        
        transactionsTable.innerHTML = '';
        
        if (!Array.isArray(transactions) || transactions.length === 0) {
            transactionsTable.innerHTML = '<tr><td colspan="5">暂无交易记录</td></tr>';
            return;
        }
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDateTime(transaction.createdAt)}</td>
                <td>${transaction.userId ? (transaction.userId.username || '未知用户') : '未知用户'}</td>
                <td>
                    <span class="transaction-type ${transaction.type}">
                        ${Admin.getTransactionTypeText(transaction.type)}
                    </span>
                </td>
                <td>
                    <span class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                        ${transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)} 积分
                    </span>
                </td>
                <td>${transaction.description || '无描述'}</td>
            `;
            transactionsTable.appendChild(row);
        });
    },
    
    // 获取交易类型文本
    getTransactionTypeText(type) {
        const typeMap = {
            'purchase': '购买',
            'sell': '出售',
            'transfer': '转增',
            'synthesis': '合成',
            'income': '收益',
            'admin_grant': '管理员操作',
            'admin_adjust': '管理员调整'
        };
        return typeMap[type] || type;
    },
    
    // 加载商人列表
    async loadMerchantList() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/merchants`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                Admin.updateMerchantList(data.merchants || [], data.stats || {});
            } else {
                console.error('获取商人列表失败');
                Admin.updateMerchantList([], {});
            }
        } catch (error) {
            console.error('加载商人列表错误:', error);
            Admin.updateMerchantList([], {});
        }
    },
    
    // 更新商人列表
    updateMerchantList(merchants, stats) {
        // 更新统计信息
        const totalMerchantsElement = document.getElementById('total-merchants');
        const todayTransfersElement = document.getElementById('today-transfers');
        const totalMerchantEarningsElement = document.getElementById('total-merchant-earnings');
        
        if (totalMerchantsElement) totalMerchantsElement.textContent = stats.totalMerchants || 0;
        if (todayTransfersElement) todayTransfersElement.textContent = stats.todayTransfers || 0;
        if (totalMerchantEarningsElement) totalMerchantEarningsElement.textContent = (stats.totalMerchantEarnings || 0).toFixed(2);
        
        // 更新商人列表
        const merchantList = document.getElementById('merchant-list');
        if (!merchantList) return;
        
        merchantList.innerHTML = '';
        
        if (!Array.isArray(merchants) || merchants.length === 0) {
            merchantList.innerHTML = '<p>暂无商人</p>';
            return;
        }
        
        merchants.forEach(merchant => {
            const merchantCard = document.createElement('div');
            merchantCard.className = 'merchant-card';
            merchantCard.innerHTML = `
                <div class="merchant-header">
                    <div class="merchant-name">
                        <i class="fas fa-crown"></i> ${merchant.username}
                    </div>
                    <div class="merchant-email">${merchant.email}</div>
                </div>
                <div class="merchant-stats">
                    <div class="merchant-stat">
                        <span class="stat-label">积分:</span>
                        <span class="stat-value">${merchant.points || 0}</span>
                    </div>
                    <div class="merchant-stat">
                        <span class="stat-label">总收益:</span>
                        <span class="stat-value">${(merchant.merchantData?.totalEarned || 0).toFixed(2)}</span>
                    </div>
                    <div class="merchant-stat">
                        <span class="stat-label">转增次数:</span>
                        <span class="stat-value">${merchant.merchantData?.totalTransfers || 0}</span>
                    </div>
                    <div class="merchant-stat">
                        <span class="stat-label">任命时间:</span>
                        <span class="stat-value">${Utils.formatDate(merchant.merchantData?.appointedAt)}</span>
                    </div>
                </div>
                <div class="merchant-actions">
                    <button class="btn btn-sm btn-warning" onclick="Admin.revokeMerchant('${merchant._id}')">撤销商人</button>
                </div>
            `;
            merchantList.appendChild(merchantCard);
        });
    },
    
    // 切换管理员标签
    switchAdminTab(tabName) {
        // 隐藏所有标签内容
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 移除所有标签的active类
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 显示选中的标签内容
        const targetContent = document.getElementById(`admin-${tabName}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // 激活选中的标签
        const activeTab = document.querySelector(`.admin-tab[onclick*="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // 根据标签加载特定数据
        if (tabName === 'merchants') {
            Admin.loadMerchantList();
        }
    },
    
    // 编辑用户
    editUser(userId) {
        const user = allUsers.find(u => u._id === userId);
        if (!user) return;
        
        const newUsername = prompt('请输入新的用户名:', user.username);
        if (!newUsername) return;
        
        const newEmail = prompt('请输入新的邮箱:', user.email);
        if (!newEmail) return;
        
        Admin.updateUserInfo(userId, newUsername, newEmail);
    },
    
    // 更新用户信息
    async updateUserInfo(userId, username, email) {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/edit-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId, username, email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification('用户信息更新成功', 'success');
                Admin.loadAdminData(); // 重新加载数据
            } else {
                Utils.showNotification(data.message || '更新失败', 'error');
            }
        } catch (error) {
            console.error('更新用户信息错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 调整用户积分
    adjustUserPoints(userId) {
        const user = allUsers.find(u => u._id === userId);
        if (!user) return;
        
        const newPoints = prompt(`请输入新的积分数量 (当前: ${user.points}):`, user.points);
        if (!newPoints) return;
        
        Admin.updateUserPoints(userId, parseFloat(newPoints));
    },
    
    // 更新用户积分
    async updateUserPoints(userId, points) {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/adjust-points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId, points })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification('积分调整成功', 'success');
                Admin.loadAdminData(); // 重新加载数据
            } else {
                Utils.showNotification(data.message || '调整失败', 'error');
            }
        } catch (error) {
            console.error('调整积分错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 切换用户状态
    async toggleUserStatus(userId) {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/toggle-user-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification(data.message, 'success');
                Admin.loadAdminData(); // 重新加载数据
            } else {
                Utils.showNotification(data.message || '操作失败', 'error');
            }
        } catch (error) {
            console.error('切换用户状态错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 任命商人 - 修复500错误，增强错误处理
    async appointMerchant(userId) {
        if (!userId) {
            Utils.showNotification('用户ID不能为空', 'error');
            return;
        }
        
        if (!confirm('确定要任命该用户为商人吗？')) return;
        
        try {
            console.log('👑 任命商人:', { userId });
            
            const response = await fetch(`${CONFIG.API_BASE}/admin/appoint-merchant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId })
            });
            
            console.log('👑 任命商人响应状态:', response.status);
            
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('👑 服务器返回非JSON响应:', text);
                throw new Error('服务器返回了错误的响应格式');
            }
            
            console.log('👑 任命商人响应数据:', data);
            
            if (response.ok) {
                Utils.showNotification(data.message, 'success');
                Admin.loadAdminData(); // 重新加载数据
            } else {
                Utils.showNotification(data.message || '任命失败', 'error');
            }
        } catch (error) {
            console.error('👑 任命商人错误:', error);
            
            if (error.message.includes('Failed to fetch')) {
                Utils.showNotification('网络连接失败，请检查网络', 'error');
            } else if (error.message.includes('JSON')) {
                Utils.showNotification('服务器响应错误，请联系管理员', 'error');
            } else {
                Utils.showNotification('任命失败，请稍后重试', 'error');
            }
        }
    },
    
    // 撤销商人 - 增强错误处理
    async revokeMerchant(userId) {
        if (!confirm('确定要撤销该用户的商人身份吗？')) return;
        
        try {
            console.log('👑 撤销商人:', { userId });
            
            const response = await fetch(`${CONFIG.API_BASE}/admin/revoke-merchant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId })
            });
            
            console.log('👑 撤销商人响应状态:', response.status);
            
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('👑 服务器返回非JSON响应:', text);
                throw new Error('服务器返回了错误的响应格式');
            }
            
            console.log('👑 撤销商人响应数据:', data);
            
            if (response.ok) {
                Utils.showNotification(data.message, 'success');
                Admin.loadAdminData(); // 重新加载数据
            } else {
                Utils.showNotification(data.message || '撤销失败', 'error');
            }
        } catch (error) {
            console.error('👑 撤销商人错误:', error);
            
            if (error.message.includes('Failed to fetch')) {
                Utils.showNotification('网络连接失败，请检查网络', 'error');
            } else if (error.message.includes('JSON')) {
                Utils.showNotification('服务器响应错误，请联系管理员', 'error');
            } else {
                Utils.showNotification('撤销失败，请稍后重试', 'error');
            }
        }
    },
    
    // 删除娃娃
    async deleteDoll(dollId) {
        if (!confirm('确定要删除这个娃娃吗？此操作不可恢复！')) return;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/delete-doll`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ dollId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification(data.message, 'success');
                Admin.loadAdminData(); // 重新加载数据
            } else {
                Utils.showNotification(data.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除娃娃错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 更新娃娃价格
    async updateDollPrices() {
        const level1PriceInput = document.getElementById('level1-price');
        const level2PriceInput = document.getElementById('level2-price');
        const level3PriceInput = document.getElementById('level3-price');
        
        const level1Price = parseFloat(level1PriceInput?.value) || 50;
        const level2Price = parseFloat(level2PriceInput?.value) || 200;
        const level3Price = parseFloat(level3PriceInput?.value) || 500;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/update-system-config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    dollPrices: {
                        1: level1Price,
                        2: level2Price,
                        3: level3Price
                    }
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification('娃娃价格更新成功', 'success');
                CONFIG.DOLL_PRICES = data.config.dollPrices;
            } else {
                Utils.showNotification(data.message || '更新失败', 'error');
            }
        } catch (error) {
            console.error('更新娃娃价格错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 更新转增设置
    async updateTransferSettings() {
        const userFeeRateInput = document.getElementById('user-fee-rate');
        const merchantBonusRateInput = document.getElementById('merchant-bonus-rate');
        const baseBonusRateInput = document.getElementById('base-bonus-rate');
        
        const userFeeRate = parseFloat(userFeeRateInput?.value) || 5;
        const merchantBonusRate = parseFloat(merchantBonusRateInput?.value) || 1;
        const baseBonusRate = parseFloat(baseBonusRateInput?.value) || 1;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/update-transfer-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userFeeRate,
                    merchantBonusRate,
                    baseBonusRate
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification('转增设置更新成功', 'success');
                CONFIG.TRANSFER_SETTINGS = data.settings;
            } else {
                Utils.showNotification(data.message || '更新失败', 'error');
            }
        } catch (error) {
            console.error('更新转增设置错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 显示商人任命模态框
    showMerchantAppointmentModal() {
        const modal = document.getElementById('merchant-appointment-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    // 处理商人任命
    async handleMerchantAppointment(e) {
        e.preventDefault();
        
        const usernameInput = document.getElementById('appointment-username');
        const username = usernameInput?.value;
        
        if (!username) {
            Utils.showNotification('请输入用户名或用户ID', 'error');
            return;
        }
        
        try {
            // 先搜索用户
            let user = allUsers.find(u => u.username === username || u._id === username);
            
            if (!user) {
                Utils.showNotification('用户不存在', 'error');
                return;
            }
            
            const response = await fetch(`${CONFIG.API_BASE}/admin/appoint-merchant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user._id })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Utils.showNotification(data.message, 'success');
                Auth.closeModal('merchant-appointment-modal');
                Admin.loadAdminData(); // 重新加载数据
            } else {
                Utils.showNotification(data.message || '任命失败', 'error');
            }
        } catch (error) {
            console.error('任命商人错误:', error);
            Utils.showNotification('网络错误，请稍后重试', 'error');
        }
    },
    
    // 批量发放积分
    addUserPoints() {
        const amount = prompt('请输入要发放的积分数量:');
        if (!amount) return;
        
        if (!confirm(`确定要给所有用户发放 ${amount} 积分吗？`)) return;
        
        // 这里可以实现批量发放逻辑
        Utils.showNotification('批量发放功能开发中...', 'info');
    },
    
    // 创建用户
    createUser() {
        const username = prompt('请输入用户名:');
        if (!username) return;
        
        const password = prompt('请输入密码:');
        if (!password) return;
        
        const email = prompt('请输入邮箱:');
        if (!email) return;
        
        // 这里可以实现创建用户逻辑
        Utils.showNotification('创建用户功能开发中...', 'info');
    },
    
    // 导出交易记录 - 完整实现
    exportTransactions() {
        Utils.showNotification('正在导出交易记录...', 'info');
        
        try {
            const recordsTable = document.getElementById('transactions-table');
            if (!recordsTable) {
                Utils.showNotification('没有可导出的数据', 'warning');
                return;
            }
            
            let csvContent = "时间,用户,类型,金额,描述\n";
            const rows = recordsTable.querySelectorAll('tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                    const time = cells[0].textContent;
                    const user = cells[1].textContent;
                    const type = cells[2].textContent;
                    const amount = cells[3].textContent;
                    const desc = cells[4].textContent;
                    
                    csvContent += `"${time}","${user}","${type}","${amount}","${desc}"\n`;
                }
            });
            
            // 创建下载链接
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `交易记录_${new Date().toLocaleDateString()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Utils.showNotification('导出成功！', 'success');
        } catch (error) {
            console.error('导出错误:', error);
            Utils.showNotification('导出失败', 'error');
        }
    },
    
    // 计算今日收益 - 完整实现，修复权限问题
    async calculateDailyIncome() {
        Utils.showNotification('正在计算今日收益...', 'info');
        
        try {
            if (!allUsers || !Array.isArray(allUsers)) {
                Utils.showNotification('用户数据加载中...', 'warning');
                return;
            }
            
            console.log('💰 开始计算今日收益...');
            console.log('💰 总用户数:', allUsers.length);
            
            let totalDailyIncome = 0;
            let activeUsersCount = 0;
            const userIncomeDetails = [];
            
            // 获取所有用户的娃娃数据（使用管理员权限）
            try {
                const response = await fetch(`${CONFIG.API_BASE}/admin/dolls`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    Utils.showNotification('无法获取娃娃数据', 'error');
                    return;
                }
                
                const dollsData = await response.json();
                const allDolls = Array.isArray(dollsData.dolls) ? dollsData.dolls : [];
                
                console.log('💰 总娃娃数:', allDolls.length);
                
                // 按用户分组统计
                const userDollsMap = new Map();
                
                allDolls.forEach(doll => {
                    if (!doll.active) return;
                    
                    const userId = doll.userId;
                    if (!userDollsMap.has(userId)) {
                        userDollsMap.set(userId, []);
                    }
                    userDollsMap.get(userId).push(doll);
                });
                
                console.log('💰 有娃娃的用户数:', userDollsMap.size);
                
                // 计算每个用户的收益
                userDollsMap.forEach((dolls, userId) => {
                    const user = allUsers.find(u => u._id === userId);
                    if (!user) return;
                    
                    if (!user.active) return;
                    
                    activeUsersCount++;
                    
                    const activeDolls = dolls.filter(doll => doll.active);
                    
                    const userDailyIncome = activeDolls.reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
                    totalDailyIncome += userDailyIncome;
                    
                    if (userDailyIncome > 0) {
                        userIncomeDetails.push({
                            username: user.username,
                            activeDolls: activeDolls.length,
                            dailyIncome: userDailyIncome.toFixed(2)
                        });
                    }
                });
                
            } catch (error) {
                console.error('💰 获取娃娃数据失败:', error);
                Utils.showNotification('获取娃娃数据失败', 'error');
                return;
            }
            
            console.log('💰 计算完成，总收益:', totalDailyIncome);
            
            // 显示详细结果
            let detailsMessage = `今日预计总收益: ${totalDailyIncome.toFixed(2)} 积分\n`;
            detailsMessage += `活跃用户数: ${activeUsersCount}\n`;
            detailsMessage += `有收益用户数: ${userIncomeDetails.length}\n\n`;
            
            if (userIncomeDetails.length > 0) {
                detailsMessage += '收益详情 (前10名):\n';
                userIncomeDetails
                    .sort((a, b) => parseFloat(b.dailyIncome) - parseFloat(a.dailyIncome))
                    .slice(0, 10)
                    .forEach((detail, index) => {
                        detailsMessage += `${index + 1}. ${detail.username}: ${detail.dailyIncome} 积分 (${detail.activeDolls}个娃娃)\n`;
                    });
            }
            
            // 更新页面显示
            const dailyIncomeDisplay = document.getElementById('daily-income-display');
            const level1IncomeDisplay = document.getElementById('level1-income-display');
            const level2IncomeDisplay = document.getElementById('level2-income-display');
            const level3IncomeDisplay = document.getElementById('level3-income-display');
            
            if (dailyIncomeDisplay) {
                dailyIncomeDisplay.textContent = `${totalDailyIncome.toFixed(2)} 积分`;
            }
            
            // 计算分级收益
            const level1Income = userIncomeDetails
                .filter(detail => detail.activeDolls >= 1)
                .reduce((sum, detail) => sum + parseFloat(detail.dailyIncome), 0);
            const level2Income = userIncomeDetails
                .filter(detail => detail.activeDolls >= 2)
                .reduce((sum, detail) => sum + parseFloat(detail.dailyIncome), 0);
            const level3Income = userIncomeDetails
                .filter(detail => detail.activeDolls >= 3)
                .reduce((sum, detail) => sum + parseFloat(detail.dailyIncome), 0);
            
            if (level1IncomeDisplay) level1IncomeDisplay.textContent = `${level1Income.toFixed(2)} 积分`;
            if (level2IncomeDisplay) level2IncomeDisplay.textContent = `${level2Income.toFixed(2)} 积分`;
            if (level3IncomeDisplay) level3IncomeDisplay.textContent = `${level3Income.toFixed(2)} 积分`;
            
            alert(detailsMessage);
            Utils.showNotification('收益计算完成', 'success');
            
        } catch (error) {
            console.error('💰 计算收益错误:', error);
            Utils.showNotification('计算收益失败', 'error');
        }
    },
    
    // 重置系统
    resetSystem() {
        if (!confirm('确定要重置系统吗？此操作不可恢复！')) return;
        
        if (!confirm('再次确认：真的要重置系统吗？')) return;
        
        Utils.showNotification('重置系统功能开发中...', 'info');
    },
    
    // 初始化管理员事件监听器 - 完全重写
    initEventListeners() {
        console.log('初始化管理员事件监听器...');
        
        // 娃娃价格输入
        const level1PriceInput = document.getElementById('level1-price');
        const level2PriceInput = document.getElementById('level2-price');
        const level3PriceInput = document.getElementById('level3-price');
        
        if (level1PriceInput) level1PriceInput.addEventListener('change', Admin.updateDollPrices);
        if (level2PriceInput) level2PriceInput.addEventListener('change', Admin.updateDollPrices);
        if (level3PriceInput) level3PriceInput.addEventListener('change', Admin.updateDollPrices);
        
        // 转增设置输入
        const userFeeRateInput = document.getElementById('user-fee-rate');
        const merchantBonusRateInput = document.getElementById('merchant-bonus-rate');
        const baseBonusRateInput = document.getElementById('base-bonus-rate');
        
        if (userFeeRateInput) userFeeRateInput.addEventListener('change', Admin.updateTransferSettings);
        if (merchantBonusRateInput) merchantBonusRateInput.addEventListener('change', Admin.updateTransferSettings);
        if (baseBonusRateInput) baseBonusRateInput.addEventListener('change', Admin.updateTransferSettings);
        
        // 商人任命表单
        const merchantAppointmentForm = document.getElementById('merchant-appointment-form');
        if (merchantAppointmentForm) {
            merchantAppointmentForm.addEventListener('submit', Admin.handleMerchantAppointment);
        }
        
        console.log('管理员事件监听器初始化完成');
    }
};
