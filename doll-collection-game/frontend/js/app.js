// 在 loadAdminData 函数中添加系统配置获取
async function loadAdminData() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('您没有管理员权限！');
        return;
    }
    
    try {
        // 获取系统配置
        const configResponse = await fetch(`${API_BASE}/admin/system-config`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (configResponse.ok) {
            const configData = await configResponse.json();
            // 更新娃娃价格输入框
            document.getElementById('level1-price').value = configData.config.dollPrices[1];
            document.getElementById('level2-price').value = configData.config.dollPrices[2];
            document.getElementById('level3-price').value = configData.config.dollPrices[3];
        }
        
        // 获取所有用户
        const usersResponse = await fetch(`${API_BASE}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            allUsers = usersData.users;
            updateUsersTable();
        }
        
        // 获取所有娃娃
        const dollsResponse = await fetch(`${API_BASE}/admin/dolls`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (dollsResponse.ok) {
            const dollsData = await dollsResponse.json();
            updateDollsTable(dollsData.dolls);
        }
        
        // 获取交易记录
        const transactionsResponse = await fetch(`${API_BASE}/admin/transactions`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json();
            updateTransactionsTable(transactionsData.transactions);
        }
    } catch (error) {
        console.error('加载管理员数据错误:', error);
        alert('加载管理员数据失败: ' + error.message);
    }
}

// 更新娃娃表格函数
function updateDollsTable(dolls) {
    const dollsTable = document.getElementById('dolls-table');
    dollsTable.innerHTML = '';
    
    dolls.forEach(doll => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doll.id}</td>
            <td>${doll.username || doll.userId}</td>
            <td>${doll.level}</td>
            <td>${new Date(doll.purchaseDate).toLocaleDateString()}</td>
            <td>${doll.remainingDays}</td>
            <td>${doll.dailyIncome}</td>
            <td>${doll.active ? '活跃' : '非活跃'}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteDoll(${doll.id})">删除</button>
            </td>
        `;
        dollsTable.appendChild(row);
    });
}

// 更新交易表格函数
function updateTransactionsTable(transactions) {
    const transactionsTable = document.getElementById('transactions-table');
    transactionsTable.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(transaction.createdAt).toLocaleString()}</td>
            <td>${transaction.username || transaction.userId}</td>
            <td>${transaction.type}</td>
            <td>${transaction.amount}</td>
            <td>${transaction.description}</td>
        `;
        transactionsTable.appendChild(row);
    });
}