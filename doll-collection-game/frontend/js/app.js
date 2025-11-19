// 娃娃收藏游戏 - 前端JavaScript 主入口文件

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 初始化娃娃收藏游戏...');
    
    // 🔧 修复：按正确顺序初始化模块
    const initModules = async () => {
        try {
            // 1. 初始化应用状态
            if (window.AppState) {
                AppState.init();
                console.log('✅ AppState 初始化完成');
            }
            
            // 2. 初始化事件管理器
            if (window.EventManager) {
                EventManager.initEventListeners();
                console.log('✅ EventManager 初始化完成');
            }
            
            // 3. 初始化认证管理器
            if (window.AuthManager) {
                AuthManager.init();
                console.log('✅ AuthManager 初始化完成');
            }
            
            // 4. 初始化用户数据管理器
            if (window.UserDataManager) {
                UserDataManager.init();
                console.log('✅ UserDataManager 初始化完成');
            }
            
            // 5. 初始化UI管理器
            if (window.UIManager) {
                UIManager.updateUI();
                UIManager.updateCountdown();
                // 每分钟更新倒计时
                setInterval(() => UIManager.updateCountdown(), 60000);
                console.log('✅ UIManager 初始化完成');
            }
            
            // 6. 初始化娃娃管理器
            if (window.DollManager) {
                DollManager.init();
                console.log('✅ DollManager 初始化完成');
            }
            
            // 7. 初始化合成管理器
            if (window.SynthesisManager) {
                SynthesisManager.init();
                console.log('✅ SynthesisManager 初始化完成');
            }
            
            // 8. 初始化管理员管理器
            if (window.AdminManager) {
                AdminManager.init();
                console.log('✅ AdminManager 初始化完成');
            }
            
            // 9. 初始化系统管理器
            if (window.SystemManager) {
                SystemManager.init();
                console.log('✅ SystemManager 初始化完成');
            }
            
            // 10. 初始化收益管理器
            if (window.IncomeManager) {
                IncomeManager.init();
                console.log('✅ IncomeManager 初始化完成');
            }
            
            console.log('🎉 娃娃收藏游戏初始化完成');
            
            // 启动后台任务
            startBackgroundTasks();
            
        } catch (error) {
            console.error('❌ 模块初始化失败:', error);
        }
    };
    
    // 🔧 修复：延迟初始化，确保所有脚本加载完成
    setTimeout(initModules, 100);
    
    // 🔧 新增：全局错误处理
    window.addEventListener('error', function(e) {
        console.error('❌ 全局错误:', e.error);
    });
    
    // 🔧 新增：未处理的Promise拒绝
    window.addEventListener('unhandledrejection', function(e) {
        console.error('❌ 未处理的Promise拒绝:', e.reason);
    });
});

// 🔧 新增：启动后台任务
function startBackgroundTasks() {
    console.log('🔄 启动后台任务...');
    
    // 每30秒检查一次服务器状态
    setInterval(() => {
        if (window.SystemManager) {
            SystemManager.checkServerStatus();
        }
    }, 30000);
    
    // 每5分钟刷新一次用户数据（如果用户已登录）
    setInterval(() => {
        const { currentUser } = AppState;
        if (currentUser && window.UserDataManager) {
            UserDataManager.loadUserDolls();
        }
    }, 300000);
    
    // 每分钟检查收益发放
    setInterval(() => {
        const { currentUser } = AppState;
        if (currentUser && window.IncomeManager) {
            IncomeManager.checkDailyIncome();
        }
    }, 60000);
    
    console.log('✅ 后台任务启动完成');
}

// 🔧 新增：手动刷新数据的全局函数
window.refreshAllData = async function() {
    console.log('🔄 手动刷新所有数据...');
    
    const { currentUser } = AppState;
    if (!currentUser) {
        console.log('用户未登录，跳过数据刷新');
        return;
    }
    
    try {
        // 刷新用户娃娃数据
        if (window.UserDataManager) {
            await UserDataManager.loadUserDolls();
            UserDataManager.updateUserStats();
            UserDataManager.updateMyDollsList();
        }
        
        // 刷新合成页面数据
        if (window.SynthesisManager) {
            SynthesisManager.updateAvailableDolls();
        }
        
        // 刷新UI
        if (window.UIManager) {
            UIManager.updateUI();
        }
        
        console.log('✅ 数据刷新完成');
        
    } catch (error) {
        console.error('❌ 数据刷新失败:', error);
    }
};

// 🔧 新增：调试用的全局函数
window.debugAppState = function() {
    console.log('📊 当前应用状态:', AppState.getState());
};

window.debugCurrentUser = function() {
    console.log('👤 当前用户:', AppState.currentUser);
};

window.debugUserDolls = function() {
    console.log('🎯 用户娃娃:', AppState.userDolls);
};
