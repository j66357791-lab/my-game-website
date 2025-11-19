// 转增功能 - 完整修复版本
const Transfer = {
    // 搜索用户 - 修复参数问题
    async searchUser(event) {
        // 防止默认行为
        if (event) event.preventDefault();
        
        const searchInput = document.getElementById('search-username');
        const username = searchInput ? searchInput.value.trim() : '';
        
        if (!username) {
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
                Transfer.displaySearchResults([]);
            }
        } catch (error) {
            console.error('搜索用户错误:', error);
            Utils.showNotification('搜索用户失败', 'error');
        }
    },
    
    // 显示搜索结果 - 修复空数组处理
    displaySearchResults(users) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'block';
        
        if (!Array.isArray(users) || users.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">未找到用户</div>';
            return;
        }
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'search-result-item';
            userItem.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-id">ID: ${user._id ? user._id.substring(0, 8) + '...' : '未知'}</div>
                    <div class="user-role">${user.role === 'merchant' ? '👑 商人' : '👤 普通用户'}</div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="Transfer.selectRecipient('${user._id}', '${user.username}', '${user.role || 'user'}')">选择</button>
            `;
            
            resultsContainer.appendChild(userItem);
        });
    },
    
    // 选择转增接收者 - 修复角色传递
    selectRecipient(userId, username, role = 'user') {
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
        selectedRecipient = { _id: userId, username, role };
        
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
        
        const amount = parseFloat(amountInput?.value) || 0;
        
        if (amount <= 0 || !recipientIdInput?.value) {
            if (feeDisplay) feeDisplay.textContent = '0 积分';
            if (bonusDisplay) bonusDisplay.textContent = '0 积分';
            if (actualDisplay) actualDisplay.textContent = '0 积分';
            if (totalDisplay) totalDisplay.textContent = '0 积分';
            return;
        }
        
        // 计算手续费和奖励
        let feeRate = CONFIG.TRANSFER_SETTINGS.userFeeRate / 100; // 默认5%
        if (currentUser && currentUser.role === 'merchant') {
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
        
        if (feeDisplay) feeDisplay.textContent = `${fee} 积分 (${currentUser && currentUser.role === 'user' ? '5%' : '0%'})`;
        if (bonusDisplay) bonusDisplay.textContent = `${bonus} 积分 (${(bonusRate * 100).toFixed(1)}%)`;
        if (actualDisplay) actualDisplay.textContent = `${actualAmount} 积分`;
        if (totalDisplay) totalDisplay.textContent = `${totalDeduction} 积分`;
    },
    
    // 更新转增费用显示
    updateTransferFeeDisplay() {
        const amountInput = document.getElementById('transfer-amount');
        const amount = parseFloat(amountInput?.value) || 0;
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
        const amountDisplay = document.getElementById('transfer-amount-display');
        const feeDisplay = document.getElementById('transfer-fee-display');
        const bonusDisplay = document.getElementById('transfer-bonus-display');
        const actualDisplay = document.getElementById('transfer-actual-display');
        const totalDisplay = document.getElementById('transfer-total-display');
        
        if (amountDisplay) amountDisplay.textContent = `${amount.toFixed(2)} 积分`;
        if (feeDisplay) feeDisplay.textContent = `${fee.toFixed(2)} 积分 (${(feeRate * 100).toFixed(1)}%)`;
        if (bonusDisplay) bonusDisplay.textContent = `${bonus.toFixed(2)} 积分 (${(bonusRate * 100).toFixed(1)}%)`;
        if (actualDisplay) actualDisplay.textContent = `${actualAmount.toFixed(2)} 积分`;
        if (totalDisplay) totalDisplay.textContent = `${totalAmount.toFixed(2)} 积分`;
        
        // 更新按钮状态
        const confirmBtn = document.getElementById('transfer-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = amount <= 0 || !selectedRecipient || !currentUser || currentUser.points < totalAmount;
        }
    },
    
    // 确认转增
    async confirmTransfer() {
        if (!selectedRecipient) {
            Utils.showNotification('请先选择接收人', 'warning');
            return;
        }
        
        const amountInput = document.getElementById('transfer-amount');
        const noteInput = document.getElementById('transfer-note');
        const amount = parseFloat(amountInput?.value) || 0;
        const note = noteInput?.value.trim() || '';
        
        if (amount <= 0) {
            Utils.showNotification('请输入有效的转增金额', 'warning');
            return;
        }
        
        const totalDisplay = document.getElementById('transfer-total-display');
        const totalAmount = parseFloat(totalDisplay?.textContent) || 0;
        
        if (!currentUser || currentUser.points < totalAmount) {
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
                const feeDisplay = document.getElementById('transfer-fee-display');
                const actualDisplay = document.getElementById('transfer-actual-display');
                const fee = parseFloat(feeDisplay?.textContent) || 0;
                const actualAmount = parseFloat(actualDisplay?.textContent) || 0;
                
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
        const amountInput = document.getElementById('transfer-amount');
        const noteInput = document.getElementById('transfer-note');
        
        if (amountInput) amountInput.value = '';
        if (noteInput) noteInput.value = '';
        
        selectedRecipient = null;
        Transfer.updateTransferInfo();
        Transfer.updateTransferFeeDisplay();
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
                    <span class="transfer-type ${record.amount < 0 ? 'sent' : 'received'}">
                        ${record.amount < 0 ? '发出' : '收到'}
                    </span>
                </td>
                <td>${record.transferData && record.transferData.recipientUsername ? record.transferData.recipientUsername : (record.transferData && record.transferData.senderId ? '转出' : '未知用户')}</td>
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
    
    // 导出转增记录 - 新增功能
    exportTransferRecords() {
        Utils.showNotification('正在导出转增记录...', 'info');
        
        try {
            const recordsTable = document.getElementById('transfer-records-table');
            if (!recordsTable) {
                Utils.showNotification('没有可导出的数据', 'warning');
                return;
            }
            
            let csvContent = "时间,类型,对方用户,金额,备注\n";
            const rows = recordsTable.querySelectorAll('tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                    const time = cells[0].textContent;
                    const type = cells[1].textContent;
                    const user = cells[2].textContent;
                    const amount = cells[3].textContent;
                    const note = cells[4].textContent;
                    
                    csvContent += `"${time}","${type}","${user}","${amount}","${note}"\n`;
                }
            });
            
            // 创建下载链接
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `转增记录_${new Date().toLocaleDateString()}.csv`);
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
    
    // 初始化转增事件监听器 - 完全重写
    initEventListeners() {
        console.log('初始化转增事件监听器...');
        
        // 转增金额输入
        const transferAmount = document.getElementById('transfer-amount');
        if (transferAmount) {
            transferAmount.addEventListener('input', Transfer.updateTransferFeeDisplay);
        }
        
        // 搜索用户按钮
        const searchBtn = document.getElementById('search-user-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', Transfer.searchUser);
        }
        
        // 搜索输入框（回车搜索）
        const searchInput = document.getElementById('search-username');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    Transfer.searchUser(e);
                }
            });
        }
        
        // 确认转增按钮
        const confirmBtn = document.getElementById('transfer-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', Transfer.confirmTransfer);
        }
        
        // 导出按钮
        const exportBtn = document.getElementById('export-transfer-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', Transfer.exportTransferRecords);
        }
        
        // 商人任命表单（如果存在）
        const merchantAppointmentForm = document.getElementById('merchant-appointment-form');
        if (merchantAppointmentForm) {
            merchantAppointmentForm.addEventListener('submit', Admin.handleMerchantAppointment);
        }
        
        console.log('转增事件监听器初始化完成');
    }
};
