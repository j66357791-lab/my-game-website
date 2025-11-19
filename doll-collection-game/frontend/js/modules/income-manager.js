// 收益管理模块
const IncomeManager = {
    // 初始化
    init() {
        this.updateCountdown();
        this.checkDailyIncome();
        this.setupAutoPayout();
    },

    // 更新倒计时
    updateCountdown() {
        const now = new Date();
        const target = new Date();
        target.setHours(24, 0, 0, 0);
        
        if (now > target) {
            target.setDate(target.getDate() + 1);
        }
        
        const diff = target - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        const hoursElement = document.getElementById('countdown-hours');
        const minutesElement = document.getElementById('countdown-minutes');
        
        if (hoursElement) {
            hoursElement.textContent = hours.toString().padStart(2, '0');
        }
        if (minutesElement) {
            minutesElement.textContent = minutes.toString().padStart(2, '0');
        }
    },

    // 检查每日收益
    async checkDailyIncome() {
        const { currentUser, userDolls } = AppState;
        if (!currentUser || !userDolls) return;

        // 计算今日应得收益
        const activeDolls = userDolls.filter(doll => doll.active);
        const totalIncome = activeDolls.reduce((sum, doll) => sum + (parseFloat(doll.dailyIncome) || 0), 0);

        // 更新预计发放显示
        const expectedPayoutElement = document.getElementById('expected-payout');
        if (expectedPayoutElement) {
            expectedPayoutElement.textContent = totalIncome.toFixed(2);
        }

        // 检查今天是否已经发放过
        const today = new Date().toDateString();
        const lastPayout = localStorage.getItem('lastPayoutDate');
        
        if (lastPayout === today) {
            console.log('今日收益已发放');
            return;
        }

        // 检查是否到了发放时间（24:00）
        const now = new Date();
        const payoutTime = new Date();
        payoutTime.setHours(24, 0, 0, 0);
        
        if (now >= payoutTime) {
            await this.processDailyPayout();
        }
    },

    // 处理每日收益发放
    async processDailyPayout() {
        const { currentUser, userDolls } = AppState;
        if (!currentUser || !userDolls) return;

        try {
            const activeDolls = userDolls.filter(doll => doll.active);
            
            if (activeDolls.length === 0) {
                console.log('没有活跃娃娃，跳过收益发放');
                return;
            }

            // 计算总收益
            const totalIncome = activeDolls.reduce((sum, doll) => sum + (parseFloat(doll.dailyIncome) || 0), 0);

            // 更新娃娃剩余天数
            const updatedDolls = [];
            for (const doll of activeDolls) {
                const remainingDays = doll.remainingDays - 1;
                if (remainingDays > 0) {
                    updatedDolls.push({
                        ...doll,
                        remainingDays,
                        active: true
                    });
                } else {
                    // 娃娃寿命到期
                    updatedDolls.push({
                        ...doll,
                        remainingDays: 0,
                        active: false
                    });
                }
            }

            // 更新用户积分
            const newPoints = currentUser.points + totalIncome;

            // 这里应该调用后端API来更新数据
            // 暂时使用本地存储模拟
            localStorage.setItem('lastPayoutDate', new Date().toDateString());
            
            // 显示收益通知
            this.showIncomeNotification(totalIncome, activeDolls.length);

            // 更新界面
            AppState.updateState({
                currentUser: { ...currentUser, points: newPoints },
                userDolls: updatedDolls
            });

            // 刷新显示
            if (window.UserDataManager) {
                UserDataManager.updateUserStats();
                UserDataManager.updateMyDollsList();
            }

            console.log(`收益发放完成：${totalIncome}积分，${activeDolls.length}个娃娃`);

        } catch (error) {
            console.error('收益发放失败:', error);
        }
    },

    // 显示收益通知
    showIncomeNotification(totalIncome, dollCount) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'income-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>🎉 每日收益发放</h3>
                <p>今日收益：${totalIncome.toFixed(2)} 积分</p>
                <p>活跃娃娃：${dollCount} 个</p>
                <button onclick="this.closest('.income-notification').remove()">确定</button>
            </div>
        `;

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            animation: slideIn 0.5s ease;
        `;

        document.body.appendChild(notification);

        // 5秒后自动关闭
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    },

    // 设置自动发放
    setupAutoPayout() {
        // 每分钟检查一次
        setInterval(() => {
            this.updateCountdown();
            this.checkDailyIncome();
        }, 60000); // 60秒

        // 每10秒更新倒计时显示
        setInterval(() => {
            this.updateCountdown();
        }, 10000); // 10秒
    },

    // 手动触发收益发放（仅用于测试）
    async triggerManualPayout() {
        if (!confirm('确定要手动发放今日收益吗？')) return;

        try {
            await this.processDailyPayout();
            alert('收益发放完成！');
        } catch (error) {
            console.error('手动收益发放失败:', error);
            alert('收益发放失败，请稍后重试');
        }
    }
};

// 导出到全局作用域
window.IncomeManager = IncomeManager;
