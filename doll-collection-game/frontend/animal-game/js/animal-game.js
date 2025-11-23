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
                this.socket.emit('joinGame', { userId: this.currentUser.id });
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Socket连接断开');
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket连接错误:', error);
            });

            this.socket.on('newRound', (data) => {
                console.log('🎯 新轮次开始:', data);
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

            this.socket.on('login-success', (data) => {
                console.log('👤 登录成功:', data);
                this.currentUser = data;
                this.updateUserInfo();
            });

        } catch (error) {
            console.error('❌ Socket初始化失败:', error);
        }
    }

    bindEvents() {
        console.log('初始化动物大冒险事件监听器...');
        
        // 房间选择
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.addEventListener('click', () => {
                this.selectRoom(card.dataset.room);
            });
        });

        // 投注金额选择
        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.addEventListener('input', (e) => {
                this.currentBet = parseInt(e.target.value) || 0;
                this.updateBetButton();
            });
        }

        // 快速投注按钮
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

        // 确认投注按钮
        const confirmBtn = document.getElementById('confirmBet');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.placeBet();
            });
        }

        // 取消投注按钮
        const cancelBtn = document.getElementById('cancelBet');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelBet();
            });
        }

        // 返回主页按钮
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                window.location.href = '../';
            });
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadInitialData();
            });
        }

        console.log('事件监听器初始化完成');
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

    selectRoom(roomName) {
        if (this.hasBet) {
            this.showToast('您已经投注，更换房间将取消当前投注', 'info');
        }

        // 重置所有房间选择
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        // 选择新房间
        const selectedCard = document.querySelector(`[data-room="${roomName}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        this.selectedRoom = roomName;
        this.updateBetButton();
        
        console.log('选择房间:', roomName);
    }

    updateBetButton() {
        const betBtn = document.getElementById('confirmBet');
        if (betBtn) {
            const canBet = this.selectedRoom && this.currentBet > 0 && !this.hasBet;
            betBtn.disabled = !canBet;
            
            const btnText = betBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = this.hasBet ? '重新投注' : '确认投注';
            }
        }
    }

    async placeBet() {
        if (!this.currentUser) {
            this.showToast('请先登录！', 'error');
            return;
        }
        
        if (!this.selectedRoom || this.currentBet <= 0) {
            this.showToast('请选择房间并输入投注金额！', 'warning');
            return;
        }
        
        if (!this.currentRound || this.currentRound.status !== 'active') {
            this.showToast('游戏未开始或已结束！', 'warning');
            return;
        }
        
        if (this.currentBet > (this.currentUser.points || 0)) {
            this.showToast('积分不足！', 'error');
            return;
        }
        
        const betBtn = document.getElementById('confirmBet');
        if (betBtn) {
            betBtn.classList.add('loading');
        }
        
        try {
            const userId = this.currentUser.id || this.currentUser._id;
            console.log('📍 发送投注请求:', {
                userId,
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
                    userId,
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
                this.updateBetButton();
                
                // 显示取消按钮
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
            this.showToast('网络错误，请稍后重试', 'error');
        } finally {
            if (betBtn) {
                betBtn.classList.remove('loading');
            }
        }
    }

    async cancelBet() {
        console.log('🚫 取消投注');
        
        this.hasBet = false;
        this.selectedRoom = null;
        this.currentBet = 0;
        
        // 重置投注输入
        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.value = '';
        }
        
        // 隐藏取消按钮
        const cancelBtn = document.getElementById('cancelBet');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        // 重置房间选择
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        this.updateBetButton();
        this.showToast('已取消投注，请重新选择房间', 'info');
    }

    handleNewRound(data) {
        console.log('🎯 处理新轮次:', data);
        
        this.currentRound = data;
        this.hasBet = false;
        this.selectedRoom = null;
        this.currentBet = 0;
        
        // 更新轮次信息
        const roundNumber = document.getElementById('roundNumber');
        if (roundNumber) {
            roundNumber.textContent = data.roundNumber;
        }
        
        // 重置倒计时
        const timerValue = document.getElementById('timerValue');
        if (timerValue) {
            timerValue.textContent = '40';
        }
        
        // 重置房间状态
        this.resetAllRooms();
        
        // 更新房间信息
        this.updateRooms(data.rooms || []);
        
        // 重置结果区域
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.style.display = 'none';
        }
        
        // 隐藏取消按钮
        const cancelBtn = document.getElementById('cancelBet');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        // 重置投注输入
        const betInput = document.getElementById('betAmount');
        if (betInput) {
            betInput.value = '';
        }
        
        this.roundStartTime = new Date();
        this.startTimer();
        
        this.updateBetButton();
        this.showToast(`第 ${data.roundNumber} 轮游戏开始！`, 'info');
    }

    handleGameUpdate(data) {
        console.log('🔄 处理游戏更新:', data);
        
        this.currentRound = data;
        
        // 更新轮次信息
        if (data.roundNumber) {
            const roundNumber = document.getElementById('roundNumber');
            if (roundNumber) {
                roundNumber.textContent = data.roundNumber;
            }
        }
        
        // 重置所有房间状态
        this.resetAllRooms();
        
        // 更新房间信息
        this.updateRooms(data.rooms || []);
        
        // 检查用户是否已经投注
        if (data.rooms) {
            const userId = this.currentUser.id || this.currentUser._id;
            let userHasBet = false;
            
            for (const room of data.rooms) {
                const userInRoom = room.players.find(p => {
                    const pId = p.userId ? p.userId.toString() : p.userId;
                    const cId = userId ? userId.toString() : userId;
                    return pId === cId || pId === userId || p.userId === userId;
                });
                
                if (userInRoom) {
                    this.hasBet = true;
                    this.selectedRoom = room.roomName;
                    this.currentBet = userInRoom.betAmount;
                    userHasBet = true;
                    
                    console.log(`📍 用户已在 ${room.roomName} 投注 ${userInRoom.betAmount} 积分`);
                    
                    // 显示取消按钮
                    const cancelBtn = document.getElementById('cancelBet');
                    if (cancelBtn) {
                        cancelBtn.style.display = 'inline-block';
                    }
                    
                    break;
                }
            }
            
            if (!userHasBet) {
                this.hasBet = false;
                this.selectedRoom = null;
                this.currentBet = 0;
            }
        }
        
        this.updateBetButton();
    }

    handleRoundEnd(data) {
        console.log('🏁 处理轮次结束:', data);
        
        const { round, targets, isRageMode, results } = data;
        
        // 标记被袭击的房间
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.classList.remove('targeted');
            if (targets.includes(card.dataset.room)) {
                card.classList.add('targeted');
            }
        });
        
        // 处理用户结果
        this.processUserResult(data);
        
        // 停止计时器
        this.stopTimer();
        
        // 更新计时器状态
        const timerStatus = document.getElementById('timerStatus');
        if (timerStatus) {
            timerStatus.textContent = '本轮结束';
        }
    }

    processUserResult(data) {
        console.log('🎯 处理用户结果:', data);
        
        const { round, targets, isRageMode, results } = data;
        const userRoom = this.selectedRoom;
        const userInTargetRoom = targets.includes(userRoom);
        const userInWinnerRoom = !userInTargetRoom;
        
        let message = '';
        let pointsChange = 0;
        
        if (userInWinnerRoom) {
            // 用户获胜
            const winnerResult = results.winnerResults.find(r => {
                const rId = r.userId ? r.userId.toString() : r.userId;
                const cId = this.currentUser.id ? this.currentUser.id.toString() : this.currentUser.id;
                return rId === cId;
            });
            
            if (winnerResult) {
                pointsChange = winnerResult.actualReceive;
                message = `🎉 恭喜幸存！获得 ${pointsChange} 积分（本金${winnerResult.principalReturn}+奖金${winnerResult.prizeShare}-手续费${winnerResult.fee}）`;
                
                // 更新用户积分
                this.currentUser.points = (this.currentUser.points || 0) + pointsChange;
                
                console.log(`💰 积分返还: +${pointsChange}, 新积分: ${this.currentUser.points}`);
            } else {
                message = '🎉 恭喜幸存！';
            }
        } else {
            // 用户失败
            const loserResult = results.loserResults.find(r => {
                const rId = r.userId ? r.userId.toString() : r.userId;
                const cId = this.currentUser.id ? this.currentUser.id.toString() : this.currentUser.id;
                return rId === cId;
            });
            
            if (loserResult) {
                pointsChange = -loserResult.betAmount;
                message = `💔 很遗憾，失去 ${loserResult.betAmount} 积分，获得 ${loserResult.candyShare} 个糖果`;
                
                // 更新用户积分
                this.currentUser.points = (this.currentUser.points || 0) + pointsChange;
                
                console.log(`💰 积分扣除: ${pointsChange}, 新积分: ${this.currentUser.points}`);
            } else {
                message = '💔 很遗憾，本轮失败';
            }
        }
        
        if (isRageMode) {
            message += ' (暴走模式)';
        }
        
        // 显示结果
        this.showResult(data, message, userInWinnerRoom);
        
        // 更新用户信息
        this.updateBalance();
        
        // 重新加载统计数据
        this.loadUserStats();
        
        // 添加到历史记录
        this.addToHistory(round);
    }

    showResult(data, message, isWin) {
        const resultSection = document.getElementById('resultSection');
        const targetRooms = document.getElementById('targetRooms');
        const playerResult = document.getElementById('playerResult');
        const prizeInfo = document.getElementById('prizeInfo');
        
        if (!resultSection) return;
        
        // 显示被袭击的房间
        if (targetRooms) {
            if (data.targets && data.targets.length > 0) {
                const targetsText = data.targets.join('、');
                if (data.isRageMode) {
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
        
        // 显示玩家结果
        if (playerResult) {
            playerResult.className = `player-result ${isWin ? 'win' : 'lose'}`;
            playerResult.innerHTML = message;
        }
        
        // 显示收益信息
        if (prizeInfo) {
            if (isWin) {
                const totalGain = this.currentBet + (data.results.prizeShare || 0);
                prizeInfo.textContent = `总收益：${totalGain} 积分`;
                prizeInfo.style.color = '#2ed573';
            } else {
                prizeInfo.textContent = data.results.candyShare 
                    ? `获得 ${data.results.candyShare} 个糖果` 
                    : '本轮无收益';
                prizeInfo.style.color = '#ff4757';
            }
        }
        
        resultSection.style.display = 'block';
    }

    resetAllRooms() {
        const roomCards = document.querySelectorAll('.room-card');
        roomCards.forEach(card => {
            card.classList.remove('selected', 'targeted');
            const playerCount = card.querySelector('.player-count');
            const totalBet = card.querySelector('.total-bet');
            
            if (playerCount) {
                playerCount.textContent = '0 人';
            }
            if (totalBet) {
                totalBet.textContent = '0 积分';
            }
        });
    }

    updateRooms(rooms) {
        console.log('🔄 更新房间数据:', rooms);
        
        rooms.forEach(room => {
            const card = document.querySelector(`[data-room="${room.roomName}"]`);
            if (card) {
                const playerCount = card.querySelector('.player-count');
                const totalBet = card.querySelector('.total-bet');
                
                const actualPlayerCount = room.players ? room.players.length : 0;
                const actualTotalBet = room.totalBet || 0;
                
                if (playerCount) {
                    playerCount.textContent = `${actualPlayerCount} 人`;
                }
                if (totalBet) {
                    totalBet.textContent = `${actualTotalBet} 积分`;
                }
            }
        });
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

    async updateBalance() {
        const balanceElement = document.getElementById('userBalance');
        if (balanceElement) {
            const points = this.currentUser.points || 0;
            balanceElement.textContent = points.toFixed(2) + ' 积分';
            console.log(`💰 更新积分显示: ${points}`);
        }
    }

    async loadUserStats() {
        if (!this.currentUser) return;
        
        try {
            const userId = this.currentUser.id || this.currentUser._id;
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
            
            // 更新UI
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

    addToHistory(round) {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const targetRooms = round.targets && round.targets.length > 0 
            ? `🏹 猎人袭击了: ${round.targets.join('、')}` 
            : '🏹 猎人袭击了: 未知房间';
            
        historyItem.innerHTML = `
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
        
        // 添加到历史记录顶部
        historyList.insertBefore(historyItem, historyList.firstChild);
        
        // 限制历史记录数量
        const historyItems = historyList.querySelectorAll('.history-item');
        if (historyItems.length > 10) {
            historyList.removeChild(historyList.lastChild);
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
        
        // 显示动画
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
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
    new AnimalGame();
});
