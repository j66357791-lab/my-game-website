class AnimalAdventureGame {
    constructor() {
        this.currentRound = null;
        this.selectedRoom = null;
        this.userBalance = 0;
        this.userCandies = 0;
        this.timer = null;
        this.socket = io();
        
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
        this.socket.emit('join-game');
        
        this.socket.on('round-end', (data) => {
            this.handleRoundEnd(data);
        });
    }

    async loadGameStatus() {
        try {
            const response = await fetch('/api/animal-adventure/status');
            const data = await response.json();
            
            this.currentRound = data;
            this.userBalance = data.userBalance;
            
            this.updateUI();
            this.startTimer();
        } catch (error) {
            console.error('加载游戏状态失败:', error);
        }
    }

    async loadHistory() {
        try {
            const response = await fetch('/api/animal-adventure/history');
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
            const response = await fetch('/api/animal-adventure/bet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
        const playerBet = this.currentRound.playerBet;
        if (playerBet) {
            const isSurvivor = !data.hunterRooms.includes(playerBet.room);
            
            if (isSurvivor) {
                title.textContent = '🎉 幸存成功！';
                details.innerHTML = `
                    <p>你选择了安全的${this.getRoomName(playerBet.room)}</p>
                    <p>获得积分: ${playerBet.reward || 0}</p>
                    <p>获得糖果: ${playerBet.candies || 0}</p>
                `;
            } else {
                title.textContent = '😢 被猎人抓住了！';
                details.innerHTML = `
                    <p>你选择的${this.getRoomName(playerBet.room)}被猎人袭击了</p>
                    <p>获得糖果: ${playerBet.candies || 0}</p>
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
        document.getElementById('userCandies').textContent = this.userCandies || 0;
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
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new AnimalAdventureGame();
});
