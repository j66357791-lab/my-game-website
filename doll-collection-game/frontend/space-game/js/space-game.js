// 太空挑战游戏 - 简化音效版本
class SpaceChallengeGame {
    constructor() {
        this.gameState = 'waiting';
        this.countdown = 30;
        this.userPoints = 0;
        this.userId = null;
        this.username = null;
        this.userToken = null;
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
        this.soundEnabled = true; // 只保留音效开关
        this.countdownInterval = null;
        this.gameHistory = [];
        this.pointsUpdateInterval = null;
        
        // API配置
        this.apiConfig = {
            baseUrl: '/api/space-game',
            endpoints: {
                getUser: '/user/info',
                updatePoints: '/user/points',
                saveGame: '/game/save',
                getHistory: '/game/history',
                getStatistics: '/game/statistics'
            }
        };
        
        // 认证API配置
        this.authConfig = {
            baseUrl: '/api/auth',
            endpoints: {
                login: '/login',
                register: '/register',
                validate: '/validate'
            }
        };
        
        this.init();
    }

    async init() {
        // 检查登录状态并自动加载用户信息
        if (!await this.checkAndLoadUserInfo()) {
            this.showLoginModal();
            return;
        }
        
        this.createStarBackground();
        this.createStarBetButtons();
        this.bindEvents();
        this.initAudio(); // 只保留音频初始化
        await this.loadGameHistory();
        this.startRealtimePointsMonitoring();
        this.startNewRound();
    }

    // 简化的音频初始化
    initAudio() {
        // 创建音频上下文
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 简化的音效定义
            this.sounds = {
                click: () => this.playTone(800, 0.1),           // 点击音效
                countdown: () => this.playTone(400, 0.2),    // 倒计时音效
                countdownUrgent: () => this.playTone(300, 0.3), // 紧急倒计时音效
                bet: () => this.playTone(600, 0.1),            // 投注音效
                star: () => this.playTone(1200, 0.08),        // 星级音效
                win: () => this.playMelody([523, 659, 784, 1047], 0.15), // 获胜音效
                lose: () => this.playMelody([784, 659, 523, 392], 0.15), // 失败音效
                gameStart: () => this.playTone(1000, 0.2)     // 游戏开始音效
            };
            
            console.log('音频系统初始化成功');
        } catch (error) {
            console.error('音频初始化失败:', error);
            // 创建空的音效对象，避免后续错误
            this.sounds = {
                click: () => {},
                countdown: () => {},
                countdownUrgent: () => {},
                bet: () => {},
                star: () => {},
                win: () => {},
                lose: () => {},
                gameStart: () => {}
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
            
            gainNode.gain.setValueAtTime(0.3 * (this.volume || 0.7), this.audioContext.currentTime);
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

    // 移除音乐相关方法
    // initMusic() - 已删除
    // startBackgroundMusic() - 已删除
    // generateElectronicMusic() - 已删除
    // generateOrchestralMusic() - 已删除
    // generateMixedMusic() - 已删除
    // musicGenerator - 已删除
    // currentMusic - 已删除
    // musicInterval - 已删除
    // musicStyle - 已删除
    // musicEnabled - 已删除

    // 修改倒计时方法，增强音效
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
                
                // 每5秒播放一次倒计时音效
                if (this.countdown % 5 === 0) {
                    this.sounds.countdown();
                }
                
                if (this.countdown <= 5) {
                    timerElement.classList.add('urgent');
                    // 最后5秒播放紧急倒计时音效
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

    // 修改开始游戏方法，增加游戏开始音效
    startGame() {
        this.gameState = 'showing';
        document.getElementById('countdownTimer').textContent = '游戏进行中...';
        
        // 播放游戏开始音效
        this.sounds.gameStart();
        
        // 计算星级
        this.calculateStars();
        
        // 显示星级动画
        this.showStarsAnimation();
    }

    // 修改投注方法，增加点击音效
    placeBet(type) {
        if (this.gameState !== 'betting') return;
        
        const betKey = type === 'red' ? 'redBetAmount' : type === 'blue' ? 'blueBetAmount' : 'drawBetAmount';
        let amount = 0;
        
        if (type === 'draw') {
            amount = parseInt(prompt('请输入平局投注金额:') || '0';
        } else {
            amount = parseInt(document.getElementById(betKey).value || '0');
        }
        
        if (amount <= 0) {
            this.showMessage('请输入有效的投注金额');
            return;
        }
        
        // 实时检查积分
        if (amount > this.userPoints) {
            this.showMessage(`积分不足！当前积分：${this.userPoints}`);
            return;
        }
        
        this.currentBets[type] = amount;
        this.selectedBets.add(type);
        
        // 更新按钮状态
        const buttonId = type + 'Bet';
        document.getElementById(buttonId).classList.add('selected');
        
        // 播放投注音效
        this.sounds.bet();
        
        this.updateDisplay();
    }

    // 修改星级投注方法，增加点击音效
    placeStarBet(star, color) {
        if (this.gameState !== 'betting') return;
        
        const amount = parseInt(prompt(`请输入${color === 'red' ? '红方' : '蓝方'}${star}星投注金额:`) || '0');
        
        if (amount <= 0) {
            this.showMessage('请输入有效的投注金额');
            return;
        }
        
        // 实时检查积分
        if (amount > this.userPoints) {
            this.showMessage(`积分不足！当前积分：${this.userPoints}`);
            return;
        }
        
        const betKey = color + 'Stars';
        this.currentBets[betKey][star - 1] = amount;
        this.selectedBets.add(`${color}Star${star}`);
        
        // 更新按钮状态
        document.querySelector(`.star-bet-button[data-star="${star}"][data-color="${color}"]`).classList.add('selected');
        
        // 播放投注音效
        this.sounds.bet();
        
        this.updateDisplay();
    }

    // 修改显示星级动画方法，增加星级音效
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

    // 修改显示星级方法，增加星级音效
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
                
                // 播放星级音效
                this.sounds.star();
                
                index++;
            } else {
                clearInterval(interval);
                if (callback) callback();
            }
        }, 200);
    }

    // 修改结算方法，增加音效
    async settleGame() {
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
        // [原有的收益计算代码保持不变]
        
        // 创建游戏记录
        const gameData = {
            round: this.gameHistory.length + 1,
            redStar: this.redStar,
            blueStar: this.blueStar,
            winner: winner,
            bets: this.currentBets,
            profit: profit,
            timestamp: new Date().toISOString()
        };
        
        // 保存游戏记录并更新积分
        await this.saveGameRecord(gameData);
        
        // 显示结果
        this.showResult(winner, profit, details);
        
        // 根据结果播放音效
        if (profit > 0) {
            this.sounds.win();
        } else if (profit < 0) {
            this.sounds.lose();
        }
    }

    // 修改绑定事件方法，增加点击音效
    bindEvents() {
        // 退出按钮
        this.bindExitButton();
        
        // 投注按钮
        document.getElementById('redBet').addEventListener('click', () => {
            this.sounds.click(); // 点击音效
            this.placeBet('red');
        });
        
        document.getElementById('blueBet').addEventListener('click', () => {
            this.sounds.click(); // 点击音效
            this.placeBet('blue');
        });
        
        document.getElementById('drawBet').addEventListener('click', () => {
            this.sounds.click(); // 点击音效
            this.placeBet('draw');
        });
        
        // 星级投注
        document.querySelectorAll('.star-bet-button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.sounds.click(); // 点击音效
                const star = parseInt(btn.dataset.star);
                const color = btn.dataset.color;
                this.placeStarBet(star, color);
            });
        });
        
        // 快速投注按钮
        document.querySelectorAll('.quick-bet').forEach(btn => {
            btn.addEventListener('click', () => {
                this.sounds.click(); // 点击音效
                const amount = parseInt(btn.dataset.amount);
                const input = btn.closest('.bet-amount-input').querySelector('input');
                input.value = amount;
            });
        });
        
        // 趋势按钮
        document.getElementById('trendButton').addEventListener('click', () => {
            this.sounds.click(); // 点击音效
            this.showTrendModal();
        });
        
        // 音乐控制按钮 - 简化为音效开关
        document.getElementById('musicControl').addEventListener('click', () => {
            this.sounds.click(); // 点击音效
            this.soundEnabled = !this.soundEnabled;
            
            // 更新按钮图标
            const btn = document.getElementById('musicControl');
            btn.innerHTML = this.soundEnabled ? '🔊' : '🔇';
            btn.title = this.soundEnabled ? '音效开启' : '音效关闭';
            
            // 显示提示
            this.showMessage(this.soundEnabled ? '音效已开启' : '音效已关闭');
        });
        
        // 其他事件绑定保持不变...
        // [保留原有的其他事件绑定代码]
    }

    // 移除音乐控制面板相关方法
    // showMusicPanel() - 已删除
    // hideMusicPanel() - 已删除

    // 修改显示消息方法，增加音效
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
        
        // 播放提示音效
        this.sounds.click();
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // 移除音量控制相关方法
    // updateVolume() - 已删除

    // 移除音乐风格选择相关方法
    // setMusicStyle() - 已删除

    // 其他方法保持不变...
    // [保留原有的其他方法代码]
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new SpaceChallengeGame();
    
    // 全局API接口
    window.SpaceGameAPI = {
        setUserInfo: (userId, points) => {
            game.userId = userId;
            game.userPoints = points;
            game.updateUserInfo();
        },
        
        getGameData: () => {
            return {
                userId: game.userId,
                username: game.username,
                points: game.userPoints,
                gameHistory: game.gameHistory,
                currentBets: game.currentBets
            };
        },
        
        updatePoints: (points) => {
            game.updateUserPoints(points);
        },
        
        refreshUserInfo: async () => {
            await game.loadUserInfo();
        },
        
        // 新增：音效控制API
        toggleSound: () => {
            game.soundEnabled = !game.soundEnabled;
            return game.soundEnabled;
        },
        
        setSoundEnabled: (enabled) => {
            game.soundEnabled = enabled;
            const btn = document.getElementById('musicControl');
            if (btn) {
                btn.innerHTML = enabled ? '🔊' : '🔇';
                btn.title = enabled ? '音效开启' : '音效关闭';
            }
        }
    };
    
    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
        if (window.game) {
            window.game.destroy();
        }
    });
});
AAAEAAAAAAABXQVZfYpD4AAABXQVZfYpD4AAAAAAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQVZfYpD4AAABXQV