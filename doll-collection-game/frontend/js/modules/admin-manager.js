// 管理员功能模块
const AdminManager = {
    // 加载管理员数据
    async loadAdminData() {
        const { currentUser } = AppState;
        if (!currentUser || currentUser.role !== 'admin') {
            alert('您没有管理员权限！');
            return;
        }
        
        try {
            // 获取所有用户
            const usersResponse = await fetch(`${AppState.API_BASE}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                const allUsers = Array.isArray(usersData.users) ? usersData.users : [];
                AppState.updateState({ allUsers });
                this.updateUsersTable();
            }
            
            // 获取所有娃娃
            const dollsResponse = await fetch(`${AppState.API_BASE}/admin/dolls`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (dollsResponse.ok) {
                const dollsData = await dollsResponse.json();
                this.updateDollsTable(Array.isArray(dollsData.dolls) ? dollsData.dolls : []);
            }
            
            // 获取交易记录
            const transactionsResponse = await fetch(`${AppState.API_BASE}/admin/transactions`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                this.updateTransactionsTable(Array.isArray(transactionsData.transactions) ? transactionsData.transactions : []);
            }
            
        } catch (error) {
            console.error('加载管理员数据错误:', error);
            alert('加载管理员数据失败: ' + error.message);
        }
    },

    // 更新用户表格
    updateUsersTable() {
        const { allUsers } = AppState;
        const usersTable = document.getElementById('users-table');
        if (!usersTable) return;
        
        usersTable.innerHTML = '';
        
        if (!Array.isArray(allUsers)) {
            usersTable.innerHTML = '<tr><td colspan="8">暂无用户数据</td></tr>';
            return;
        }
        
        allUsers.forEach(user => {
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
        if (!dollsTable) return;
        
        dollsTable.innerHTML = '';
        
        if (!Array.isArray(dolls)) {
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
        if (!transactionsTable) return;
        
        transactionsTable.innerHTML = '';
        
        if (!Array.isArray(transactions)) {
            transactionsTable.innerHTML = '<tr><td colspan="5">暂无交易记录</td></tr>';
            return;
        }
        
        if (transactions.length === 0) {
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

    // 切换管理员标签页
    switchAdminTab(tabName) {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.admin-content').forEach(content => {
            content.classList.remove('active');
        });
        
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        const targetContent = document.getElementById(`admin-${tabName}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    },

    // 更新娃娃价格
    async updateDollPrices() {
        const { currentUser } = AppState;
        if (!currentUser || currentUser.role !== 'admin') {
            alert('您没有管理员权限！');
            return;
        }
        
        try {
            const level1Price = parseFloat(document.getElementById('level1-price').value) || 50;
            const level2Price = parseFloat(document.getElementById('level2-price').value) || 200;
            const level3Price = parseFloat(document.getElementById('level3-price').value) || 500;
            
            const response = await fetch(`${AppState.API_BASE}/admin/update-system-config`, {
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
                alert('价格更新成功！');
            } else {
                alert(data.message || '价格更新失败');
            }
            
        } catch (error) {
            console.error('更新价格错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 调整用户积分
    async adjustUserPoints(userId) {
        const { allUsers } = AppState;
        const user = allUsers.find(u => u._id === userId);
        if (!user) return;
        
        const newPoints = prompt(`请输入用户 "${user.username}" 的新积分数量:`, user.points);
        if (newPoints === null) return;
        
        const points = parseFloat(newPoints);
        if (isNaN(points) || points < 0) {
            alert('请输入有效的积分数量！');
            return;
        }
        
        try {
            const response = await fetch(`${AppState.API_BASE}/admin/adjust-points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId, points })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('积分调整成功！');
                this.loadAdminData(); // 重新加载数据
            } else {
                alert(data.message || '积分调整失败');
            }
        } catch (error) {
            console.error('调整积分错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 切换用户状态
    async toggleUserStatus(userId) {
        const { allUsers } = AppState;
        const user = allUsers.find(u => u._id === userId);
        if (!user) return;
        
        const action = user.active ? '禁用' : '启用';
        if (!confirm(`确定要${action}用户 "${user.username}" 吗？`)) return;
        
        try {
            const response = await fetch(`${AppState.API_BASE}/admin/toggle-user-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(`用户${action}成功！`);
                this.loadAdminData(); // 重新加载数据
            } else {
                alert(data.message || `用户${action}失败`);
            }
        } catch (error) {
            console.error('切换用户状态错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 编辑用户信息
    async editUser(userId) {
        const { allUsers } = AppState;
        const user = allUsers.find(u => u._id === userId);
        if (!user) return;
        
        const newUsername = prompt('请输入新的用户名:', user.username);
        if (newUsername === null) return;
        
        const newEmail = prompt('请输入新的邮箱:', user.email);
        if (newEmail === null) return;
        
        if (!newUsername.trim() || !newEmail.trim()) {
            alert('用户名和邮箱不能为空！');
            return;
        }
        
        try {
            const response = await fetch(`${AppState.API_BASE}/admin/edit-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId,
                    username: newUsername.trim(),
                    email: newEmail.trim()
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('用户信息更新成功！');
                this.loadAdminData(); // 重新加载数据
            } else {
                alert(data.message || '用户信息更新失败');
            }
        } catch (error) {
            console.error('编辑用户错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 删除娃娃
    async deleteDoll(dollId) {
        if (!confirm(`确定要删除这个娃娃吗？此操作不可恢复！`)) return;
        
        try {
            const response = await fetch(`${AppState.API_BASE}/admin/delete-doll`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ dollId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('娃娃删除成功！');
                this.loadAdminData(); // 重新加载数据
            } else {
                alert(data.message || '娃娃删除失败');
            }
        } catch (error) {
            console.error('删除娃娃错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 批量发放积分
    showBatchGrantModal() {
        const { allUsers } = AppState;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">批量发放积分</div>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="batch-grant-form">
                    <div class="form-group">
                        <label class="form-label">选择用户</label>
                        <div id="user-checkboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
                            <!-- 用户复选框将在这里动态生成 -->
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="grant-points" class="form-label">积分数量</label>
                        <input type="number" id="grant-points" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="grant-reason" class="form-label">发放原因</label>
                        <input type="text" id="grant-reason" class="form-control" placeholder="可选">
                    </div>
                    <button type="submit" class="btn btn-block">确认发放</button>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 生成用户复选框
        const checkboxesContainer = document.getElementById('user-checkboxes');
        allUsers.forEach(user => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.innerHTML = `
                <label style="display: block; margin-bottom: 5px;">
                    <input type="checkbox" name="userIds" value="${user._id}">
                    ${user.username} (${user.email})
                </label>
            `;
            checkboxesContainer.appendChild(checkboxDiv);
        });
        
        // 绑定表单提交事件
        document.getElementById('batch-grant-form').addEventListener('submit', this.handleBatchGrant.bind(this));
    },

    // 处理批量发放
    async handleBatchGrant(e) {
        e.preventDefault();
        
        const checkboxes = document.querySelectorAll('input[name="userIds"]:checked');
        const userIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (userIds.length === 0) {
            alert('请至少选择一个用户');
            return;
        }
        
        const points = document.getElementById('grant-points').value;
        const reason = document.getElementById('grant-reason').value;
        
        try {
            const response = await fetch(`${AppState.API_BASE}/admin/grant-points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userIds, points, reason })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(`批量发放完成！成功: ${data.results.filter(r => r.success).length}, 失败: ${data.results.filter(r => !r.success).length}`);
                document.querySelector('.modal').remove();
                this.loadAdminData(); // 重新加载数据
            } else {
                alert(data.message || '批量发放失败');
            }
        } catch (error) {
            console.error('批量发放错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 创建用户
    createUser() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">创建新用户</div>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="create-user-form">
                    <div class="form-group">
                        <label for="new-username" class="form-label">用户名</label>
                        <input type="text" id="new-username" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="new-password" class="form-label">密码</label>
                        <input type="password" id="new-password" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="new-email" class="form-label">邮箱</label>
                        <input type="email" id="new-email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="new-points" class="form-label">初始积分</label>
                        <input type="number" id="new-points" class="form-control" value="1000" required>
                    </div>
                    <button type="submit" class="btn btn-block">创建用户</button>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定表单提交事件
        document.getElementById('create-user-form').addEventListener('submit', this.handleCreateUser.bind(this));
    },

    // 处理创建用户
    async handleCreateUser(e) {
        e.preventDefault();
        
        const username = document.getElementById('new-username').value;
        const password = document.getElementById('new-password').value;
        const email = document.getElementById('new-email').value;
        const points = document.getElementById('new-points').value;
        
        try {
            const response = await fetch(`${AppState.API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ username, password, email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // 如果设置了初始积分，调整用户积分
                if (parseFloat(points) !== 1000) {
                    const userResponse = await fetch(`${AppState.API_BASE}/admin/users`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    
                    if (userResponse.ok) {
                        const usersData = await userResponse.json();
                        const newUser = usersData.users.find(u => u.username === username);
                        if (newUser) {
                            await fetch(`${AppState.API_BASE}/admin/adjust-points`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({ userId: newUser._id, points: parseFloat(points) })
                            });
                        }
                    }
                }
                
                alert('用户创建成功！');
                document.querySelector('.modal').remove();
                this.loadAdminData(); // 重新加载数据
            } else {
                alert(data.message || '用户创建失败');
            }
        } catch (error) {
            console.error('创建用户错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 计算今日收益
    async calculateDailyIncome() {
        if (!confirm('确定要手动计算今日收益吗？这通常会在每天0点自动执行。')) return;
        
        try {
            alert('此功能需要后端支持手动收益计算接口');
        } catch (error) {
            console.error('计算收益错误:', error);
            alert('网络错误，请稍后重试');
        }
    },

    // 重置系统
    async resetSystem() {
        const confirmation = prompt('此操作将重置系统数据，请输入 "RESET" 确认：');
        if (confirmation !== 'RESET') {
            alert('确认文本不正确，操作已取消');
            return;
        }
        
        if (!confirm('警告：此操作将重置所有用户数据和娃娃数据，且不可恢复！确定要继续吗？')) return;
        
        try {
            alert('此功能需要后端支持系统重置接口');
        } catch (error) {
            console.error('重置系统错误:', error);
            alert('网络错误，请稍后重试');
        }
    }
};

// 导出到全局作用域
window.AdminManager = AdminManager;
