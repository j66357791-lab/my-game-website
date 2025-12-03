// 太空挑战游戏 - 独立文件
// 游戏核心类
class SpaceChallengeGame {
    constructor() {
        this.gameState = 'waiting'; // waiting, betting, showing, result
        this.countdown = 30;
        this.userPoints = 10000;
        this.userId = 'GUEST';
        this.currentBets = {
            red: 0,
            blue: 0,
            draw: 0,
            redStars: new Array(10).fill(0),
            blueStars: new Array(10).fill(0)
        };
        this.selectedBets = new Set();
        this.redStar = 0;
        this.blueStar = 0;
        this.soundEnabled = true;
        this.countdownInterval = null;
        this.gameHistory = this.loadGameHistory();
        
        // API配置
        this.apiConfig = {
            baseUrl: window.location.origin,
            endpoints: {
                saveGame: '/api/space-game/save',
                getHistory: '/api/space-game/history',
                updatePoints: '/api/user/points'
            }
        };
        
        this.init();
    }

    init() {
        this.createStarBackground();
        this.createStarBetButtons();
        this.bindEvents();
        this.initAudio();
        this.startNewRound();
    }

    // 创建星空背景
    createStarBackground() {
        const starsContainer = document.getElementById('stars');
        for (let i = 0; i < 150; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.animationDuration = (Math.random() * 3 + 2) + 's';
            starsContainer.appendChild(star);
        }
    }

    // 创建星级投注按钮
    createStarBetButtons() {
        const redGrid = document.getElementById('redStarBetGrid');
        const blueGrid = document.getElementById('blueStarBetGrid');
        
        for (let i = 1; i <= 10; i++) {
            // 红方星级按钮
            const redButton = document.createElement('button');
            redButton.className = 'star-bet-button';
            redButton.dataset.star = i;
            redButton.dataset.color = 'red';
            redButton.innerHTML = `${i}⭐<br><small>9.5x</small>`;
            redGrid.appendChild(redButton);
            
            // 蓝方星级按钮
            const blueButton = document.createElement('button');
            blueButton.className = 'star-bet-button';
            blueButton.dataset.star = i;
            blueButton.dataset.color = 'blue';
            blueButton.innerHTML = `${i}⭐<br><small>9.5x</small>`;
            blueGrid.appendChild(blueButton);
        }
    }

    // 初始化音效
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            this.sounds = {
                click: () => this.playTone(800, 0.1),
                countdown: () => this.playTone(400, 0.2),
                countdownUrgent: () => this.playTone(300, 0.3),
                bet: () => this.playTone(600, 0.1),
                star: () => this.playTone(1200, 0.08),
                win: () => this.playMelody([523, 659, 784, 1047], 0.15),
                lose: () => this.playMelody([784, 659, 523, 392], 0.15)
            };
            
            console.log('音效系统初始化成功');
        } catch (error) {
            console.error('音效初始化失败:', error);
            this.sounds = {
                click: () => {},
                countdown: () => {},
                countdownUrgent: () => {},
                bet: () => {},
                star: () => {},
                win: () => {},
                lose: () => {}
            };
        }
    }

    // 播放音调
    playTone(frequency, duration) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            console.error('播放音调失败:', error);
        }
    }

    // 播放旋律
    playMelody(frequencies, duration) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            frequencies.forEach((freq, index) => {
                setTimeout(() => this.playTone(freq, duration), index * duration * 1000);
            });
        } catch (error) {
            console.error('播放旋律失败:', error);
        }
    }

    // 绑定事件
    bindEvents() {
        // 退出按钮
        const exitButton = document.getElementById('exitButton');
        if (exitButton) {
            exitButton.addEventListener('click', () => {
                if (confirm('确定要退出游戏吗？')) {
                    this.exitGame();
                }
            });
        }

        // 投注按钮
        const redBet = document.getElementById('redBet');
        const blueBet = document.getElementById('blueBet');
        const drawBet = document.getElementById('drawBet');
        
        if (redBet) redBet.addEventListener('click', () => this.placeBet('red'));
        if (blueBet) blueBet.addEventListener('click', () => this.placeBet('blue'));
        if (drawBet) drawBet.addEventListener('click', () => this.placeBet('draw'));

        // 星级投注
        document.querySelectorAll('.star-bet-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const star = parseInt(btn.dataset.star);
                const color = btn.dataset.color;
                this.placeStarBet(star, color);
            });
        });

        // 快速投注按钮
        document.querySelectorAll('.quick-bet').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.amount);
                const input = btn.closest('.bet-amount-input').querySelector('input');
                input.value = amount;
            });
        });

        // 趋势按钮
        const trendButton = document.getElementById('trendButton');
        if (trendButton) {
            trendButton.addEventListener('click', () => this.showTrendModal());
        }

        // 音效控制按钮
        const soundControl = document.getElementById('soundControl');
        if (soundControl) {
            soundControl.addEventListener('click', () => this.toggleSound());
        }

        // 关闭按钮
        const closeTrend = document.getElementById('closeTrend');
        const closeResult = document.getElementById('closeResult');
        
        if (closeTrend) closeTrend.addEventListener('click', () => this.hideTrendModal());
        if (closeResult) closeResult.addEventListener('click', () => this.hideResultModal());
    }

    // 切换音效
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        
        const btn = document.getElementById('soundControl');
        btn.innerHTML = this.soundEnabled ? '🔊' : '🔇';
        btn.title = this.soundEnabled ? '音效开启' : '音效关闭';
        
        this.showMessage(this.soundEnabled ? '音效已开启' : '音效已关闭');
    }

    // 退出游戏
    exitGame() {
        // 返回主界面
        if (window.showPanel) {
            window.showPanel('user-panel');
        }
    }

    // 开始新回合
    startNewRound() {
        this.gameState = 'betting';
        this.countdown = 30;
        this.currentBets = {
            red: 0,
            blue: 0,
            draw: 0,
            redStars: new Array(10).fill(0),
            blueStars: new Array(10).fill(0)
        };
        this.selectedBets.clear();
        this.redStar = 0;
        this.blueStar = 0;
        
        // 清空星级显示
        document.getElementById('redStars').innerHTML = '';
        document.getElementById('blueStars').innerHTML = '';
        
        // 清除选中状态
        document.querySelectorAll('.bet-button, .star-bet-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 清空投注金额
        document.getElementById('redBetAmount').value = '';
        document.getElementById('blueBetAmount').value = '';
        
        // 移除获胜动画
        document.querySelectorAll('.spaceship').forEach(ship => {
            ship.classList.remove('winner');
        });
        
        // 更新显示
        this.updateDisplay();
        
        // 开始倒计时
        this.startCountdown();
    }

    // 倒计时
    startCountdown() {
        const timerElement = document.getElementById('countdownTimer');
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        this.countdownInterval = setInterval(() => {
            this.countdown--;
            
            if (this.countdown > 0) {
                timerElement.textContent = `投注时间: ${this.countdown}秒`;
                timerElement.classList.remove('urgent');
                
                if (this.countdown % 5 === 0) {
                    this.sounds.countdown();
                }
                
                if (this.countdown <= 5) {
                    timerElement.classList.add('urgent');
                    if (this.countdown <= 3) {
                        this.sounds.countdownUrgent();
                    }
                }
            } else {
                clearInterval(this.countdownInterval);
                this.startGame();
            }
        }, 1000);
    }

    // 开始游戏
    startGame() {
        this.gameState = 'showing';
        document.getElementById('countdownTimer').textContent = '游戏进行中...';
        
        // 计算星级
        this.calculateStars();
        
        // 显示星级动画
        this.showStarsAnimation();
    }

    // 投注
    placeBet(type) {
        if (this.gameState !== 'betting') return;
        
        const betKey = type === 'red' ? 'redBetAmount' : type === 'blue' ? 'blueBetAmount' : 'drawBetAmount';
        let amount = 0;
        
        if (type === 'draw') {
            amount = parseInt(prompt('请输入平局投注金额:') || '0');
        } else {
            amount = parseInt(document.getElementById(betKey).value || '0');
        }
        
        if (amount <= 0) {
            this.showMessage('请输入有效的投注金额');
            return;
        }
        
        if (amount > this.userPoints) {
            this.showMessage(`积分不足！当前积分：${this.userPoints}`);
            return;
        }
        
        this.currentBets[type] = amount;
        this.selectedBets.add(type);
        
        // 更新按钮状态
        const buttonId = type + 'Bet';
        document.getElementById(buttonId).classList.add('selected');
        
        this.updateDisplay();
        this.sounds.bet();
    }

    // 星级投注
    placeStarBet(star, color) {
        if (this.gameState !== 'betting') return;
        
        const amount = parseInt(prompt(`请输入${color === 'red' ? '红方' : '蓝方'}${star}星投注金额:`) || '0');
        
        if (amount <= 0) {
            this.showMessage('请输入有效的投注金额');
            return;
        }
        
        if (amount > this.userPoints) {
            this.showMessage(`积分不足！当前积分：${this.userPoints}`);
            return;
        }
        
        this.currentBets[color + 'Stars'][star - 1] = amount;
        this.selectedBets.add(`${color}Star${star}`);
        
        // 更新按钮状态
        document.querySelector(`.star-bet-button[data-star="${star}"][data-color="${color}"]`).classList.add('selected');
        
        this.updateDisplay();
        this.sounds.bet();
    }

    // 计算星级
    calculateStars() {
        // 红方随机1-10星
        this.redStar = Math.floor(Math.random() * 10) + 1;
        
        // 蓝方概率调整，控制平局率约5%
        if (Math.random() < 0.05) {
            // 5%概率平局
            this.blueStar = this.redStar;
        } else {
            // 95%概率产生不同结果
            do {
                this.blueStar = Math.floor(Math.random() * 10) + 1;
            } while (this.blueStar === this.redStar);
        }
    }

    // 显示星级动画
    showStarsAnimation() {
        // 显示红方星级
        this.displayStars('red', this.redStar, () => {
            // 显示蓝方星级
            setTimeout(() => {
                this.displayStars('blue', this.blueStar, () => {
                    // 结算
                    setTimeout(() => this.settleGame(), 1000);
                });
            }, 500);
        });
    }

    // 显示星级
    displayStars(color, count, callback) {
        const container = document.getElementById(color + 'Stars');
        container.innerHTML = '';
        
        let index = 0;
        const interval = setInterval(() => {
            if (index < count) {
                const star = document.createElement('span');
                star.className = 'star-icon';
                star.textContent = '⭐';
                star.style.animationDelay = `${index * 0.1}s`;
                container.appendChild(star);
                
                this.sounds.star();
                
                index++;
            } else {
                clearInterval(interval);
                if (callback) callback();
            }
        }, 200);
    }

    // 结算游戏
    settleGame() {
        this.gameState = 'result';
        
        let winner = '';
        let profit = 0;
        let details = [];
        
        // 判断胜负
        if (this.redStar > this.blueStar) {
            winner = 'red';
            document.getElementById('redSpaceship').classList.add('winner');
        } else if (this.blueStar > this.redStar) {
            winner = 'blue';
            document.getElementById('blueSpaceship').classList.add('winner');
        } else {
            winner = 'draw';
        }
        
        // 计算收益
        if (this.currentBets.red > 0) {
            if (winner === 'red') {
                profit += this.currentBets.red * 0.95;
                details.push(`红方投注: +${(this.currentBets.red * 0.95).toFixed(0)}`);
            } else {
                profit -= this.currentBets.red;
                details.push(`红方投注: -${this.currentBets.red}`);
            }
        }
        
        if (this.currentBets.blue > 0) {
            if (winner === 'blue') {
                profit += this.currentBets.blue * 0.95;
                details.push(`蓝方投注: +${(this.currentBets.blue * 0.95).toFixed(0)}`);
            } else {
                profit -= this.currentBets.blue;
                details.push(`蓝方投注: -${this.currentBets.blue}`);
            }
        }
        
        if (this.currentBets.draw > 0) {
            if (winner === 'draw') {
                profit += this.currentBets.draw * 9.5;
                details.push(`平局投注: +${(this.currentBets.draw * 9.5).toFixed(0)}`);
            } else {
                profit -= this.currentBets.draw;
                details.push(`平局投注: -${this.currentBets.draw}`);
            }
        }
        
        // 红方星级投注结算
        this.currentBets.redStars.forEach((amount, index) => {
            if (amount > 0) {
                const star = index + 1;
                if (this.redStar === star) {
                    profit += amount * 9.5;
                    details.push(`红方${star}星: +${(amount * 9.5).toFixed(0)}`);
                } else {
                    profit -= amount;
                    details.push(`红方${star}星: -${amount}`);
                }
            }
        });
        
        // 蓝方星级投注结算
        this.currentBets.blueStars.forEach((amount, index) => {
            if (amount > 0) {
                const star = index + 1;
                if (this.blueStar === star) {
                    profit += amount * 9.5;
                    details.push(`蓝方${star}星: +${(amount * 9.5).toFixed(0)}`);
                } else {
                    profit -= amount;
                    details.push(`蓝方${star}星: -${amount}`);
                }
            }
        });
        
        // 更新积分
        this.userPoints += profit;
        
        // 保存游戏记录
        const gameRecord = {
            round: this.gameHistory.length + 1,
            redStar: this.redStar,
            blueStar: this.blueStar,
            winner: winner,
            profit: profit,
            timestamp: new Date().toISOString()
        };
        this.saveGameRecord(gameRecord);
        
        // 显示结果
        this.showResult(winner, profit, details);
    }

    // 保存游戏记录
    async saveGameRecord(gameData) {
        try {
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.saveGame, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ gameRecord: gameData })
            });
            
            if (response.ok) {
                this.gameHistory.unshift(gameData);
                if (this.gameHistory.length > 10) {
                    this.gameHistory = this.gameHistory.slice(0, 10);
                }
                this.saveGameHistory();
            }
        } catch (error) {
            console.log('本地保存游戏记录');
            this.gameHistory.unshift(gameData);
            if (this.gameHistory.length > 10) {
                this.gameHistory = this.gameHistory.slice(0, 10);
            }
            this.saveGameHistory();
        }
    }

    // 加载游戏历史
    loadGameHistory() {
        const saved = localStorage.getItem('spaceGameHistory');
        return saved ? JSON.parse(saved) : [];
    }

    // 保存游戏历史
    saveGameHistory() {
        localStorage.setItem('spaceGameHistory', JSON.stringify(this.gameHistory));
    }

    // 显示结果
    showResult(winner, profit, details) {
        const modal = document.getElementById('resultModal');
        const title = document.getElementById('resultTitle');
        const detailsEl = document.getElementById('resultDetails');
        const profitEl = document.getElementById('resultProfit');
        
        // 设置标题
        if (winner === 'red') {
            title.textContent = '🔴 红方获胜！';
        } else if (winner === 'blue') {
            title.textContent = '🔵 蓝方获胜！';
        } else {
            title.textContent = '🤝 平局！';
        }
        
        // 设置详情
        detailsEl.innerHTML = `
            红方: ${this.redStar}⭐ vs 蓝方: ${this.blueStar}⭐<br>
            ${details.join('<br>')}
        `;
        
        // 设置收益
        if (profit > 0) {
            profitEl.textContent = `+${profit.toFixed(0)} 积分`;
            profitEl.className = 'result-profit win';
            this.sounds.win();
        } else if (profit < 0) {
            profitEl.textContent = `${profit.toFixed(0)} 积分`;
            profitEl.className = 'result-profit lose';
            this.sounds.lose();
        } else {
            profitEl.textContent = '0 积分';
            profitEl.className = 'result-profit';
        }
        
        // 显示弹窗
        modal.classList.add('show');
        
        // 更新显示
        this.updateDisplay();
        
        // 同步积分到主系统
        this.syncPointsToMainSystem();
    }

    // 同步积分到主系统
    async syncPointsToMainSystem() {
        try {
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.updatePoints, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ points: this.userPoints })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.userPoints = data.points;
                this.updateDisplay();
                
                // 通知主系统更新积分显示
                if (window.updateUserPoints) {
                    window.updateUserPoints(this.userPoints);
                }
            }
        } catch (error) {
            console.error('同步积分失败:', error);
        }
    }

    // 显示趋势弹窗
    showTrendModal() {
        const modal = document.getElementById('trendModal');
        modal.classList.add('show');
        this.drawTrendChart();
        this.updateStatistics();
    }

    // 隐藏趋势弹窗
    hideTrendModal() {
        const modal = document.getElementById('trendModal');
        modal.classList.remove('show');
    }

    // 隐藏结果弹窗
    hideResultModal() {
        const modal = document.getElementById('resultModal');
        modal.classList.remove('show');
        this.startNewRound();
    }

    // 绘制3D趋势图
    drawTrendChart() {
        const canvas = document.getElementById('trendChart');
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.gameHistory.length === 0) {
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('暂无游戏数据', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // 设置3D效果参数
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.3;
        
        // 绘制3D坐标轴
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        
        // X轴
        ctx.beginPath();
        ctx.moveTo(50, canvas.height - 50);
        ctx.lineTo(canvas.width - 50, canvas.height - 50);
        ctx.stroke();
        
        // Y轴
        ctx.beginPath();
        ctx.moveTo(50, 50);
        ctx.lineTo(50, canvas.height - 50);
        ctx.stroke();
        
        // 绘制网格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 10; i++) {
            const y = canvas.height - 50 - (i - 1) * (canvas.height - 100) / 9;
            ctx.beginPath();
            ctx.moveTo(50, y);
            ctx.lineTo(canvas.width - 50, y);
            ctx.stroke();
        }
        
        // 绘制数据点和连线
        const dataPoints = this.gameHistory.slice(0, 10).reverse();
        const stepX = (canvas.width - 100) / Math.max(dataPoints.length - 1, 1);
        
        // 红方数据线
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        dataPoints.forEach((record, index) => {
            const x = 50 + index * stepX;
            const y = canvas.height - 50 - (record.redStar - 1) * (canvas.height - 100) / 9;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // 蓝方数据线
        ctx.strokeStyle = '#4444ff';
        ctx.shadowColor = '#4444ff';
        ctx.beginPath();
        dataPoints.forEach((record, index) => {
            const x = 50 + index * stepX;
            const y = canvas.height - 50 - (record.blueStar - 1) * (canvas.height - 100) / 9;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // 绘制数据点
        ctx.shadowBlur = 0;
        dataPoints.forEach((record, index) => {
            const x = 50 + index * stepX;
            const redY = canvas.height - 50 - (record.redStar - 1) * (canvas.height - 100) / 9;
            const blueY = canvas.height - 50 - (record.blueStar - 1) * (canvas.height - 100) / 9;
            
            // 红方点
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(x, redY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // 蓝方点
            ctx.fillStyle = '#4444ff';
            ctx.beginPath();
            ctx.arc(x, blueY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // 期数标签
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`#${dataPoints.length - index}`, x, canvas.height - 30);
        });
        
        // 图例
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(canvas.width - 150, 20, 15, 15);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('红方', canvas.width - 130, 32);
        
        ctx.fillStyle = '#4444ff';
        ctx.fillRect(canvas.width - 150, 45, 15, 15);
        ctx.fillStyle = 'white';
        ctx.fillText('蓝方', canvas.width - 130, 57);
    }

    // 更新统计信息
    updateStatistics() {
        const statsContainer = document.getElementById('statistics');
        
        if (this.gameHistory.length === 0) {
            statsContainer.innerHTML = '<div class="stat-card"><div class="stat-value">0</div><div class="stat-label">总局数</div></div>';
            return;
        }
        
        const redWins = this.gameHistory.filter(g => g.winner === 'red').length;
        const blueWins = this.gameHistory.filter(g => g.winner === 'blue').length;
        const draws = this.gameHistory.filter(g => g.winner === 'draw').length;
        
        // 计算最常见的星级
        const starCounts = {};
        for (let i = 1; i <= 10; i++) {
            starCounts[i] = 0;
        }
        
        this.gameHistory.forEach(record => {
            starCounts[record.redStar]++;
            starCounts[record.blueStar]++;
        });
        
        const mostCommonStar = Object.keys(starCounts).reduce((a, b) => 
            starCounts[a] > starCounts[b] ? a : b
        );
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${this.gameHistory.length}</div>
                <div class="stat-label">总局数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${redWins}</div>
                <div class="stat-label">红方获胜</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${blueWins}</div>
                <div class="stat-label">蓝方获胜</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${draws}</div>
                <div class="stat-label">平局</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${mostCommonStar}⭐</div>
                <div class="stat-label">最常见星级</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(redWins / this.gameHistory.length * 100).toFixed(1)}%</div>
                <div class="stat-label">红方胜率</div>
            </div>
        `;
    }

    // 更新显示
    updateDisplay() {
        document.getElementById('userPoints').textContent = this.userPoints.toFixed(0);
        
        const totalBets = this.currentBets.red + this.currentBets.blue + 
                         this.currentBets.draw + 
                         this.currentBets.redStars.reduce((a, b) => a + b, 0) +
                         this.currentBets.blueStars.reduce((a, b) => a + b, 0);
        document.getElementById('currentBets').textContent = totalBets;
    }

    // 显示消息
    showMessage(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 1.2em;
            z-index: 2000;
            animation: fadeIn 0.3s;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        this.sounds.click();
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // 设置用户信息（外部调用）
    setUserInfo(userId, points) {
        this.userId = userId;
        this.userPoints = points;
        this.updateDisplay();
    }

    // 获取游戏数据（外部调用）
    getGameData() {
        return {
            userId: this.userId,
            points: this.userPoints,
            gameHistory: this.gameHistory,
            currentBets: this.currentBets
        };
    }

    // 手动更新积分（外部调用）
    updatePoints(points) {
        this.userPoints = points;
        this.updateDisplay();
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    // 等待主系统加载完成
    setTimeout(() => {
        if (!window.spaceGame) {
            window.spaceGame = new SpaceChallengeGame();
            
            // 添加全局API接口
            window.SpaceGameAPI = {
                setUserInfo: (userId, points) => {
                    window.spaceGame.setUserInfo(userId, points);
                },
                
                getGameData: () => {
                    return window.spaceGame.getGameData();
                },
                
                updatePoints: (points) => {
                    window.spaceGame.updatePoints(points);
                }
            };
        }
    }, 100);
});
