const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

// ====== 数据持久化 ======
const DATA_FILE = path.join(__dirname, 'data.json');

// 加载数据
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载数据失败:', error);
    }
    
    // 默认数据结构
    return {
        users: {},
        dolls: {},
        trades: {},
        gameRecords: [],
        diceLeaderboard: []
    };
}

// 保存数据
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('✅ 数据已保存');
    } catch (error) {
        console.error('保存数据失败:', error);
    }
}

// 初始化数据
let data = loadData();

// ====== 数据同步API ======

// 用户数据同步
app.post('/api/user/sync', authenticateToken, async (req, res) => {
    try {
        const { userData, lastSyncTime } = req.body;
        const username = req.user.username;
        
        console.log('🔧 用户数据同步请求:', username);
        
        let user = data.users[username];
        
        if (!user) {
            // 云端没有数据，创建新用户
            user = {
                ...userData,
                id: req.user.userId,
                username: username,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            data.users[username] = user;
            saveData();
            
            return res.json({
                success: true,
                data: {
                    user: user,
                    syncType: 'created'
                }
            });
        }
        
        // 比较更新时间
        const localUpdateTime = new Date(userData.updatedAt || 0);
        const cloudUpdateTime = new Date(user.updatedAt || 0);
        
        let syncType = 'no_change';
        let mergedUser = user;
        
        if (localUpdateTime > cloudUpdateTime) {
            // 本地数据更新，更新云端
            Object.assign(user, userData);
            user.updatedAt = new Date().toISOString();
            saveData();
            syncType = 'cloud_updated';
            mergedUser = user;
        } else if (cloudUpdateTime > localUpdateTime) {
            // 云端数据更新，返回云端数据
            syncType = 'local_updated';
            mergedUser = user;
        }
        
        res.json({
            success: true,
            data: {
                user: mergedUser,
                syncType: syncType,
                lastSyncTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('用户数据同步失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 积分数据同步
app.post('/api/points/sync', authenticateToken, async (req, res) => {
    try {
        const { userId, localPoints, lastSyncTime } = req.body;
        const username = req.user.username;
        
        console.log('🔧 积分数据同步请求:', username);
        
        const user = data.users[username];
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }
        
        const cloudPoints = user.points || 0;
        let syncType = 'no_change';
        let finalPoints = cloudPoints;
        
        if (localPoints > cloudPoints) {
            // 本地积分更多，更新云端
            user.points = localPoints;
            user.updatedAt = new Date().toISOString();
            saveData();
            syncType = 'cloud_updated';
            finalPoints = localPoints;
        } else if (cloudPoints > localPoints) {
            // 云端积分更多，更新本地
            syncType = 'local_updated';
            finalPoints = cloudPoints;
        }
        
        res.json({
            success: true,
            data: {
                points: finalPoints,
                syncType: syncType,
                lastSyncTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('积分数据同步失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 订单数据同步
app.post('/api/orders/sync', authenticateToken, async (req, res) => {
    try {
        const { userId, localOrders, lastSyncTime } = req.body;
        const username = req.user.username;
        
        console.log('🔧 订单数据同步请求:', username);
        
        // 获取云端订单数据
        const cloudOrders = data.gameRecords.filter(record => record.userId === req.user.userId);
        
        // 合并订单数据
        const mergedOrders = [];
        const allOrderIds = new Set();
        
        // 添加云端订单
        cloudOrders.forEach(order => {
            mergedOrders.push(order);
            allOrderIds.add(order.id);
        });
        
        // 添加本地独有的订单
        localOrders.forEach(localOrder => {
            if (!allOrderIds.has(localOrder.id)) {
                mergedOrders.push(localOrder);
                // 保存新订单到云端
                data.gameRecords.push(localOrder);
            }
        });
        
        if (localOrders.length > 0) {
            saveData();
        }
        
        res.json({
            success: true,
            data: {
                orders: mergedOrders,
                syncType: 'merged',
                lastSyncTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('订单数据同步失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 背包数据同步
app.post('/api/backpack/sync', authenticateToken, async (req, res) => {
    try {
        const { userId, localBackpack, lastSyncTime } = req.body;
        const username = req.user.username;
        
        console.log('🔧 背包数据同步请求:', username);
        
        // 获取云端背包数据
        const cloudBackpack = data.dolls[req.user.userId] || [];
        
        // 合并背包数据
        const mergedBackpack = [];
        const allItemIds = new Set();
        
        // 添加云端物品
        cloudBackpack.forEach(item => {
            mergedBackpack.push(item);
            allItemIds.add(item.id);
        });
        
        // 添加本地独有的物品
        localBackpack.forEach(localItem => {
            if (!allItemIds.has(localItem.id)) {
                mergedBackpack.push(localItem);
            }
        });
        
        // 如果有新物品，保存到云端
        const newItems = localBackpack.filter(localItem => 
            !allItemIds.has(localItem.id)
        );
        
        if (newItems.length > 0) {
            if (!data.dolls[req.user.userId]) {
                data.dolls[req.user.userId] = [];
            }
            data.dolls[req.user.userId].push(...newItems);
            saveData();
        }
        
        res.json({
            success: true,
            data: {
                items: mergedBackpack,
                syncType: 'merged',
                lastSyncTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('背包数据同步失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ====== 原有API保持不变，但修改数据存储 ======

// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        if (data.users[username]) {
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
            updatedAt: new Date().toISOString(),
            banned: false
        };
        
        data.users[username] = user;
        saveData();
        
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
        console.log('📋 当前用户列表:', Object.keys(data.users));
        
        const user = data.users[username];
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
    const user = data.users[username];
    
    if (!user) {
        return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        points: user.points,
        canes: user.canes,
        updatedAt: user.updatedAt
    });
});

// 更新用户信息
app.put('/api/user', authenticateToken, (req, res) => {
    try {
        const username = req.user.username;
        const user = data.users[username];
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 更新用户信息
        Object.assign(user, req.body);
        user.updatedAt = new Date().toISOString();
        
        saveData();
        
        res.json({
            success: true,
            message: '用户信息更新成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                points: user.points,
                canes: user.canes,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('更新用户信息失败:', error);
        res.status(500).json({ message: '更新失败', error: error.message });
    }
});

// 获取用户订单
app.get('/api/orders/user', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const orders = data.gameRecords.filter(record => record.userId === userId);
        
        res.json({
            success: true,
            data: {
                orders: orders
            }
        });
    } catch (error) {
        console.error('获取用户订单失败:', error);
        res.status(500).json({ message: '获取订单失败', error: error.message });
    }
});

// 获取积分余额
app.get('/api/points/balance', authenticateToken, (req, res) => {
    try {
        const username = req.user.username;
        const user = data.users[username];
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        res.json({
            success: true,
            data: {
                balance: user.points || 0
            }
        });
    } catch (error) {
        console.error('获取积分余额失败:', error);
        res.status(500).json({ message: '获取积分失败', error: error.message });
    }
});

// 更新积分
app.post('/api/points/update', authenticateToken, (req, res) => {
    try {
        const { amount, reason } = req.body;
        const username = req.user.username;
        const user = data.users[username];
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        const oldPoints = user.points || 0;
        const newPoints = Math.max(0, oldPoints + amount);
        
        user.points = newPoints;
        user.updatedAt = new Date().toISOString();
        
        saveData();
        
        console.log('💰 积分更新:', username, amount, reason);
        
        res.json({
            success: true,
            data: {
                newPoints: newPoints,
                oldPoints: oldPoints,
                reason: reason
            }
        });
    } catch (error) {
        console.error('更新积分失败:', error);
        res.status(500).json({ message: '更新积分失败', error: error.message });
    }
});

// 获取背包物品
app.get('/api/backpack/items', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const items = data.dolls[userId] || [];
        
        res.json({
            success: true,
            data: {
                items: items
            }
        });
    } catch (error) {
        console.error('获取背包物品失败:', error);
        res.status(500).json({ message: '获取背包失败', error: error.message });
    }
});

// 娃娃购买
app.post('/api/dolls/buy', authenticateToken, (req, res) => {
    try {
        const { level } = req.body;
        const username = req.user.username;
        const user = data.users[username];
        
        const dollPrices = { 1: 50, 2: 200, 3: 500 };
        const price = dollPrices[level];
        
        if (user.points < price) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 扣除积分
        user.points -= price;
        user.updatedAt = new Date().toISOString();
        
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
        
        if (!data.dolls[user.id]) {
            data.dolls[user.id] = [];
        }
        data.dolls[user.id].push(doll);
        
        saveData();
        
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
    const userDolls = data.dolls[userId] || [];
    
    res.json(userDolls);
});

// 原始骰子游戏（保留兼容性）
app.post('/api/games/dice', authenticateToken, (req, res) => {
    try {
        const { bet, prediction } = req.body;
        const username = req.user.username;
        const user = data.users[username];
        
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
        
        user.updatedAt = new Date().toISOString();
        
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
        
        data.gameRecords.push(gameRecord);
        saveData();
        
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
        const user = data.users[username];
        
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
        
        user.updatedAt = new Date().toISOString();
        
        // 更新排行榜
        const existingEntry = data.diceLeaderboard.find(entry => entry.username === username);
        if (existingEntry) {
            existingEntry.games++;
            if (winAmount > betAmount) existingEntry.wins++;
            existingEntry.totalBet += betAmount;
            existingEntry.totalWin += winAmount;
        } else {
            data.diceLeaderboard.push({
                username: username,
                games: 1,
                wins: winAmount > betAmount ? 1 : 0,
                totalBet: betAmount,
                totalWin: winAmount
            });
        }
        
        // 排序排行榜
        data.diceLeaderboard.sort((a, b) => b.wins - a.wins);
        data.diceLeaderboard = data.diceLeaderboard.slice(0, 10);
        
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
        
        data.gameRecords.push(gameRecord);
        saveData();
        
        console.log('🎲 新骰子游戏:', username, '结果:', result, '赢得:', winAmount);
        
        res.json({
            result: result,
            winAmount: winAmount,
            userPoints: user.points,
            leaderboard: data.diceLeaderboard
        });
        
    } catch (error) {
        console.error('❌ 骰子游戏失败:', error);
        res.status(500).json({ message: '游戏失败', error: error.message });
    }
});

// 获取骰子排行榜
app.get('/api/games/dice/leaderboard', (req, res) => {
    res.json(data.diceLeaderboard);
});

// 恐怖奶奶游戏API
app.post('/api/games/grandma/play', authenticateToken, (req, res) => {
    try {
        const { roomId, betAmount } = req.body;
        const username = req.user.username;
        const user = data.users[username];
        
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
        
        user.updatedAt = new Date().toISOString();
        
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
        
        data.gameRecords.push(gameRecord);
        saveData();
        
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
        const user = data.users[username];
        
        if ((user.canes || 0) < price) {
            return res.status(400).json({ message: '拐杖不足' });
        }
        
        user.canes -= price;
        user.updatedAt = new Date().toISOString();
        saveData();
        
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

// JWT 密钥
const JWT_SECRET = 'tianchuang-secret-key-2024';

// 初始化管理员账号
async function initAdmin() {
    try {
        // 检查是否已存在管理员账号
        if (!data.users['admin']) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            data.users['admin'] = {
                id: 'admin_001',
                username: 'admin',
                password: hashedPassword,
                name: '系统管理员',
                role: 'admin',
                points: 999999,
                canes: 1000,
                createTime: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                banned: false
            };
            
            saveData();
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
        console.log('🔧 数据同步API已启用');
        console.log('📁 数据文件:', DATA_FILE);
        console.log('=====================================');
    });
}).catch(error => {
    console.error('❌ 服务器启动失败:', error);
});
