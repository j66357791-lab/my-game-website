// 转增功能
const Transfer = {
    // 搜索用户
    async searchUser(username) {
        if (!username.trim()) {
            Utils.showNotification('请输入用户名', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/users/search?query=${encodeURIComponent(username)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.users && data.users.length > 0) {
                Transfer.displaySearchResults(data.users);
            } else {
                Utils.showNotification('未找到该用户', 'warning');
            }
        } catch (error) {
            console.error('搜索用户错误:', error);
            Utils.showNotification('搜索用户失败', 'error');
        }
    },
    
    // 显示搜索结果
    displaySearchResults(users) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'block';
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'search-result-item';
            userItem.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-id">ID: ${user._id}</div>
                    <div class="user-role">${user.role === 'merchant' ? '👑 商人' : '👤 普通用户'}</div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="Transfer.selectRecipient('${user._id}', '${user.username}')">选择</button>
            `;
            
            resultsContainer.appendChild(userItem);
        });
    },
    
    // 选择转增接收者
    selectRecipient(userId, username) {
        const recipientInput = document.getElementById('transfer-recipient');
        const recipientIdInput = document.getElementById('transfer-recipient-id');
        
        if (recipientInput) {
            recipientInput.value = username;
        }
        
        if (recipientIdInput) {
            recipientIdInput.value = userId;
        }
        
        // 隐藏搜索结果
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        
        // 设置选中的接收者
        selectedRecipient = { _id: userId, username, role: 'user' }; // 这里需要从用户数据中获取角色
        
        // 更新转增信息显示
        Transfer.updateTransferInfo();
    },
    
    // 更新转增信息显示
    updateTransferInfo() {
        const amountInput = document.getElementById('transfer-amount');
        const recipientIdInput = document.getElementById('transfer-recipient-id');
        const feeDisplay = document.getElementById('transfer-fee');
        const bonusDisplay = document.getElementById('transfer-bonus');
        const actualDisplay = document.getElementById('transfer-actual');
        const totalDisplay = document.getElementById('transfer-total');
        
        const amount = parseFloat(amountInput.value) || 0;
        
        if (amount <= 0 || !recipientIdInput.value) {
            feeDisplay.textContent = '0 积分';
            bonusDisplay.textContent = '0 积分';
            actualDisplay.textContent = '0 积分';
            totalDisplay.textContent = '0 积分';
            return;
        }
        
        // 计算手续费和奖励
        let feeRate = CONFIG.TRANSFER_SETTINGS.userFeeRate / 100; // 默认5%
        if (currentUser.role === 'merchant') {
            feeRate = 0; // 商人0手续费
        }
        
        // 计算奖励
        let bonusRate = 0;
        if (selectedRecipient && selectedRecipient.role === 'merchant') {
            bonusRate = CONFIG.TRANSFER_SETTINGS.merchantBonusRate / 100; // 商人1%奖励
        }
        
        const fee = Math.floor(amount * feeRate);
        const bonus = Math.floor(amount * bonusRate);
        const actualAmount = amount - fee;
        const totalDeduction = amount;
        
        feeDisplay.textContent = `${fee} 积分 (${currentUser.role === 'user' ? '5%' : '0%'})`;
        bonusDisplay.textContent = `${bonus} 积分 (${(bonusRate * 100).toFixed(1)}%)`;
        actualDisplay.textContent = `${actualAmount} 积分`;
        totalDisplay.textContent = `${totalDeduction} 积分`;
    },
    
    // 更新转增费用显示
    updateTransferFeeDisplay() {
        const amount = parseFloat(document.getElementById('transfer-amount').value) || 0;
        const recipientRole = selectedRecipient ? selectedRecipient.role : 'user';
        const senderRole = currentUser ? currentUser.role : 'user';
        
        // 计算手续费
        let feeRate = CONFIG.TRANSFER_SETTINGS.userFeeRate / 100; // 默认5%
        if (senderRole === 'merchant') {
            feeRate = 0; // 商人0手续费
        }
        
        // 计算奖励
        let bonusRate = 0;
        if (recipientRole === 'merchant') {
            bonusRate = CONFIG.TRANSFER_SETTINGS.merchantBonusRate / 100; // 商人1%奖励
        }
        
        const fee = Math.floor(amount * feeRate);
        const bonus = Math.floor(amount * bonusRate);
        const actualAmount = amount - fee;
        const totalAmount = actualAmount + fee;
        
        // 更新显示
        document.getElementById('transfer-amount-display').textContent = `${amount.toFixed(2)} 积分`;
        document.getElementById('transfer-fee-display').textContent = `${fee.toFixed(2)} 积分 (${(feeRate * 100).toFixed(1)}%)`;
        document.getElementById('transfer-bonus-display').textContent = `${bonus.toFixed(2)} 积分 (${(bonusRate * 100).toFixed(1)}%)`;
        document.getElementById('transfer-actual-display').textContent = `${actualAmount.toFixed(2)} 积分`;
        document.getElementById('transfer-total-display').textContent = `${totalAmount.toFixed(2)} 积分`;
        
        // 更新按钮状态
        const confirmBtn = document.getElementById('transfer-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = amount <= 0 || !selectedRecipient || currentUser.points < totalAmount;
        }
    },
    
    // 确认转增
    async confirmTransfer() {
        if (!selectedRecipient) {
            Utils.showNotification('请先选择接收人', 'warning');
            return;
        }
        
        const amount = parseFloat(document.getElementById('transfer-amount').value) || 0;
        const note = document.getElementById('transfer-note').value.trim();
        
        if (amount <= 0) {
            Utils.showNotification('请输入有效的转增金额', 'warning');
            return;
        }
        
        if (currentUser.points < parseFloat(document.getElementById('transfer-total-display').textContent)) {
            Utils.showNotification('积分不足', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/transactions/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    recipientId: selectedRecipient._id,
                    amount: amount,
                    description: note || '积分转增'
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // 更新用户积分
                currentUser.points = data.user.points;
                UI.updateUI();
                
                // 显示成功通知
                const fee = parseFloat(document.getElementById('transfer-fee-display').textContent);
                const actualAmount = parseFloat(document.getElementById('transfer-actual-display').textContent);
                
                Utils.showNotification(
                    `转增成功！给${selectedRecipient.username}转增${actualAmount}积分，手续费${fee}积分`,
                    'success'
                );
                
                // 清空表单
                Transfer.resetTransferForm();
                
                // 重新加载转增记录
                Transfer.loadTransferRecords();
            } else {
                Utils.showNotification(data.message || '转增失败', 'error');
            }
        } catch (error) {
            console.error('转增错误:', error);
            Utils.showNotification('转增失败，请稍后重试', 'error');
        }
    },
    
    // 重置转增表单
    resetTransferForm() {
        document.getElementById('transfer-amount').value = '';
        document.getElementById('transfer-note').value = '';
        selectedRecipient = null;
        Transfer.updateTransferInfo();
    },
    
    // 加载转增设置
    async loadTransferSettings() {
        try {
            const response = await fetch(`${CONFIG.API_BASE}/admin/transfer-settings`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                CONFIG.TRANSFER_SETTINGS = data.settings;
                
                // 更新界面显示
                const userFeeRateInput = document.getElementById('user-fee-rate');
                const merchantBonusRateInput = document.getElementById('merchant-bonus-rate');
                const baseBonusRateInput = document.getElementById('base-bonus-rate');
                
                if (userFeeRateInput) userFeeRateInput.value = (CONFIG.TRANSFER_SETTINGS.userFeeRate || 5).toString();
                if (merchantBonusRateInput) merchantBonusRateInput.value = (CONFIG.TRANSFER_SETTINGS.merchantBonusRate || 1).toString();
                if (baseBonusRateInput) baseBonusRateInput.value = (CONFIG.TRANSFER_SETTINGS.baseBonusRate || 1).toString();
            }
        } catch (error) {
            console.error('加载转增设置失败:', error);
        }
    },
    
    // 加载转增记录
    async loadTransferRecords() {
        if (!currentUser) return;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE}/transactions/transfer-records`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                Transfer.updateTransferRecordsTable(Array.isArray(data.records) ? data.records : []);
            } else {
                console.error('获取转增记录失败');
                Transfer.updateTransferRecordsTable([]);
            }
        } catch (error) {
            console.error('加载转增记录错误:', error);
            Transfer.updateTransferRecordsTable([]);
        }
    },
    
    // 更新转增记录表格
    updateTransferRecordsTable(records) {
        const recordsTable = document.getElementById('transfer-records-table');
        if (!recordsTable) return;
        
        recordsTable.innerHTML = '';
        
        if (!Array.isArray(records) || records.length === 0) {
            recordsTable.innerHTML = '<tr><td colspan="6">暂无转增记录</td></tr>';
            return;
        }
        
        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Utils.formatDateTime(record.createdAt)}</td>
                <td>
                    <span class="transfer-type ${record.type}">
                        ${record.type === 'sent' ? '发出' : '收到'}
                    </span>
                </td>
                <td>${record.recipientId && record.recipientId.username ? record.recipientId.username : (record.recipientId || '未知用户')}</td>
                <td>
                    <span class="transfer-amount ${record.amount > 0 ? 'positive' : 'negative'}">
                        ${record.amount > 0 ? '+' : ''}${record.amount.toFixed(2)} 积分
                    </span>
                </td>
                <td>${record.description || '无备注'}</td>
            `;
            recordsTable.appendChild(row);
        });
    },
    
    // 初始化转增事件监听器
    initEventListeners() {
        // 转增相关事件监听器
        const transferAmount = document.getElementById('transfer-amount');
        if (transferAmount) {
            transferAmount.addEventListener('input', Transfer.updateTransferFeeDisplay);
        }
        
        const searchUsername = document.getElementById('search-username');
        if (searchUsername) {
            searchUsername.addEventListener('input', Utils.debounce(Transfer.searchUser));
        }
        
        const merchantAppointmentForm = document.getElementById('merchant-appointment-form');
        if (merchantAppointmentForm) {
            merchantAppointmentForm.addEventListener('submit', Transfer.handleMerchantAppointment);
        }
    }
};
