class AnimalGame {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentRound = null;
        this.selectedRoom = null;
        this.currentBet = 0;
        this.hasBet = false;
        this.timerInterval = null;
        this.roundStartTime = null;
        
        this.API_BASE = this.getApiBase();
        
        console.log('🎮 动物大冒险API基础地址:', this.API_BASE);
        
        setTimeout(() => this.init(), 100);
    }

    getApiBase() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        
        return '/api';
    }

    async init() {
        try {
            console.log('🎮 动物大冒险初始化开始...');
            
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('❌ 用户未登录，跳转主页');
                this.redirectToMain();
                return;
            }

            this.currentUser = await this.validateToken(token);
            
            if (!this.currentUser) {
                console.warn('❌ Token验证失败，跳转主页');
                this.redirectToMain();
                return;
            }

            console.log('✅ 用户登录成功:', this.currentUser);

            await this.waitForDOM();
            
            this.initSocket();
            
            this.bindEvents();
            
            await this.loadInitialData();
            
            this.startTimer();
            
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            this.showToast('初始化失败，请刷新页面重试', 'error');
        }
    }

    async waitForDOM() {
        const maxWait = 5000;
        const checkInterval = 100;
        let waited = 0;
        
        const requiredElements = [
            'userBalance', 'userCandies', 'roundNumber', 'timerValue',
            'roomsGrid', 'betAmount', 'confirmBet', 'toastContainer'
        ];
        
        while (waited < maxWait) {
            const missingElements = requiredElements.filter(id => !document.getElementById(id));
            
            if (missingElements.length === 0) {
                console.log('✅ DOM元素已就绪');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        console.error('❌ DOM加载超时，强制继续');
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${this.API_BASE}/auth/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                return userData.user;
            } else {
                console.error('Token验证失败:', response.status);
                return null;
            }
        } catch (error) {
            console.error('Token验证错误:', error);
            return null;
        }
    }

    redirectToMain() {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <div style="text-align: center; padding: 40px; background: rgba(255,255,255,0.1); border-radius: 15px; backdrop-filter: blur(10px);">
                    <h2 style="margin-bottom: 20px;">🎮 动物大冒险</h2>
                    <p style="margin-bottom: 20px;">请先登录后再进行游戏</p>
                    <div style="margin-top: 20px;">
                        <a href="../" style="color: white; text-decoration: none; padding: 12px 24px; border: 2px solid white; border-radius: 25px; display: inline-block; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='transparent'">
                            返回登录
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            window.location.href = '../';
        }, 3000);
    }

    initSocket() {
        try {
            if (typeof io === 'undefined') {
                console.error('❌ Socket.io未加载，等待加载...');
                setTimeout(() => this.initSocket(), 500);
                return;
            }

            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('✅ Socket连接成功');
                this.socket.emit('joinGame', { userId: this.currentUser._id });
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Socket连接断开');
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket连接错误:', error);
            });

            this.socket.on('newRound', (data) => {
                console.log('🎮 新轮次开始:', data);
                this.handleNewRound(data);
            });

            this.socket.on('gameUpdate', (data) => {
                console.log('🔄 游戏更新:', data);
                this.handleGameUpdate(data);
            });

            this.socket.on('roundEnd', (data) => {
                console.log('🏁 轮次结束:', data);
                this.handleRoundEnd(data);
            });

        } catch (error) {
            console.error('❌ Socket初始化失败:', error);
        }
    }

    bindEvents() {
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.addEventListener('click', () => {
                this.selectRoom(card.dataset.room);
            });
        });

        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.addEventListener('input', (e) => {
                this.currentBet = parseInt(e.target.value) || 0;
                this.updateBetButton();
            });
        }

        const quickBets = document.querySelectorAll('.quick-bet');
        quickBets.forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                if (amount === 'all') {
                    betInput.value = this.currentUser.points || 0;
                } else {
                    betInput.value = amount;
                }
                this.currentBet = parseInt(betInput.value) || 0;
                this.updateBetButton();
            });
        });

        const confirmBtn = document.getElementById('confirmBet');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.placeBet();
            });
        }

        const cancelBtn = document.getElementById('cancelBet');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelBet();
            });
        }
    }

    async loadInitialData() {
        try {
            console.log('📊 加载初始数据...');
            
            const response = await fetch(`${this.API_BASE}/animal-game/current-round`);
            const data = await response.json();
            
            console.log('📊 当前游戏状态:', data);
            
            if (data.roundNumber) {
                this.handleGameUpdate(data);
            }

            await this.loadUserStats();
            await this.loadHistory();
            this.updateBalance();
            
        } catch (error) {
            console.error('❌ 加载初始数据失败:', error);
        }
    }

    async loadUserStats() {
        try {
            const userId = this.currentUser._id || this.currentUser.id;
            if (!userId) {
                console.error('❌ 用户ID不存在');
                return;
            }
            
            console.log('📊 请求用户统计，用户ID:', userId);
            const response = await fetch(`${this.API_BASE}/animal-game/stats/${userId}`);
            
            if (!response.ok) {
                const text = await response.text();
                console.error('❌ 用户统计API错误:', response.status, text);
                return;
            }
            
            const stats = await response.json();
            console.log('📊 用户统计:', stats);
            
            const elements = {
                'totalGames': stats.totalGames || 0,
                'wins': stats.wins || 0,
                'losses': stats.losses || 0,
                'winRate': `${stats.winRate || 0}%`,
                'userCandies': stats.candies || 0
            };
            
            for (const [id, value] of Object.entries(elements)) {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            }
            
        } catch (error) {
            console.error('❌ 加载用户统计失败:', error);
        }
    }

    async loadHistory() {
        try {
            const response = await fetch(`${this.API_BASE}/animal-game/history?limit=5`);
            const history = await response.json();
            
            console.log('📜 历史记录:', history);
            
            const historyList = document.getElementById('historyList');
            
            if (!historyList) return;
            
            if (history.length === 0) {
                historyList.innerHTML = '<div class="history-empty">暂无记录</div>';
                return;
            }
            
            historyList.innerHTML = history.map(round => {
                // 修复：正确显示袭击的房间
                const targetRooms = round.targets && round.targets.length > 0 
                    ? `🏹 猎人袭击了: ${round.targets.join('、')}` 
                    : '🏹 猎人袭击了: 未知房间';
                    
                return `
                    <div class="history-item">
                        <div>第 ${round.roundNumber} 轮</div>
                        <div style="font-size: 12px; color: #999;">
                            ${round.totalPlayers} 人参与
                        </div>
                        <div style="font-size: 11px; color: #666; margin-top: 4px;">
                            ${targetRooms}
                            ${round.isRageMode ? ' | 🔥 暴走模式' : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('❌ 加载历史记录失败:', error);
        }
    }

    selectRoom(roomName) {
        // 修复：检查是否已经投注，如果已投注则不允许更换房间
        if (this.hasBet) {
            this.showToast('您已经投注，无法更换房间', 'warning');
            return;
        }

        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-room="${roomName}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        this.selectedRoom = roomName;
        this.updateBetButton();
    }

    updateBetButton() {
        const betBtn = document.getElementById('confirmBet');
        if (betBtn) {
            const canBet = this.selectedRoom && this.currentBet > 0 && !this.hasBet;
            betBtn.disabled = !canBet;
        }
    }

    async placeBet() {
        if (!this.selectedRoom || this.currentBet <= 0) {
            this.showToast('请选择房间并输入投注金额', 'warning');
            return;
        }

        if (this.currentBet > (this.currentUser.points || 0)) {
            this.showToast('积分不足', 'error');
            return;
        }

        const betBtn = document.getElementById('confirmBet');
        if (betBtn) {
            betBtn.classList.add('loading');
        }
        
        try {
            const userId = this.currentUser._id || this.currentUser.id;
            
            console.log('📍 发送投注请求:', {
                userId: userId,
                roomName: this.selectedRoom,
                betAmount: this.currentBet
            });
            
            const response = await fetch(`${this.API_BASE}/animal-game/bet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: userId,
                    roomName: this.selectedRoom,
                    betAmount: this.currentBet
                })
            });

            const result = await response.json();
            console.log('📍 投注响应:', result);
            
            if (result.success) {
                this.hasBet = true;
                this.currentUser.points = result.balance;
                this.updateBalance();
                
                const cancelBtn = document.getElementById('cancelBet');
                if (cancelBtn) {
                    cancelBtn.style.display = 'inline-block';
                }
                
                this.showToast('投注成功！', 'success');
                
                if (result.round) {
                    this.handleGameUpdate(result.round);
                }
            } else {
                this.showToast(result.error || '投注失败', 'error');
            }
            
        } catch (error) {
            console.error('❌ 投注错误:', error);
            this.showToast('网络错误，请重试', 'error');
        } finally {
            if (betBtn) {
                betBtn.classList.remove('loading');
            }
        }
    }

    async cancelBet() {
        // 修复：实现真正的取消投注功能
        if (!this.hasBet) {
            this.showToast('您还没有投注', 'info');
            return;
        }

        try {
            const userId = this.currentUser._id || this.currentUser.id;
            
            const response = await fetch(`${this.API_BASE}/animal-game/bet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: userId,
                    roomName: this.selectedRoom,
                    betAmount: 0 // 投注0表示取消
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.hasBet = false;
                this.selectedRoom = null;
                this.currentBet = 0;
                
                const betInput = document.getElementById('betAmount');
                if (betInput) {
                    betInput.value = '';
                }
                
                const cancelBtn = document.getElementById('cancelBet');
                if (cancelBtn) {
                    cancelBtn.style.display = 'none';
                }
                
                const roomCards = document.querySelectorAll('.room-card');
                roomCards.forEach(card => {
                    card.classList.remove('selected');
                });
                
                this.updateBetButton();
                this.showToast('已取消投注', 'info');
                
                if (result.round) {
                    this.handleGameUpdate(result.round);
                }
            } else {
                this.showToast(result.error || '取消投注失败', 'error');
            }
            
        } catch (error) {
            console.error('❌ 取消投注错误:', error);
            this.showToast('网络错误，请重试', 'error');
        }
    }

    handleNewRound(data) {
        console.log('🎮 处理新轮次:', data);
        
        this.currentRound = data;
        this.hasBet = false;
        this.selectedRoom = null;
        this.currentBet = 0;
        
        const roundNumber = document.getElementById('roundNumber');
        if (roundNumber) {
            roundNumber.textContent = data.roundNumber;
        }
        
        const timerValue = document.getElementById('timerValue');
        if (timerValue) {
            timerValue.textContent = '40';
        }
        
        const timerStatus = document.getElementById('timerStatus');
        if (timerStatus) {
            timerStatus.textContent = '游戏进行中';
        }
        
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.style.display = 'none';
        }
        
        const cancelBtn = document.getElementById('cancelBet');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.value = '';
        }
        
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.classList.remove('selected', 'targeted');
        });
        
        this.updateRooms(data.rooms || []);
        
        this.roundStartTime = new Date();
        this.startTimer();
        
        this.updateBetButton();
        this.showToast(`第 ${data.roundNumber} 轮开始！`, 'info');
    }

    handleGameUpdate(data) {
        console.log('🔄 处理游戏更新:', data);
        
        this.currentRound = data;
        
        if (data.roundNumber) {
            const roundNumber = document.getElementById('roundNumber');
            if (roundNumber) {
                roundNumber.textContent = data.roundNumber;
            }
        }
        
        this.updateRooms(data.rooms || []);
        
        // 修复：检查用户是否已经投注，但不自动选择房间
        if (data.rooms) {
            const userId = this.currentUser._id || this.currentUser.id;
            for (const room of data.rooms) {
                const userInRoom = room.players.find(p => 
                    p.userId && (p.userId._id === userId || p.userId === userId || p.userId._id === userId)
                );
                if (userInRoom) {
                    this.hasBet = true;
                    this.selectedRoom = room.roomName;
                    this.currentBet = userInRoom.betAmount;
                    
                    // 只标记已投注，不自动选择房间
                    const selectedCard = document.querySelector(`[data-room="${room.roomName}"]`);
                    if (selectedCard) {
                        selectedCard.classList.add('selected');
                    }
                    
                    const cancelBtn = document.getElementById('cancelBet');
                    if (cancelBtn) {
                        cancelBtn.style.display = 'inline-block';
                    }
                    
                    break;
                }
            }
        }
        
        this.updateBetButton();
    }

    handleRoundEnd(data) {
        console.log('🏁 处理轮次结束:', data);
        
        const { round, targets, isRageMode, results } = data;
        
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.classList.remove('targeted');
            if (targets.includes(card.dataset.room)) {
                card.classList.add('targeted');
            }
        });
        
        this.showResult(data);
        
        setTimeout(() => {
            this.loadUserStats();
            this.loadHistory();
        }, 1000);
    }

    updateRooms(rooms) {
        rooms.forEach(room => {
            const card = document.querySelector(`[data-room="${room.roomName}"]`);
            if (card) {
                const playerCount = card.querySelector('.player-count');
                const totalBet = card.querySelector('.total-bet');
                
                if (playerCount) {
                    playerCount.textContent = `${room.players.length} 人`;
                }
                if (totalBet) {
                    totalBet.textContent = `${room.totalBet} 积分`;
                }
            }
        });
    }

    showResult(data) {
        const { targets, isRageMode, results } = data;
        const resultSection = document.getElementById('resultSection');
        const targetRooms = document.getElementById('targetRooms');
        const playerResult = document.getElementById('playerResult');
        const prizeInfo = document.getElementById('prizeInfo');
        
        if (!resultSection) return;
        
        if (targetRooms) {
            if (targets && targets.length > 0) {
                const targetsText = targets.join('、');
                if (isRageMode) {
                    targetRooms.textContent = targetsText + ' (暴走模式)';
                    targetRooms.style.color = '#ff6b6b';
                } else {
                    targetRooms.textContent = targetsText;
                    targetRooms.style.color = '#ff4757';
                }
                targetRooms.style.fontWeight = 'bold';
            } else {
                targetRooms.textContent = '未知房间';
                targetRooms.style.color = '#ffa502';
            }
        }
        
        const userRoom = this.selectedRoom;
        const isWin = !targets.includes(userRoom);
        
        if (playerResult) {
            if (isWin) {
                playerResult.className = 'player-result win';
                let resultText = `🎉 恭喜幸存！<br>获得 ${this.currentBet} 积分返还`;
                
                if (results && results.prizeShare !== undefined) {
                    resultText += `<br>额外奖励：${results.prizeShare} 积分`;
                    this.currentUser.points = (this.currentUser.points || 0) + (results.prizeShare || 0);
                }
                
                playerResult.innerHTML = resultText;
                
                if (prizeInfo) {
                    const totalGain = this.currentBet + (results.prizeShare || 0);
                    prizeInfo.textContent = `总收益：${totalGain} 积分`;
                    prizeInfo.style.color = '#2ed573';
                }
            } else {
                playerResult.className = 'player-result lose';
                let resultText = `😢 很遗憾被猎人发现了<br>失去 ${this.currentBet} 积分`;
                
                if (results && results.candyShare !== undefined) {
                    resultText += `<br>获得 ${results.candyShare} 个糖果`;
                }
                
                playerResult.innerHTML = resultText;
                
                if (prizeInfo) {
                    prizeInfo.textContent = results.candyShare 
                        ? `获得 ${results.candyShare} 个糖果` 
                        : '本轮无收益';
                    prizeInfo.style.color = '#ff4757';
                }
                
                this.currentUser.points = (this.currentUser.points || 0) - this.currentBet;
            }
        }
        
        this.updateBalance();
        
        resultSection.style.display = 'block';
        
        this.stopTimer();
        
        const timerStatus = document.getElementById('timerStatus');
        if (timerStatus) {
            timerStatus.textContent = '本轮结束';
        }
    }

    startTimer() {
        this.stopTimer();
        
        this.timerInterval = setInterval(() => {
            if (!this.roundStartTime) return;
            
            const elapsed = Date.now() - this.roundStartTime.getTime();
            const remaining = Math.max(0, 40 - Math.floor(elapsed / 1000));
            
            const timerValue = document.getElementById('timerValue');
            if (timerValue) {
                timerValue.textContent = remaining;
            }
            
            const progress = document.getElementById('timerProgress');
            if (progress) {
                const circumference = 2 * Math.PI * 90;
                const offset = circumference - (remaining / 40) * circumference;
                progress.style.strokeDashoffset = offset;
            }
            
            if (remaining <= 0) {
                this.stopTimer();
            }
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateBalance() {
        const balanceElement = document.getElementById('userBalance');
        if (balanceElement) {
            balanceElement.textContent = this.currentUser.points || 0;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span>${icons[type]}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 动物大冒险页面加载完成');
    new AnimalGame();
});
