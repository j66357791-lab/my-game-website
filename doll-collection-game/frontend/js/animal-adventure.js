class AnimalAdventureGame {
    constructor() {
        this.currentRound = null;
        this.selectedRoom = null;
        this.userBalance = 0;
        this.userCandies = 0;
        this.timer = null;
        this.socket = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.connectSocket();
        this.loadGameStatus();
        this.loadHistory();
    }

    bindEvents() {
        // 房间选择
        document.querySelectorAll('.room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectRoom(e.currentTarget.dataset.room);
            });
        });

        // 投注控制
        document.getElementById('confirmBet').addEventListener('click', () => {
            this.placeBet();
        });

        // 快速投注
        document.querySelectorAll('.quick-bet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = e.currentTarget.dataset.amount;
                if (amount === 'all') {
                    document.getElementById('betAmount').value = this.userBalance;
                } else {
                    document.getElementById('betAmount').value = amount;
                }
            });
        });

        // 模态框关闭
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('roundResultModal').style.display = 'none';
        });
    }

    connectSocket() {
        // 初始化Socket.IO
        this.socket = io();
        
        this.socket.emit('join-adventure');
        
        this.socket.on('adventure-new-round', (data) => {
            this.handleNewRound(data);
        });
        
        this.socket.on('adventure-round-end', (data) => {
            this.handleRoundEnd(data);
        });
    }

    async loadGameStatus() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/animal-adventure/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            this.currentRound = data;
            this.userBalance = data.userBalance;
            this.userCandies = data.userCandies || 0;
            
            this.updateUI();
            this.startTimer();
        } catch (error) {
            console.error('加载游戏状态失败:', error);
            this.showMessage('加载游戏状态失败，请刷新页面重试');
        }
    }

    async loadHistory() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/animal-adventure/history', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const history = await response.json();
            
            this.displayHistory(history);
        } catch (error) {
            console.error('加载历史记录失败:', error);
        }
    }

    selectRoom(room) {
        if (this.currentRound && this.currentRound.status === 'active') {
            // 清除之前的选择
            document.querySelectorAll('.room-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // 标记新选择
            document.querySelector(`[data-room="${room}"]`).classList.add('selected');
            this.selectedRoom = room;
        } else {
            this.showMessage('游戏未开始或已结束');
        }
    }

    async placeBet() {
        const betAmount = parseInt(document.getElementById('betAmount').value);
        
        if (!this.selectedRoom) {
            this.showMessage('请先选择一个房间！');
            return;
        }
        
        if (!betAmount || betAmount <= 0) {
            this.showMessage('请输入有效的投注金额！');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/animal-adventure/bet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    room: this.selectedRoom,
                    betAmount: betAmount
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.userBalance = data.balance;
                this.updateUI();
                this.showMessage('投注成功！');
            } else {
                this.showMessage(data.error || '投注失败！');
            }
        } catch (error) {
            console.error('投注失败:', error);
            this.showMessage('网络错误，请重试！');
        }
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.timer = setInterval(() => {
            if (this.currentRound && this.currentRound.status === 'active') {
                const timeLeft = Math.max(0, Math.ceil(this.currentRound.timeLeft / 1000));
                document.getElementById('timer').textContent = timeLeft;
                
                if (timeLeft <= 3) {
                    document.getElementById('timer').style.background = '#ff4444';
                } else {
                    document.getElementById('timer').style.background = '#ff6b6b';
                }
                
                if (timeLeft === 0) {
                    clearInterval(this.timer);
                }
            }
        }, 1000);
    }

    handleNewRound(data) {
        this.currentRound = data;
        document.getElementById('roundId').textContent = data.roundId;
        
        // 清除房间状态
        document.querySelectorAll('.room-btn').forEach(btn => {
            btn.classList.remove('danger', 'safe');
        });
        
        this.startTimer();
    }

    handleRoundEnd(data) {
        // 显示结果
        const modal = document.getElementById('roundResultModal');
        const title = document.getElementById('resultTitle');
        const details = document.getElementById('resultDetails');
        
        // 标记房间状态
        document.querySelectorAll('.room-btn').forEach(btn => {
            btn.classList.remove('danger', 'safe');
            if (data.hunterRooms.includes(btn.dataset.room)) {
                btn.classList.add('danger');
            } else {
                btn.classList.add('safe');
            }
        });
        
        // 检查玩家结果
        const playerResult = data.results.find(r => r.userId === this.getUserId());
        if (playerResult) {
            if (playerResult.isSurvivor) {
                title.textContent = '🎉 幸存成功！';
                details.innerHTML = `
                    <p>你选择了安全的${this.getRoomName(playerResult.room)}</p>
                    <p>获得积分: ${playerResult.reward || 0}</p>
                    <p>获得糖果: ${playerResult.candies || 0}</p>
                `;
            } else {
                title.textContent = '😢 被猎人抓住了！';
                details.innerHTML = `
                    <p>你选择的${this.getRoomName(playerResult.room)}被猎人袭击了</p>
                    <p>获得糖果: ${playerResult.candies || 0}</p>
                `;
            }
        } else {
            title.textContent = '轮次结束';
            details.innerHTML = `
                <p>猎人袭击了: ${data.hunterRooms.map(room => this.getRoomName(room)).join(', ')}</p>
                ${data.isRageMode ? '<p style="color: red;">⚠️ 狂暴模式启动！</p>' : ''}
            `;
        }
        
        modal.style.display = 'block';
        
        // 3秒后刷新状态
        setTimeout(() => {
            this.loadGameStatus();
            this.loadHistory();
        }, 3000);
    }

    getRoomName(room) {
        const names = {
            grassland: '草丛地',
            bushes: '灌木丛',
            forest: '森林',
            lake: '湖泊',
            cave: '洞穴'
        };
        return names[room] || room;
    }

    displayHistory(history) {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = `history-item ${item.isSurvivor ? 'win' : 'lose'}`;
            
            div.innerHTML = `
                <span>第${item.roundId}轮 - ${this.getRoomName(item.room)}</span>
                <span>${item.isSurvivor ? '+' : '-'}${item.betAmount}积分</span>
            `;
            
            historyList.appendChild(div);
        });
    }

    updateUI() {
        document.getElementById('roundId').textContent = this.currentRound.roundId;
        document.getElementById('userBalance').textContent = this.userBalance;
        document.getElementById('userCandies').textContent = this.userCandies;
    }

    showMessage(message) {
        const messageEl = document.getElementById('gameMessage');
        messageEl.textContent = message;
        messageEl.style.color = '#ff6b6b';
        
        setTimeout(() => {
            messageEl.style.color = '#666';
            messageEl.textContent = '选择一个房间进行躲避！';
        }, 3000);
    }

    getUserId() {
        // 从token中解析用户ID
        const token = localStorage.getItem('token');
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id;
        } catch (e) {
            return null;
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new AnimalAdventureGame();
});
