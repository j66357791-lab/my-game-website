// 游戏核心类 - 集成版本
class SpaceChallengeGame {
    constructor() {
        this.gameState = 'waiting';
        this.countdown = 30;
        this.userPoints = 0;
        this.userId = null;
        this.username = null;
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
        this.musicEnabled = true;
        this.volume = 0.7;
        this.musicStyle = 'mixed';
        this.countdownInterval = null;
        this.gameHistory = [];
        
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
        
        this.init();
    }

    async init() {
        // 检查登录状态
        if (!await this.checkLoginStatus()) {
            this.showLoginModal();
            return;
        }
        
        this.createStarBackground();
        this.createStarBetButtons();
        this.bindEvents();
        this.initAudio();
        this.initMusic();
        await this.loadUserInfo();
        await this.loadGameHistory();
        this.startNewRound();
    }

    // 检查登录状态
    async checkLoginStatus() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return false;
            
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('检查登录状态失败:', error);
            return false;
        }
    }

    // 显示登录弹窗
    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
    }

    // 加载用户信息
    async loadUserInfo() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.getUser, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.userId = userData.id;
                this.username = userData.username;
                this.userPoints = userData.points;
                
                document.getElementById('userId').textContent = this.username;
                document.getElementById('navUsername').textContent = this.username;
                this.updateDisplay();
            } else {
                throw new Error('获取用户信息失败');
            }
        } catch (error) {
            console.error('加载用户信息失败:', error);
            this.showMessage('加载用户信息失败，请重新登录');
            setTimeout(() => {
                location.href = '../index.html';
            }, 2000);
        }
    }

    // 更新用户积分
    async updateUserPoints(points) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.updatePoints, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ points })
            });
            
            if (response.ok) {
                this.userPoints = points;
                this.updateDisplay();
            } else {
                throw new Error('更新积分失败');
            }
        } catch (error) {
            console.error('更新积分失败:', error);
            this.showMessage('更新积分失败');
        }
    }

    // 保存游戏记录
    async saveGameRecord(gameData) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.saveGame, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(gameData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('游戏记录保存成功:', result.gameId);
            } else {
                throw new Error('保存游戏记录失败');
            }
        } catch (error) {
            console.error('保存游戏记录失败:', error);
            this.showMessage('保存游戏记录失败');
        }
    }

    // 加载游戏历史
    async loadGameHistory() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.getHistory, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                this.gameHistory = await response.json();
            } else {
                throw new Error('加载游戏历史失败');
            }
        } catch (error) {
            console.error('加载游戏历史失败:', error);
            this.gameHistory = [];
        }
    }

    // 退出按钮事件
    bindExitButton() {
        document.getElementById('exitButton').addEventListener('click', () => {
            if (confirm('确定要退出游戏吗？')) {
                location.href = '../index.html';
            }
        });
    }

    // 其他方法保持不变，只是将本地存储改为API调用...
    // 这里省略其他方法的代码，它们与之前基本相同
    // 只需要将localStorage操作改为API调用

    // 创建星空背景
    createStarBackground() {
        const starsContainer = document.getElementById('stars');
        if (!starsContainer) {
            const starsDiv = document.createElement('div');
            starsDiv.id = 'stars';
            starsDiv.className = 'stars';
            document.body.appendChild(starsDiv);
        }
        
        const container = document.getElementById('stars');
        for (let i = 0; i < 150; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.animationDuration = (Math.random() * 3 + 2) + 's';
            container.appendChild(star);
        }
    }

    // 其他所有方法保持与之前相同...
    // 为了节省空间，这里省略了重复的代码
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new SpaceChallengeGame();
    
    // 全局API接口
    window.SpaceGameAPI = {
        setUserInfo: (userId, points) => {
            game.userId = userId;
            game.userPoints = points;
            game.updateDisplay();
        },
        
        getGameData: () => {
            return {
                userId: game.userId,
                points: game.userPoints,
                gameHistory: game.gameHistory,
                currentBets: game.currentBets
            };
        },
        
        updatePoints: (points) => {
            game.updateUserPoints(points);
        }
    };
});
