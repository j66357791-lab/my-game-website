// 龟兔赛跑游戏独立JavaScript
const API_BASE = 'https://tianchuang.onrender.com/api';

// 全局变量
let currentUser = null;
let currentRace = null;
let raceInterval = null;
let raceAnimationInterval = null;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化龟兔赛跑游戏...');
    
    // 初始化事件监听器
    initEventListeners();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 加载游戏数据
    loadRacingGame();
    
    // 检查服务器连接状态
    checkServerStatus();
});

// 初始化事件监听器
function initEventListeners() {
    console.log('初始化事件监听器...');
    
    // 登录表单
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // 退出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 下注金额输入
    const betAmount = document.getElementById('bet-amount');
    if (betAmount) {
        betAmount.addEventListener('input', validateBetAmount);
    }
    
    // 管理员链接
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html#admin-panel';
        });
    }
    
    console.log('事件监听器初始化完成');
}

// 检查服务器状态
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            document.getElementById('server-status').textContent = '在线';
            document.getElementById('server-status').style.color = 'green';
        } else {
            document.getElementById('server-status').textContent = '离线';
            document.getElementById('server-status').style.color = 'red';
        }
    } catch (error) {
        document.getElementById('server-status').textContent = '连接失败';
        document.getElementById('server-status').style.color = 'red';
        console.error('服务器连接失败:', error);
    }
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        validateToken(token);
    } else {
        showLoginModal();
    }
}

// 验证token
async function validateToken(token) {
    try {
        const response = await fetch(`${API_BASE}/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData.user;
            updateUI();
        } else {
            localStorage.removeItem('token');
            showLoginModal();
        }
    } catch (error) {
        console.error('Token验证失败:', error);
        showLoginModal();
    }
}

// 显示登录模态框
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

// 显示注册模态框
function showRegisterModal() {
    closeModal('login-modal');
    document.getElementById('register-modal').style.display = 'flex';
}

// 关闭模态框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUI();
            closeModal('login-modal');
            loadRacingGame();
        } else {
            alert(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('注册成功！请登录。');
            showLoginModal();
        } else {
            alert(data.message || '注册失败');
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 处理退出
function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateUI();
    showLoginModal();
}

// 更新UI
function updateUI() {
    if (currentUser) {
        document.getElementById('user-points').textContent = currentUser.points.toFixed(2) + ' 积分';
        document.getElementById('user-avatar').innerHTML = `<i class="fas fa-user"></i> ${currentUser.username.charAt(0).toUpperCase()}`;
        
        if (currentUser.role === 'admin') {
            document.getElementById('admin-link').style.display = 'block';
        }
    } else {
        document.getElementById('user-points').textContent = '0.00 积分';
        document.getElementById('user-avatar').innerHTML = '<i class="fas fa-user"></i>';
        document.getElementById('admin-link').style.display = 'none';
    }
}

// 加载龟兔赛跑游戏
async function loadRacingGame() {
    if (!currentUser) {
        showLoginModal();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/racing/current`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentRace = data.race;
            updateRaceUI(data);
            startRaceTimer();
        } else {
            console.error('获取比赛信息失败');
        }
    } catch (error) {
        console.error('加载比赛错误:', error);
    }

    // 加载历史记录
    loadRacingHistory();
    loadMyBetsHistory();
}

// 更新比赛UI
function updateRaceUI(data) {
    const { race, userBet, betStats } = data;

    // 更新比赛基本信息
    document.getElementById('race-id').textContent = race.id;
    document.getElementById('race-state').textContent = getRaceStatusText(race.state);
    
    // 更新奖池信息
    document.getElementById('rabbit-pool').textContent = race.rabbitPool;
    document.getElementById('turtle-pool').textContent = race.turtlePool;
    document.getElementById('draw-pool').textContent = race.drawPool;
    document.getElementById('total-pool').textContent = race.totalPool;

    // 更新下注信息
    updateBetInfo(userBet);
    
    // 更新下注统计
    updateBetStats(betStats);

    // 更新下注按钮状态
    updateBetButtons(userBet, race.state);

    // 显示或隐藏动画
    const animation = document.getElementById('race-animation');
    if (race.state === 'racing') {
        animation.style.display = 'block';
        startRaceAnimation(race);
    } else {
        animation.style.display = 'none';
    }

    // 如果比赛结束，显示结果
    if (race.state === 'finished' && race.result) {
        showRaceResult(race);
    }
}

// 获取比赛状态文本
function getRaceStatusText(state) {
    switch (state) {
        case 'waiting':
            return '等待玩家下注...';
        case 'betting':
            return '下注进行中...';
        case 'racing':
            return '比赛进行中...';
        case 'finished':
            return '比赛已结束';
        default:
            return '未知状态';
    }
}

// 更新下注信息
function updateBetInfo(userBet) {
    const myBetInfo = document.getElementById('my-bet-info');
    
    if (userBet) {
        let optionText = '';
        if (userBet.option === 'rabbit') {
            optionText = '兔子';
        } else if (userBet.option === 'turtle') {
            optionText = '乌龟';
        } else {
            optionText = '平局';
        }
        myBetInfo.textContent = `已下注: ${optionText} (${userBet.amount}积分)`;
    } else {
        myBetInfo.textContent = '未下注';
    }
}

// 更新下注统计
function updateBetStats(betStats) {
    document.getElementById('total-bets').textContent = betStats.totalBets;
    document.getElementById('rabbit-bets').textContent = `${betStats.rabbitBets}人 (${betStats.rabbitAmount}积分)`;
    document.getElementById('turtle-bets').textContent = `${betStats.turtleBets}人 (${betStats.turtleAmount}积分)`;
    document.getElementById('draw-bets').textContent = `${betStats.drawBets}人 (${betStats.drawAmount}积分)`;
}

// 更新下注按钮状态
function updateBetButtons(userBet, raceState) {
    const betButtons = document.querySelectorAll('.btn-bet');
    const betOptions = document.querySelectorAll('.bet-option');
    
    if (userBet || raceState !== 'betting') {
        betButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = userBet ? '已下注' : '已截止';
        });
        
        // 高亮显示用户下注的选项
        betOptions.forEach(option => {
            option.classList.remove('winner');
            if (userBet && option.dataset.option === userBet.option) {
                option.classList.add('winner');
            }
        });
    } else {
        betButtons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = '下注';
        });
        
        betOptions.forEach(option => {
            option.classList.remove('winner');
        });
    }
}

// 开始比赛计时器
function startRaceTimer() {
    if (raceInterval) {
        clearInterval(raceInterval);
    }

    raceInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/racing/current`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                currentRace = data.race;
                updateRaceUI(data);

                // 更新倒计时
                updateRaceTimer(currentRace);

                // 如果比赛结束，清除计时器
                if (currentRace.state === 'finished') {
                    clearInterval(raceInterval);
                    // 5秒后重新加载比赛
                    setTimeout(loadRacingGame, 5000);
                }
            }
        } catch (error) {
            console.error('更新比赛错误:', error);
        }
    }, 1000);
}

// 更新比赛倒计时
function updateRaceTimer(race) {
    const timerElement = document.getElementById('race-timer');
    
    if (race.state === 'betting' && race.bettingEndTime) {
        const now = new Date();
        const endTime = new Date(race.bettingEndTime);
        const timeLeft = Math.max(0, endTime - now);
        const seconds = Math.floor(timeLeft / 1000);
        
        timerElement.textContent = `00:${seconds.toString().padStart(2, '0')}`;
        
        // 最后10秒闪烁效果
        if (seconds <= 10) {
            timerElement.style.color = '#ff6b6b';
            if (seconds % 2 === 0) {
                timerElement.style.opacity = '1';
            } else {
                timerElement.style.opacity = '0.5';
            }
        } else {
            timerElement.style.color = 'var(--primary)';
            timerElement.style.opacity = '1';
        }
    } else if (race.state === 'racing' && race.raceEndTime) {
        const now = new Date();
        const endTime = new Date(race.raceEndTime);
        const timeLeft = Math.max(0, endTime - now);
        const seconds = Math.floor(timeLeft / 1000);
        
        timerElement.textContent = `00:${seconds.toString().padStart(2, '0')}`;
        timerElement.style.color = '#4ecdc4';
    } else {
        timerElement.textContent = '00:00';
        timerElement.style.color = 'var(--primary)';
        timerElement.style.opacity = '1';
    }
}

// 验证下注金额
function validateBetAmount() {
    const amountInput = document.getElementById('bet-amount');
    const amount = parseInt(amountInput.value);
    const userPoints = currentUser ? currentUser.points : 0;
    
    if (amount > userPoints) {
        amountInput.style.borderColor = '#ff6b6b';
    } else {
        amountInput.style.borderColor = '#ddd';
    }
}

// 设置快速下注金额
function setBetAmount(amount) {
    const amountInput = document.getElementById('bet-amount');
    const userPoints = currentUser ? currentUser.points : 0;
    
    if (amount <= userPoints) {
        amountInput.value = amount;
        validateBetAmount();
    } else {
        alert('积分不足');
    }
}

// 下注
async function placeBet(option) {
    if (!currentUser) {
        showLoginModal();
        return;
    }

    const amountInput = document.getElementById('bet-amount');
    const amount = parseInt(amountInput.value);

    if (!amount || amount <= 0) {
        alert('请输入有效的下注金额');
        return;
    }

    if (currentUser.points < amount) {
        alert('积分不足');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/racing/bet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ option, amount })
        });

        const data = await response.json();

        if (response.ok) {
            alert('下注成功！');
            currentUser.points = data.user.points;
            updateUI();
            loadRacingGame();
        } else {
            alert(data.message || '下注失败');
        }
    } catch (error) {
        console.error('下注错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 开始比赛动画
function startRaceAnimation(race) {
    const rabbit = document.getElementById('rabbit-runner');
    const turtle = document.getElementById('turtle-runner');
    const resultElement = document.getElementById('race-result');
    
    // 重置位置
    rabbit.style.left = '20px';
    turtle.style.left = '20px';
    resultElement.textContent = '';

    // 根据比赛结果决定动画
    let rabbitSpeed, turtleSpeed;
    let rabbitProgress = 0;
    let turtleProgress = 0;
    
    if (race.result === 'rabbit') {
        rabbitSpeed = 8; // 兔子快
        turtleSpeed = 3;
    } else if (race.result === 'turtle') {
        rabbitSpeed = 2;
        turtleSpeed = 6; // 乌龟稳
    } else {
        rabbitSpeed = 4;
        turtleSpeed = 4; // 平局
    }

    const trackWidth = document.querySelector('.track').offsetWidth - 100;

    if (raceAnimationInterval) {
        clearInterval(raceAnimationInterval);
    }

    raceAnimationInterval = setInterval(() => {
        // 更新进度（添加随机性）
        rabbitProgress += Math.random() * rabbitSpeed;
        turtleProgress += Math.random() * turtleSpeed;

        // 设置位置
        rabbit.style.left = `${Math.min(rabbitProgress, trackWidth)}px`;
        turtle.style.left = `${Math.min(turtleProgress, trackWidth)}px`;

        // 检查是否到达终点
        if (rabbitProgress >= trackWidth || turtleProgress >= trackWidth) {
            clearInterval(raceAnimationInterval);
            showRaceResult(race);
        }
    }, 100);
}

// 显示比赛结果
function showRaceResult(race) {
    const resultElement = document.getElementById('race-result');
    let resultText = '';
    let resultClass = '';
    
    if (race.result === 'rabbit') {
        resultText = '🎉 兔子获胜！ 🐰';
        resultClass = 'rabbit-win';
    } else if (race.result === 'turtle') {
        resultText = '🎉 乌龟获胜！ 🐢';
        resultClass = 'turtle-win';
    } else {
        resultText = '🤝 平局！';
        resultClass = 'draw';
    }
    
    resultElement.textContent = resultText;
    resultElement.className = `race-result ${resultClass}`;
    
    // 显示获胜奖金信息
    setTimeout(() => {
        // 重新获取用户下注信息以获取奖金数据
        fetch(`${API_BASE}/racing/my-bets`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const userBet = data.bets.find(bet => bet.raceId === race.id);
            
            if (userBet && userBet.winnings > 0) {
                resultElement.innerHTML += `<br><small>恭喜您赢得 ${userBet.winnings.toFixed(2)} 积分！</small>`;
                // 更新用户积分
                currentUser.points += userBet.winnings;
                updateUI();
            } else if (userBet) {
                resultElement.innerHTML += `<br><small>很遗憾，您没有获胜</small>`;
            }
        })
        .catch(error => {
            console.error('获取下注记录错误:', error);
        });
    }, 1000);
}

// 加载历史记录
async function loadRacingHistory() {
    try {
        const response = await fetch(`${API_BASE}/racing/history?limit=10`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateRacingHistoryTable(data.history);
        }
    } catch (error) {
        console.error('加载历史记录错误:', error);
    }
}

// 更新历史记录表格
function updateRacingHistoryTable(history) {
    const tbody = document.getElementById('racing-history');
    tbody.innerHTML = '';

    history.forEach(record => {
        const row = document.createElement('tr');
        
        let resultText = '';
        let resultClass = '';
        if (record.result === 'rabbit') {
            resultText = '🐰 兔子赢';
            resultClass = 'rabbit-win';
        } else if (record.result === 'turtle') {
            resultText = '🐢 乌龟赢';
            resultClass = 'turtle-win';
        } else {
            resultText = '🤝 平局';
            resultClass = 'draw';
        }

        row.innerHTML = `
            <td>${record.raceId}</td>
            <td class="${resultClass}">${resultText}</td>
            <td>${record.totalPool.toFixed(2)}</td>
            <td>${record.feeCollected.toFixed(2)}</td>
            <td>${record.winnerCount}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 加载个人下注记录
async function loadMyBetsHistory() {
    try {
        const response = await fetch(`${API_BASE}/racing/my-bets`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateMyBetsTable(data.bets);
        }
    } catch (error) {
        console.error('加载个人下注记录错误:', error);
    }
}

// 更新个人下注记录表格
function updateMyBetsTable(bets) {
    const tbody = document.getElementById('my-bets-history');
    tbody.innerHTML = '';

    bets.forEach(bet => {
        const row = document.createElement('tr');
        
        let optionText = '';
        let optionClass = '';
        if (bet.option === 'rabbit') {
            optionText = '🐰 兔子';
            optionClass = 'rabbit-win';
        } else if (bet.option === 'turtle') {
            optionText = '🐢 乌龟';
            optionClass = 'turtle-win';
        } else {
            optionText = '🤝 平局';
            optionClass = 'draw';
        }

        let resultText = '';
        let resultClass = '';
        if (bet.raceResult === 'rabbit') {
            resultText = '🐰 兔子赢';
            resultClass = 'rabbit-win';
        } else if (bet.raceResult === 'turtle') {
            resultText = '🐢 乌龟赢';
            resultClass = 'turtle-win';
        } else if (bet.raceResult === 'draw') {
            resultText = '🤝 平局';
            resultClass = 'draw';
        } else {
            resultText = '待开奖';
            resultClass = '';
        }

        const winnings = bet.winnings ? bet.winnings.toFixed(2) : '-';
        const winClass = bet.winnings > 0 ? 'win' : (bet.raceResult && bet.winnings === 0 ? 'lose' : '');

        row.innerHTML = `
            <td>${bet.raceId}</td>
            <td class="${optionClass}">${optionText}</td>
            <td>${bet.amount}</td>
            <td class="${resultClass}">${resultText}</td>
            <td class="${winClass}">${winnings}</td>
            <td>${new Date(bet.createdAt).toLocaleTimeString()}</td>
        `;
        
        tbody.appendChild(row);
    });
}