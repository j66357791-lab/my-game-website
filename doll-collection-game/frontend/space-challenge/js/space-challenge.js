document.addEventListener('DOMContentLoaded', () => {
    let currentGameData = {};
    let selectedFighterId = null;
    let currentUser = null;

    // DOM 元素
    const timerEl = document.getElementById('timer');
    const userPointsEl = document.getElementById('user-points');
    const remainingQuotaEl = document.getElementById('remaining-quota');
    const betAmountInput = document.getElementById('bet-amount');
    const confirmBetBtn = document.getElementById('confirm-bet');

    // 检查用户登录状态
    checkUserStatus();

    async function checkUserStatus() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login.html';
                return;
            }

            const response = await fetch('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                console.log('用户已登录:', currentUser);
                fetchGameStatus();
                initWebSocket();
            } else {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('检查用户状态失败:', error);
            window.location.href = '/login.html';
        }
    }

    function initWebSocket() {
        // 连接WebSocket
        const socket = io();
        
        socket.on('space-game-timer', (data) => {
            timerEl.textContent = data.timeRemaining;
            currentGameData.status = data.status;
            
            // 根据状态更新UI
            const betButtons = document.querySelectorAll('.bet-button');
            betButtons.forEach(btn => {
                btn.disabled = (data.status !== 'betting');
            });
            confirmBetBtn.disabled = (data.status !== 'betting');
        });
        
        socket.on('space-game-win', (data) => {
            showNotification(`恭喜赢得 ${data.amount} 积分！`, 'success');
            userPointsEl.textContent = data.newPoints;
        });
        
        socket.on('space-game-bet', (data) => {
            // 更新实时动态
            updateLiveFeed(`${data.username} 对战机${data.fighterId}下注 ${data.amount} 积分`);
        });
    }

    async function fetchGameStatus() {
        if (!currentUser) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/space-game/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            currentGameData = data;

            // 更新UI
            timerEl.textContent = data.timeRemaining;
            userPointsEl.textContent = data.userPoints;
            remainingQuotaEl.textContent = data.remainingQuota;

            // 更新进度条
            updateProgressBars(data.timeRemaining);

            // 如果进入揭晓阶段，获取结果并显示动画
            if (data.status === 'revealing' && !document.body.classList.contains('revealing')) {
                document.body.classList.add('revealing');
                fetchAndRevealResults(data.sessionId);
            } else if (data.status === 'betting') {
                document.body.classList.remove('revealing');
                resetStars();
            }

        } catch (error) {
            console.error('获取游戏状态失败:', error);
        }
    }

    // 其他函数保持不变...
    // updateProgressBars, fetchAndRevealResults, revealBossStars, revealFighterStars, resetStars 等

    // 确认下注
    confirmBetBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showNotification('请先登录！', 'error');
            return;
        }

        if (!selectedFighterId || !betAmountInput.value) {
            showNotification('请选择战机并输入下注金额！', 'error');
            return;
        }

        const amount = parseInt(betAmountInput.value);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/api/space-game/bet', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ fighterId: selectedFighterId, amount: amount })
            });
            const result = await response.json();

            if (response.ok) {
                userPointsEl.textContent = result.newPoints;
                showNotification('下注成功！', 'success');
                fetchGameStatus();
            } else {
                showNotification(`下注失败: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('下注请求失败:', error);
            showNotification('下注请求失败，请重试。', 'error');
        }
    });

    function showNotification(message, type = 'info') {
        // 实现通知显示逻辑
        console.log(`[${type}] ${message}`);
    }

    function updateLiveFeed(message) {
        // 实现实时动态更新逻辑
        console.log('Live feed:', message);
    }
});
