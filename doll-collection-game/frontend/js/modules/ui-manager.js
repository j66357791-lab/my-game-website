// UI管理模块
const UIManager = {
    // 显示登录模态框
    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    // 显示注册模态框
    showRegisterModal() {
        this.closeModal('login-modal');
        const modal = document.getElementById('register-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    // 关闭模态框
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // 更新UI
    updateUI() {
        const { currentUser } = AppState;
        
        if (currentUser) {
            const userPoints = document.getElementById('user-points');
            if (userPoints) {
                userPoints.textContent = currentUser.points.toFixed(2) + ' 积分';
            }
            
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                userAvatar.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username.charAt(0).toUpperCase()}`;
            }
            
            const adminLink = document.getElementById('admin-link');
            if (adminLink) {
                adminLink.style.display = currentUser.role === 'admin' ? 'block' : 'none';
            }
            
            // 显示用户区域，隐藏登录区域
            const userArea = document.getElementById('user-area');
            const loginArea = document.getElementById('login-area');
            if (userArea && loginArea) {
                userArea.style.display = 'flex';
                loginArea.style.display = 'none';
            }
        } else {
            const userPoints = document.getElementById('user-points');
            if (userPoints) {
                userPoints.textContent = '0.00 积分';
            }
            
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                userAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
            
            const adminLink = document.getElementById('admin-link');
            if (adminLink) {
                adminLink.style.display = 'none';
            }
            
            // 显示登录区域，隐藏用户区域
            const userArea = document.getElementById('user-area');
            const loginArea = document.getElementById('login-area');
            if (userArea && loginArea) {
                userArea.style.display = 'none';
                loginArea.style.display = 'flex';
            }
        }
    },

    // 更新收益倒计时
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

    // 显示面板
    showPanel(panelId) {
        const { currentUser } = AppState;
        if (!currentUser) {
            this.showLoginModal();
            return;
        }
        
        // 隐藏所有面板
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 显示选中的面板
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        // 更新导航链接状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-panel="${panelId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // 加载特定面板的数据
        if (panelId === 'synthesis-panel') {
            SynthesisManager.updateAvailableDolls();
        } else if (panelId === 'admin-panel' && currentUser.role === 'admin') {
            AdminManager.loadAdminData();
        }
    },

    // 更新交易记录显示
    updateTransactionHistory(transactions) {
        const historyContainer = document.getElementById('payout-history');
        if (!historyContainer) return;
        
        if (!transactions || transactions.length === 0) {
            historyContainer.innerHTML = '<p>暂无交易记录</p>';
            return;
        }
        
        const recentTransactions = transactions.slice(0, 5);
        let html = '';
        
        recentTransactions.forEach(tx => {
            const amountClass = tx.amount > 0 ? 'text-success' : 'text-danger';
            const amountSign = tx.amount > 0 ? '+' : '';
            
            html += `
                <div class="transaction-item">
                    <div class="transaction-type">${this.getTypeLabel(tx.type)}</div>
                    <div class="transaction-amount ${amountClass}">
                        ${amountSign}${tx.amount.toFixed(2)}
                    </div>
                    <div class="transaction-time">
                        ${new Date(tx.createdAt).toLocaleString()}
                    </div>
                    <div class="transaction-desc">${tx.description}</div>
                </div>
            `;
        });
        
        historyContainer.innerHTML = html;
    },

    // 获取交易类型标签
    getTypeLabel(type) {
        const labels = {
            'purchase': '购买',
            'synthesis': '合成',
            'income': '收益',
            'admin_adjust': '系统调整',
            'admin_grant': '管理员发放'
        };
        return labels[type] || type;
    }
};

// 导出到全局作用域
window.UIManager = UIManager;
