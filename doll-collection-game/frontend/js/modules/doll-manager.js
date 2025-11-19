// 娃娃管理模块
const DollManager = {
    // 初始化
    init() {
        console.log('DollManager 初始化...');
        this.setupEventListeners();
    },

    // 设置事件监听器
    setupEventListeners() {
        // 购买按钮事件已通过onclick绑定，无需额外设置
        console.log('DollManager 事件监听器设置完成');
    },

    // 购买娃娃
    async buyDoll(level) {
        const { currentUser } = AppState;
        if (!currentUser) {
            if (window.AuthManager) {
                AuthManager.showLoginModal();
            } else {
                alert('请先登录！');
            }
            return;
        }
        
        try {
            console.log(`开始购买${level}级娃娃...`);
            const response = await fetch(`${AppState.API_BASE}/dolls/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ level })
            });
            
            const data = await response.json();
            console.log('购买响应:', data);
            
            if (response.ok) {
                // 更新用户信息
                AppState.updateState({ currentUser: data.user });
                
                // 更新娃娃数据
                if (data.doll && typeof data.doll === 'object') {
                    const { userDolls } = AppState;
                    if (!userDolls) {
                        AppState.updateState({ userDolls: [] });
                    }
                    AppState.userDolls.push(data.doll);
                }
                
                // 更新UI
                if (window.UIManager) {
                    UIManager.updateUI();
                }
                
                // 更新用户数据管理器
                if (window.UserDataManager) {
                    UserDataManager.updateUserStats();
                    UserDataManager.updateMyDollsList();
                }
                
                // 更新收益管理器
                if (window.IncomeManager) {
                    IncomeManager.checkDailyIncome();
                }
                
                alert(`成功购买${level}级娃娃！`);
                
                // 刷新合成页面数据
                if (window.SynthesisManager) {
                    setTimeout(() => {
                        SynthesisManager.updateAvailableDolls();
                    }, 500);
                }
                
            } else {
                alert(data.message || '购买失败');
            }
        } catch (error) {
            console.error('购买娃娃错误:', error);
            alert('网络错误，请稍后重试');
        }
    }
};

// 导出到全局作用域
window.DollManager = DollManager;
