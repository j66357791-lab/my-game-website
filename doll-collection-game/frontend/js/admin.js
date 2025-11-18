// 管理员功能
const Admin = {
    // 加载管理员数据
    async loadAdminData() {
        if (!currentUser || currentUser.role !== 'admin') {
            Utils.showNotification('您没有管理员权限！', 'error');
            return;
        }
        
        try {
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
            
        } catch (error) {
            console.error('加载管理员数据错误:', error);
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
    
    // 其他管理员功能...
    
    // 初始化管理员事件监听器
    initEventListeners() {
        // 管理员相关事件监听器
        const level1PriceInput = document.getElementById('level1-price');
        const level2PriceInput = document.getElementById('level2-price');
        const level3PriceInput = document.getElementById('level3-price');
        
        if (level1PriceInput) level1PriceInput.addEventListener('change', Admin.updateDollPrices);
        if (level2PriceInput) level2PriceInput.addEventListener('change', Admin.updateDollPrices);
        if (level3PriceInput) level3PriceInput.addEventListener('change', Admin.updateDollPrices);
        
        const userFeeRateInput = document.getElementById('user-fee-rate');
        const merchantBonusRateInput = document.getElementById('merchant-bonus-rate');
        const baseBonusRateInput = document.getElementById('base-bonus-rate');
        
        if (userFeeRateInput) userFeeRateInput.addEventListener('change', Admin.updateTransferSettings);
        if (merchantBonusRateInput) merchantBonusRateInput.addEventListener('change', Admin.updateTransferSettings);
        if (baseBonusRateInput) baseBonusRateInput.addEventListener('change', Admin.updateTransferSettings);
    }
};
