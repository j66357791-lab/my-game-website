// 娃娃管理模块
const DollManager = {
    // 购买娃娃
    async buyDoll(level) {
        const { currentUser } = AppState;
        if (!currentUser) {
            UIManager.showLoginModal();
            return;
        }
        
        try {
            const response = await fetch(`${AppState.API_BASE}/dolls/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ level })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                AppState.updateState({ currentUser: data.user });
                
                if (data.doll && typeof data.doll === 'object') {
                    const { userDolls } = AppState;
                    userDolls.push(data.doll);
                    AppState.updateState({ userDolls });
                }
                
                UIManager.updateUI();
                UserDataManager.updateUserStats();
                UserDataManager.updateMyDollsList();
                alert(`成功购买${level}级娃娃！`);
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
