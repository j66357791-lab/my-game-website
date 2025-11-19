// 自动收益系统
const AutoIncome = {
    // 启动自动收益系统
    startAutoIncomeSystem() {
        if (autoIncomeTimer) {
            clearInterval(autoIncomeTimer);
        }
        
        // 每分钟检查一次是否需要发放收益
        autoIncomeTimer = setInterval(async () => {
            if (!currentUser) return;
            
            try {
                // 检查是否到了发放时间（每天24:00）
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 24, 0, 0, 0);
                const nextPayout = new Date(today.getTime() + 24 * 60 * 60 * 1000);
                
                // 如果当前时间超过了下次发放时间，就发放收益
                if (now >= nextPayout) {
                    await AutoIncome.distributeDailyIncome();
                }
                
                // 更新下次发放时间显示
                AutoIncome.updateNextPayoutTime();
                
            } catch (error) {
                console.error('自动收益系统错误:', error);
            }
        }, 60000); // 每分钟检查一次
        
        console.log('✅ 自动收益系统已启动');
    },
    
    // 自动发放每日收益
    async distributeDailyIncome() {
        if (!currentUser) return;
        
        try {
            // 获取用户所有活跃娃娃
            const response = await fetch(`${CONFIG.API_BASE}/dolls/my-dolls`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                console.error('获取娃娃数据失败');
                return;
            }
            
            const data = await response.json();
            const dolls = Array.isArray(data.dolls) ? data.dolls : [];
            const activeDolls = dolls.filter(doll => doll.active);
            
            if (activeDolls.length === 0) {
                console.log('没有活跃娃娃，跳过收益发放');
                return;
            }
            
            // 计算总收益
            const totalIncome = activeDolls.reduce((sum, doll) => sum + (doll.dailyIncome || 0), 0);
            
            if (totalIncome <= 0) {
                console.log('总收益为0，跳过发放');
                return;
            }
            
            // 调用后端接口发放收益
            const payoutResponse = await fetch(`${CONFIG.API_BASE}/admin/distribute-income`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    amount: totalIncome
                })
            });
            
            if (payoutResponse.ok) {
                const payoutData = await payoutResponse.json();
                
                // 更新用户积分
                currentUser.points = payoutData.user.points;
                UI.updateUI();
                
                // 更新娃娃数据
                userDolls = Array.isArray(payoutData.dolls) ? payoutData.dolls : [];
                Dolls.updateUserStats();
                Dolls.updateMyDollsList();
                Dolls.updateBackpackDisplay();
                Dolls.updateBackpackStats(userDolls.length, userDolls.length);
                
                // 更新发放记录
                AutoIncome.updatePayoutHistory(totalIncome);
                
                // 更新上次发放时间
                lastPayoutTime = new Date();
                AutoIncome.updateLastPayoutTime();
                
                console.log(`✅ 自动发放收益成功: ${totalIncome.toFixed(2)} 积分`);
                
                // 显示通知
                Utils.showIncomeNotification(totalIncome);
                
            } else {
                console.error('发放收益失败:', payoutResponse.statusText);
            }
            
        } catch (error) {
            console.error('发放收益错误:', error);
        }
    },
    
    // 更新上次发放时间
    updateLastPayoutTime() {
        const element = document.getElementById('last-payout-time');
        if (element) {
            element.textContent = lastPayoutTime ? Utils.formatDateTime(lastPayoutTime) : '从未发放';
        }
    },
    
    // 更新下次发放时间
    updateNextPayoutTime() {
        const element = document.getElementById('next-payout-time');
        if (element) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 24, 0, 0, 0);
            const nextPayout = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            
            element.textContent = Utils.formatDateTime(nextPayout);
        }
    },
    
    // 更新发放记录
    updatePayoutHistory(amount) {
        const historyContainer = document.getElementById('payout-history');
        if (!historyContainer) return;
        
        const historyItem = document.createElement('div');
        historyItem.className = 'payout-item';
        historyItem.innerHTML = `
            <div class="payout-time">${Utils.formatDateTime(new Date())}</div>
            <div class="payout-amount">+${amount.toFixed(2)} 积分</div>
        `;
        
        // 插入到顶部
        if (historyContainer.firstChild) {
            historyContainer.insertBefore(historyItem, historyContainer.firstChild);
        } else {
            historyContainer.appendChild(historyItem);
        }
        
        // 只保留最近10条记录
        while (historyContainer.children.length > 10) {
            historyContainer.removeChild(historyContainer.lastChild);
        }
    }
};
