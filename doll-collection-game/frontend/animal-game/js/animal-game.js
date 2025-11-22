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
        
        this.init();
    }

    async init() {
        try {
            // 先检查用户是否已登录
            const token = localStorage.getItem('token');
            if (!token) {
                // 如果没有token，跳转到主页登录
                window.location.href = '../';
                return;
            }

            // 获取当前用户信息
            this.currentUser = await this.getCurrentUser();
            
            if (!this.currentUser) {
                // 如果获取用户失败，跳转到主页
                window.location.href = '../';
                return;
            }

            console.log('✅ 用户登录成功:', this.currentUser);

            // 初始化Socket连接
            this.initSocket();
            
            // 绑定事件
            this.bindEvents();
            
            // 加载初始数据
            await this.loadInitialData();
            
            // 开始倒计时
            this.startTimer();
            
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            this.showToast('初始化失败，请刷新页面重试', 'error');
        }
    }

    async getCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return null;
            }

            // 从主页面获取用户信息
            const response = await fetch('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.user;
            } else {
                console.error('用户验证失败');
                return null;
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }
    }

    initSocket() {
        try {
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
        // 房间选择
        document.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectRoom(card.dataset.room);
            });
        });

        // 投注金额输入
        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.addEventListener('input', (e) => {
                this.currentBet = parseInt(e.target.value) || 0;
                this.updateBetButton();
            });
        }

        // 快速投注按钮
        document.querySelectorAll('.quick-bet').forEach(btn => {
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

        // 确认投注
        const confirmBtn = document.getElementById('confirmBet');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.placeBet();
            });
        }

        // 取消投注
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
            
            // 加载当前游戏状态
            const response = await fetch('/api/animal-game/current-round');
            const data = await response.json();
            
            console.log('📊 当前游戏状态:', data);
            
            if (data.roundNumber) {
                this.handleGameUpdate(data);
            }

            // 加载用户统计
            await this.loadUserStats();
            
            // 加载历史记录
            await this.loadHistory();
            
            // 更新余额显示
            this.updateBalance();
            
        } catch (error) {
            console.error('❌ 加载初始数据失败:', error);
        }
    }

    async loadUserStats() {
        try {
            const response = await fetch(`/api/animal-game/stats/${this.currentUser._id}`);
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
            const response = await fetch('/api/animal-game/history?limit=5');
            const history = await response.json();
            
            console.log('📜 历史记录:', history);
            
            const historyList = document.getElementById('historyList');
            
            if (!historyList) return;
            
            if (history.length === 0) {
                historyList.innerHTML = '<div class="history-empty">暂无记录</div>';
                return;
            }
            
            historyList.innerHTML = history.map(round => `
                <div class="history-item">
                    <div>第 ${round.roundNumber} 轮</div>
                    <div style="font-size: 12px; color: #999;">
                        ${round.isRageMode ? '🔥 狂暴模式' : '普通模式'} | 
                        ${round.totalPlayers} 人参与
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('❌ 加载历史记录失败:', error);
        }
    }

    selectRoom(roomName) {
        if (this.hasBet) {
            this.showToast('您已经投注，无法更换房间', 'warning');
            return;
        }

        // 更新选中状态
        document.querySelectorAll('.room-card').forEach(card => {
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
            const response = await fetch('/api/animal-game/bet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.currentUser._id,
                    roomName: this.selectedRoom,
                    betAmount: this.currentBet
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.hasBet = true;
                this.currentUser.points = result.balance;
                this.updateBalance();
                
                // 显示取消按钮
                const cancelBtn = document.getElementById('cancelBet');
                if (cancelBtn) {
                    cancelBtn.style.display = 'inline-block';
                }
                
                this.showToast('投注成功！', 'success');
                
                // 更新游戏状态
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
        // 这里可以实现取消投注的逻辑
        // 根据需求，可能需要调用后端API
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
        
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.updateBetButton();
        this.showToast('已取消投注', 'info');
    }

    handleNewRound(data) {
        console.log('🎮 处理新轮次:', data);
        
        this.currentRound = data;
        this.hasBet = false;
        this.selectedRoom = null;
        this.currentBet = 0;
        
        // 重置UI
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
        
        // 清除房间选中状态
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('selected', 'targeted');
        });
        
        // 更新房间信息
        this.updateRooms(data.rooms || []);
        
        // 重置计时器
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
        
        // 更新房间信息
        this.updateRooms(data.rooms || []);
        
        // 检查用户是否已经投注
        if (data.rooms) {
            for (const room of data.rooms) {
                const userInRoom = room.players.find(p => 
                    p.userId && (p.userId._id === this.currentUser._id || p.userId === this.currentUser._id)
                );
                if (userInRoom) {
                    this.hasBet = true;
                    this.selectedRoom = room.roomName;
                    this.currentBet = userInRoom.betAmount;
                    
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
        
        // 更新游戏模式显示
        const gameMode = document.getElementById('gameMode');
        if (gameMode) {
            if (isRageMode) {
                gameMode.textContent = '狂暴模式';
                gameMode.classList.add('rage');
            } else {
                gameMode.textContent = '普通模式';
                gameMode.classList.remove('rage');
            }
        }
        
        // 标记被袭击的房间
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('targeted');
            if (targets.includes(card.dataset.room)) {
                card.classList.add('targeted');
            }
        });
        
        // 显示结果
        this.showResult(data);
        
        // 更新用户统计和历史
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
        
        // 显示被袭击的房间
        if (targetRooms) {
            targetRooms.textContent = targets.join('、');
        }
        
        // 判断玩家结果
        const userRoom = this.selectedRoom;
        const isWin = !targets.includes(userRoom);
        
        if (playerResult) {
            if (isWin) {
                playerResult.className = 'player-result win';
                playerResult.innerHTML = `🎉 恭喜幸存！<br>获得 ${this.currentBet} 积分返还`;
                
                if (results && results.prizeShare) {
                    if (prizeInfo) {
                        prizeInfo.textContent = `额外奖励：${results.prizeShare} 积分`;
                    }
                }
            } else {
                playerResult.className = 'player-result lose';
                playerResult.innerHTML = `😢 很遗憾被猎人发现了<br>失去 ${this.currentBet} 积分`;
                
                if (results && results.candyShare) {
                    if (prizeInfo) {
                        prizeInfo.textContent = `获得 ${results.candyShare} 个糖果`;
                    }
                }
            }
        }
        
        resultSection.style.display = 'block';
        
        // 停止计时器
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
            
            // 更新进度环
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

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 动物大冒险页面加载完成');
    
    // 添加SVG渐变定义
    const svgNS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML = `
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
    `;
    
    const timerSvg = document.querySelector('.timer-svg');
    if (timerSvg) {
        timerSvg.appendChild(defs);
        
        // 初始化进度环
        const progress = document.getElementById('timerProgress');
        if (progress) {
            const circumference = 2 * Math.PI * 90;
            progress.style.strokeDasharray = circumference;
            progress.style.strokeDashoffset = 0;
        }
    }
    
    // 启动游戏
    new AnimalGame();
});
