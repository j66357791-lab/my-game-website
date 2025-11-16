const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 中间件
app.use(cors());
app.use(express.json());

// ====== 关键修改：服务 public 目录下的静态文件 ======
app.use(express.static(path.join(__dirname, 'public')));
// =====================================================

// API 路由保持不变
// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        if (users[username]) {
            return res.status(400).json({ message: '用户名已存在' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = {
            id: 'user_' + Date.now(),
            username,
            password: hashedPassword,
            name,
            role: 'user',
            points: 1000,
            canes: 0,
            createTime: new Date().toISOString(),
            banned: false
        };
        
        users[username] = user;
        
        console.log('✅ 新用户注册:', username);
        
        res.status(201).json({ 
            message: '注册成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                points: user.points,
                canes: user.canes
            }
        });
    } catch (error) {
        console.error('❌ 注册错误:', error);
        res.status(500).json({ message: '注册失败', error: error.message });
    }
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔑 用户尝试登录:', username);
        console.log('📋 当前用户列表:', Object.keys(users));
        
        const user = users[username];
        if (!user) {
            console.log('❌ 用户不存在:', username);
            return res.status(400).json({ message: '用户名或密码错误' });
        }
        
        console.log('🔍 找到用户:', user.username, '角色:', user.role);
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.log('❌ 密码错误');
            return res.status(400).json({ message: '用户名或密码错误' });
        }
        
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('✅ 用户登录成功:', username, '角色:', user.role);
        
        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                points: user.points,
                canes: user.canes
            }
        });
    } catch (error) {
        console.error('❌ 登录错误:', error);
        res.status(500).json({ message: '登录失败', error: error.message });
    }
});

// 获取用户信息
app.get('/api/user', authenticateToken, (req, res) => {
    const username = req.user.username;
    const user = users[username];
    
    if (!user) {
        return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        points: user.points,
        canes: user.canes
    });
});

// 娃娃购买
app.post('/api/dolls/buy', authenticateToken, (req, res) => {
    try {
        const { level } = req.body;
        const username = req.user.username;
        const user = users[username];
        
        const dollPrices = { 1: 50, 2: 200, 3: 500 };
        const price = dollPrices[level];
        
        if (user.points < price) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 扣除积分
        user.points -= price;
        
        // 创建娃娃
        const doll = {
            id: 'doll_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: user.id,
            level,
            purchaseDate: new Date().toISOString(),
            dailyEarnings: level === 1 ? 0.88 : level === 2 ? 3.35 : 6.05,
            totalEarnings: 0,
            status: 'active'
        };
        
        if (!dolls[user.id]) {
            dolls[user.id] = [];
        }
        dolls[user.id].push(doll);
        
        console.log('✅ 用户购买娃娃:', username, '等级:', level);
        
        // 广播新娃娃消息
        io.emit('dollPurchased', {
            user: user.name,
            level,
            dollId: doll.id
        });
        
        res.json({
            message: '购买成功',
            doll,
            userPoints: user.points
        });
    } catch (error) {
        console.error('❌ 购买娃娃失败:', error);
        res.status(500).json({ message: '购买失败', error: error.message });
    }
});

// 获取用户娃娃列表
app.get('/api/dolls', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const userDolls = dolls[userId] || [];
    
    res.json(userDolls);
});

// 原始骰子游戏（保留兼容性）
app.post('/api/games/dice', authenticateToken, (req, res) => {
    try {
        const { bet, prediction } = req.body;
        const username = req.user.username;
        const user = users[username];
        
        if (user.points < bet) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 扣除赌注
        user.points -= bet;
        
        // 生成结果
        const result = Math.floor(Math.random() * 6) + 1;
        const win = result === prediction;
        const winAmount = win ? bet * 5 : 0;
        
        if (win) {
            user.points += winAmount;
        }
        
        // 记录游戏
        const gameRecord = {
            id: 'game_' + Date.now(),
            userId: user.id,
            gameType: 'dice',
            bet,
            prediction,
            result,
            winAmount,
            win,
            timestamp: new Date().toISOString()
        };
        
        gameRecords.push(gameRecord);
        
        console.log('🎲 骰子游戏:', username, '结果:', result, '获胜:', win);
        
        // 广播游戏结果
        io.emit('gameResult', {
            user: user.name,
            gameType: 'dice',
            result,
            win,
            winAmount
        });
        
        res.json({
            result,
            win,
            winAmount,
            userPoints: user.points
        });
    } catch (error) {
        console.error('❌ 骰子游戏失败:', error);
        res.status(500).json({ message: '游戏失败', error: error.message });
    }
});

// 新骰子游戏API
app.post('/api/games/dice/new', authenticateToken, (req, res) => {
    try {
        const { betAmount } = req.body;
        const username = req.user.username;
        const user = users[username];
        
        if (user.points < betAmount) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 验证投注金额
        if (betAmount < 5 || betAmount % 5 !== 0) {
            return res.status(400).json({ message: '投注金额必须是5的倍数且最小5积分' });
        }
        
        // 扣除投注
        user.points -= betAmount;
        
        // 根据概率生成结果
        const DICE_PROBABILITY = [30, 20, 15, 15, 12, 8]; // 1-6点的概率
        const random = Math.random() * 100;
        let cumulative = 0;
        let result = 6; // 默认6点
        
        for (let i = 0; i < DICE_PROBABILITY.length; i++) {
            cumulative += DICE_PROBABILITY[i];
            if (random <= cumulative) {
                result = i + 1;
                break;
            }
        }
        
        const MULTIPLIER = 1.6;
        const winAmount = Math.floor(result * MULTIPLIER);
        
        // 结算
        if (winAmount > 0) {
            user.points += winAmount;
        }
        
        // 更新排行榜
        const existingEntry = diceLeaderboard.find(entry => entry.username === username);
        if (existingEntry) {
            existingEntry.games++;
            if (winAmount > betAmount) existingEntry.wins++;
            existingEntry.totalBet += betAmount;
            existingEntry.totalWin += winAmount;
        } else {
            diceLeaderboard.push({
                username: username,
                games: 1,
                wins: winAmount > betAmount ? 1 : 0,
                totalBet: betAmount,
                totalWin: winAmount
            });
        }
        
        // 排序排行榜
        diceLeaderboard.sort((a, b) => b.wins - a.wins);
        diceLeaderboard = diceLeaderboard.slice(0, 10);
        
        // 记录游戏
        const gameRecord = {
            id: 'dice_' + Date.now(),
            userId: user.id,
            gameType: 'dice',
            bet: betAmount,
            result: result,
            winAmount: winAmount,
            timestamp: new Date().toISOString()
        };
        
        gameRecords.push(gameRecord);
        
        console.log('🎲 新骰子游戏:', username, '结果:', result, '赢得:', winAmount);
        
        res.json({
            result: result,
            winAmount: winAmount,
            userPoints: user.points,
            leaderboard: diceLeaderboard
        });
        
    } catch (error) {
        console.error('❌ 骰子游戏失败:', error);
        res.status(500).json({ message: '游戏失败', error: error.message });
    }
});

// 获取骰子排行榜
app.get('/api/games/dice/leaderboard', (req, res) => {
    res.json(diceLeaderboard);
});

// 恐怖奶奶游戏API
app.post('/api/games/grandma/play', authenticateToken, (req, res) => {
    try {
        const { roomId, betAmount } = req.body;
        const username = req.user.username;
        const user = users[username];
        
        if (user.points < betAmount) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 扣除投注
        user.points -= betAmount;
        
        // 模拟游戏结果
        const isAngry = Math.random() < 0.25; // 25%概率发飙
        let dangerRooms = [];
        
        if (isAngry) {
            // 发飙，随机带走1-7个房间
            const numRooms = Math.floor(Math.random() * 7) + 1;
            for (let i = 0; i < numRooms; i++) {
                dangerRooms.push(Math.floor(Math.random() * 8) + 1);
            }
        } else {
            // 正常，带走一个房间
            dangerRooms = [Math.floor(Math.random() * 8) + 1];
        }
        
        const isSafe = !dangerRooms.includes(roomId);
        let result = 'lose';
        let winAmount = 0;
        
        if (isSafe) {
            // 安全，获得奖励
            winAmount = Math.floor(betAmount * 1.5);
            user.points += winAmount;
            result = 'win';
            
            // 获得拐杖
            const canesGained = Math.floor(betAmount * 0.5);
            user.canes = (user.canes || 0) + canesGained;
        } else {
            // 被抓，获得拐杖
            const canesGained = Math.floor(betAmount * 0.5);
            user.canes = (user.canes || 0) + canesGained;
        }
        
        // 记录游戏
        const gameRecord = {
            id: 'grandma_' + Date.now(),
            userId: user.id,
            gameType: 'grandma',
            roomId: roomId,
            bet: betAmount,
            dangerRooms: dangerRooms,
            result: result,
            winAmount: winAmount,
            timestamp: new Date().toISOString()
        };
        
        gameRecords.push(gameRecord);
        
        console.log('👻 恐怖奶奶游戏:', username, '房间:', roomId, '结果:', result);
        
        res.json({
            dangerRooms: dangerRooms,
            result: result,
            winAmount: winAmount,
            userPoints: user.points,
            userCanes: user.canes
        });
        
    } catch (error) {
        console.error('❌ 恐怖奶奶游戏失败:', error);
        res.status(500).json({ message: '游戏失败', error: error.message });
    }
});

// 兑换商城API
app.post('/api/shop/exchange', authenticateToken, (req, res) => {
    try {
        const { itemType, price } = req.body;
        const username = req.user.username;
        const user = users[username];
        
        if ((user.canes || 0) < price) {
            return res.status(400).json({ message: '拐杖不足' });
        }
        
        user.canes -= price;
        
        // 这里应该添加道具到用户背包，暂时只记录
        console.log('🛒 用户兑换:', username, '道具:', itemType, '价格:', price);
        
        res.json({
            message: '兑换成功',
            userCanes: user.canes
        });
        
    } catch (error) {
        console.error('❌ 兑换失败:', error);
        res.status(500).json({ message: '兑换失败', error: error.message });
    }
});

// 获取在线用户
app.get('/api/online-users', (req, res) => {
    const onlineUsers = Array.from(io.sockets.sockets.values())
        .map(socket => socket.userData)
        .filter(user => user);
    
    res.json(onlineUsers);
});

// JWT 验证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: '需要登录' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '无效的登录信息' });
        }
        req.user = user;
        next();
    });
}

// WebSocket 连接
io.on('connection', (socket) => {
    console.log('🔗 用户连接:', socket.id);
    
    // 用户登录
    socket.on('userLogin', (userData) => {
        socket.userData = userData;
        socket.broadcast.emit('userOnline', userData);
    });
    
    // 用户断开连接
    socket.on('disconnect', () => {
        if (socket.userData) {
            socket.broadcast.emit('userOffline', socket.userData);
        }
        console.log('🔌 用户断开连接:', socket.id);
    });
});

// ====== 关键修改：添加通配符路由处理所有页面 ======
// 所有其他请求都返回 index.html，支持前端路由
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ===================================================

// 模拟数据库
let users = {};
let dolls = {};
let trades = {};
let gameRecords = [];

// 骰子游戏排行榜数据
let diceLeaderboard = [];

// JWT 密钥
const JWT_SECRET = 'tianchuang-secret-key-2024';

// 初始化管理员账号
async function initAdmin() {
    try {
        // 检查是否已存在管理员账号
        if (!users['admin']) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            users['admin'] = {
                id: 'admin_001',
                username: 'admin',
                password: hashedPassword,
                name: '系统管理员',
                role: 'admin',
                points: 999999,
                canes: 1000,
                createTime: new Date().toISOString(),
                banned: false
            };
            
            console.log('✅ 管理员账号创建成功');
            console.log('👑 用户名: admin');
            console.log('🔑 密码: admin123');
        } else {
            console.log('✅ 管理员账号已存在');
        }
    } catch (error) {
        console.error('❌ 创建管理员账号失败:', error);
    }
}

// 启动服务器
const PORT = process.env.PORT || 3000;

// 先初始化管理员账号，再启动服务器
initAdmin().then(() => {
    server.listen(PORT, () => {
        console.log('🚀 服务器启动成功！');
        console.log(`📱 请在浏览器中打开: http://localhost:${PORT}`);
        console.log(`🔧 服务器运行在端口: ${PORT}`);
        console.log(`📁 Public目录: ${path.join(__dirname, 'public')}`);
        console.log('=====================================');
        console.log('👑 管理员账号信息:');
        console.log('📝 用户名: admin');
        console.log('🔑 密码: admin123');
        console.log('=====================================');
        console.log('🎮 游戏页面:');
        console.log('👻 恐怖奶奶: /grandma.html');
        console.log('🎲 幸运骰子: /dice.html');
        console.log('🎮 游戏中心: /games.html');
        console.log('=====================================');
    });
}).catch(error => {
    console.error('❌ 服务器启动失败:', error);
});