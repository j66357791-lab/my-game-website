const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 确保public目录存在
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('📁 创建public目录');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang-secret-key-2024';

// 模拟数据库
let users = {};
let dolls = {};
let trades = {};
let gameRecords = [];
let diceLeaderboard = [];

// 新增：游戏房间管理
let gameRooms = [];
let activeGames = {};
let onlineUsers = new Map();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// API 路由
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
        
        const user = users[username];
        if (!user) {
            console.log('❌ 用户不存在:', username);
            return res.status(400).json({ message: '用户名或密码错误' });
        }
        
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
        
        console.log('✅ 用户登录成功:', username);
        
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

// 新骰子游戏API
app.post('/api/games/dice/new', authenticateToken, (req, res) => {
    try {
        const { betAmount } = req.body;
        const username = req.user.username;
        const user = users[username];
        
        if (user.points < betAmount) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        if (betAmount < 5 || betAmount % 5 !== 0) {
            return res.status(400).json({ message: '投注金额必须是5的倍数且最小5积分' });
        }
        
        user.points -= betAmount;
        
        const DICE_PROBABILITY = [30, 20, 15, 15, 12, 8];
        const random = Math.random() * 100;
        let cumulative = 0;
        let result = 6;
        
        for (let i = 0; i < DICE_PROBABILITY.length; i++) {
            cumulative += DICE_PROBABILITY[i];
            if (random <= cumulative) {
                result = i + 1;
                break;
            }
        }
        
        const MULTIPLIER = 1.6;
        const winAmount = Math.floor(result * MULTIPLIER);
        
        if (winAmount > 0) {
            user.points += winAmount;
        }
        
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
        
        diceLeaderboard.sort((a, b) => b.wins - a.wins);
        diceLeaderboard = diceLeaderboard.slice(0, 10);
        
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
        
        user.points -= betAmount;
        
        const isAngry = Math.random() < 0.25;
        let dangerRooms = [];
        
        if (isAngry) {
            const numRooms = Math.floor(Math.random() * 7) + 1;
            for (let i = 0; i < numRooms; i++) {
                dangerRooms.push(Math.floor(Math.random() * 8) + 1);
            }
        } else {
            dangerRooms = [Math.floor(Math.random() * 8) + 1];
        }
        
        const isSafe = !dangerRooms.includes(roomId);
        let result = 'lose';
        let winAmount = 0;
        
        if (isSafe) {
            winAmount = Math.floor(betAmount * 1.5);
            user.points += winAmount;
            result = 'win';
            
            const canesGained = Math.floor(betAmount * 0.5);
            user.canes = (user.canes || 0) + canesGained;
        } else {
            const canesGained = Math.floor(betAmount * 0.5);
            user.canes = (user.canes || 0) + canesGained;
        }
        
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

// 获取在线用户
app.get('/api/online-users', (req, res) => {
    const onlineUsers = Array.from(io.sockets.sockets.values())
        .map(socket => socket.userData)
        .filter(user => user);
    
    res.json(onlineUsers);
});

// WebSocket 连接 - 增强版
io.on('connection', (socket) => {
    console.log('🔗 用户连接:', socket.id);
    
    // 用户登录
    socket.on('userLogin', (userData) => {
        socket.userData = userData;
        socket.join('global');
        onlineUsers.set(socket.id, userData);
        
        // 广播在线用户
        const onlineUsersList = Array.from(onlineUsers.values());
        io.emit('onlineUsers', onlineUsersList);
        
        // 广播用户上线
        socket.broadcast.emit('userOnline', userData);
        
        // 发送排行榜
        updateLeaderboard();
        
        console.log('✅ 用户登录:', userData.username);
    });
    
    // 创建多人游戏房间
    socket.on('createGameRoom', (gameData) => {
        const { userId, roomId, betAmount } = gameData;
        const user = users[userId];
        
        if (!user || user.points < betAmount) {
            socket.emit('gameError', { message: '积分不足' });
            return;
        }
        
        // 创建游戏房间
        const gameRoom = {
            id: 'room_' + Date.now(),
            roomId,
            hostId: userId,
            players: [{
                userId,
                username: user.username,
                betAmount,
                socketId: socket.id,
                isHost: true
            }],
            maxPlayers: 4,
            betAmount,
            status: 'waiting',
            createdAt: new Date().toISOString()
        };
        
        gameRooms.push(gameRoom);
        socket.join(`game_${gameRoom.id}`);
        socket.currentGameRoom = gameRoom.id;
        
        // 扣除积分
        user.points -= betAmount;
        
        // 通知创建者
        socket.emit('gameRoomCreated', {
            gameRoom,
            userPoints: user.points
        });
        
        // 广播房间列表
        broadcastGameRooms();
        
        console.log('🎮 创建游戏房间:', gameRoom.id, '主持人:', user.username);
    });
    
    // 加入游戏房间
    socket.on('joinGameRoom', (roomData) => {
        const { roomId, userId, betAmount } = roomData;
        const user = users[userId];
        const gameRoom = gameRooms.find(room => room.id === roomId);
        
        if (!gameRoom) {
            socket.emit('gameError', { message: '房间不存在' });
            return;
        }
        
        if (gameRoom.players.length >= gameRoom.maxPlayers) {
            socket.emit('gameError', { message: '房间已满' });
            return;
        }
        
        if (user.points < betAmount) {
            socket.emit('gameError', { message: '积分不足' });
            return;
        }
        
        // 检查是否已在房间中
        if (gameRoom.players.find(p => p.userId === userId)) {
            socket.emit('gameError', { message: '已在房间中' });
            return;
        }
        
        // 加入房间
        const player = {
            userId,
            username: user.username,
            betAmount,
            socketId: socket.id,
            isHost: false
        };
        
        gameRoom.players.push(player);
        socket.join(`game_${gameRoom.id}`);
        socket.currentGameRoom = gameRoom.id;
        
        // 扣除积分
        user.points -= betAmount;
        
        // 通知房间内所有玩家
        io.to(`game_${gameRoom.id}`).emit('playerJoined', {
            player,
            gameRoom,
            userPoints: user.points
        });
        
        // 广播房间列表
        broadcastGameRooms();
        
        console.log('🎮 加入游戏房间:', gameRoom.id, '玩家:', user.username);
    });
    
    // 开始游戏
    socket.on('startGame', (roomId) => {
        const gameRoom = gameRooms.find(room => room.id === roomId);
        if (!gameRoom) {
            socket.emit('gameError', { message: '房间不存在' });
            return;
        }
        
        // 检查是否是主持人
        const player = gameRoom.players.find(p => p.socketId === socket.id);
        if (!player || !player.isHost) {
            socket.emit('gameError', { message: '只有主持人可以开始游戏' });
            return;
        }
        
        if (gameRoom.players.length < 1) {
            socket.emit('gameError', { message: '至少需要1名玩家' });
            return;
        }
        
        // 生成危险房间
        const dangerRooms = generateDangerRooms();
        gameRoom.dangerRooms = dangerRooms;
        gameRoom.status = 'playing';
        gameRoom.startTime = new Date().toISOString();
        
        // 通知所有玩家游戏开始
        io.to(`game_${gameRoom.id}`).emit('gameStart', {
            dangerRooms,
            gameRoom,
            duration: 30000 // 30秒
        });
        
        // 30秒后结束游戏
        setTimeout(() => {
            endGame(gameRoom);
        }, 30000);
        
        console.log('🎮 游戏开始:', gameRoom.id, '危险房间:', dangerRooms);
    });
    
    // 离开游戏房间
    socket.on('leaveGameRoom', () => {
        const roomId = socket.currentGameRoom;
        if (!roomId) return;
        
        const gameRoom = gameRooms.find(room => room.id === roomId);
        if (!gameRoom) return;
        
        const playerIndex = gameRoom.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex === -1) return;
        
        const player = gameRoom.players[playerIndex];
        
        // 退还积分
        const user = users[player.userId];
        if (user) {
            user.points += player.betAmount;
        }
        
        // 移除玩家
        gameRoom.players.splice(playerIndex, 1);
        socket.leave(`game_${gameRoom.id}`);
        socket.currentGameRoom = null;
        
        // 如果房间为空，删除房间
        if (gameRoom.players.length === 0) {
            gameRooms = gameRooms.filter(room => room.id !== roomId);
        } else {
            // 如果主持人离开，转移主持人身份
            if (player.isHost && gameRoom.players.length > 0) {
                gameRoom.players[0].isHost = true;
            }
            
            // 通知房间内其他玩家
            io.to(`game_${gameRoom.id}`).emit('playerLeft', {
                player,
                gameRoom
            });
        }
        
        // 广播房间列表
        broadcastGameRooms();
        
        console.log('🎮 离开游戏房间:', roomId, '玩家:', player.username);
    });
    
    // 获取游戏房间列表
    socket.on('getGameRooms', () => {
        socket.emit('gameRoomsList', gameRooms);
    });
    
    // 实时积分更新
    socket.on('updatePoints', (data) => {
        const { userId, amount, reason } = data;
        const user = users[userId];
        
        if (user) {
            user.points = Math.max(0, user.points + amount);
            
            // 通知用户
            socket.emit('pointsUpdated', {
                newPoints: user.points,
                amount,
                reason
            });
            
            // 更新排行榜
            updateLeaderboard();
        }
    });
    
    // 获取排行榜
    socket.on('getLeaderboard', () => {
        updateLeaderboard();
    });
    
    // 聊天功能
    socket.on('sendMessage', (messageData) => {
        const { userId, message, roomId } = messageData;
        const user = users[userId];
        
        if (!user) return;
        
        const chatMessage = {
            id: Date.now().toString(),
            userId,
            username: user.username,
            message,
            timestamp: new Date().toISOString()
        };
        
        if (roomId) {
            // 房间内聊天
            io.to(`game_${roomId}`).emit('newMessage', chatMessage);
        } else {
            // 全局聊天
            io.emit('newMessage', chatMessage);
        }
        
        console.log('💬 新消息:', user.username, ':', message);
    });
    
    // 用户断开连接
    socket.on('disconnect', () => {
        if (socket.userData) {
            // 从在线用户列表移除
            onlineUsers.delete(socket.id);
            
            // 处理游戏房间
            if (socket.currentGameRoom) {
                const gameRoom = gameRooms.find(room => room.id === socket.currentGameRoom);
                if (gameRoom) {
                    const playerIndex = gameRoom.players.findIndex(p => p.socketId === socket.id);
                    if (playerIndex !== -1) {
                        const player = gameRoom.players[playerIndex];
                        
                        // 退还积分
                        const user = users[player.userId];
                        if (user) {
                            user.points += player.betAmount;
                        }
                        
                        // 移除玩家
                        gameRoom.players.splice(playerIndex, 1);
                        
                        // 如果房间为空，删除房间
                        if (gameRoom.players.length === 0) {
                            gameRooms = gameRooms.filter(room => room.id !== gameRoom.id);
                        }
                        
                        // 广播房间列表
                        broadcastGameRooms();
                    }
                }
            }
            
            // 广播用户下线
            socket.broadcast.emit('userOffline', socket.userData);
            
            // 广播在线用户
            const onlineUsersList = Array.from(onlineUsers.values());
            io.emit('onlineUsers', onlineUsersList);
        }
        
        console.log('🔌 用户断开连接:', socket.id);
    });
});

// 辅助函数
function generateDangerRooms() {
    const roomCount = Math.floor(Math.random() * 7) + 1;
    const dangerRooms = [];
    
    for (let i = 0; i < roomCount; i++) {
        dangerRooms.push(Math.floor(Math.random() * 8) + 1);
    }
    
    return dangerRooms;
}

function endGame(gameRoom) {
    const dangerRooms = gameRoom.dangerRooms;
    const results = [];
    
    gameRoom.players.forEach(player => {
        const user = users[player.userId];
        const isWin = !dangerRooms.includes(player.roomId);
        let result = 'lose';
        let winAmount = 0;
        let canesGained = 0;
        
        if (isWin) {
            // 获胜，返还积分并给予奖励
            winAmount = Math.floor(player.betAmount * 1.5);
            user.points += winAmount;
            result = 'win';
            
            canesGained = Math.floor(player.betAmount * 0.5);
            user.canes = (user.canes || 0) + canesGained;
        } else {
            // 失败，给予拐杖补偿
            canesGained = Math.floor(player.betAmount * 0.5);
            user.canes = (user.canes || 0) + canesGained;
        }
        
        results.push({
            userId: player.userId,
            username: player.username,
            roomId: player.roomId,
            result,
            winAmount,
            canesGained,
            newPoints: user.points
        });
        
        // 通知玩家
        io.to(player.socketId).emit('gameResult', {
            result,
            winAmount,
            canesGained,
            newPoints: user.points,
            dangerRooms
        });
    });
    
    // 广播游戏结束
    io.to(`game_${gameRoom.id}`).emit('gameEnd', {
        gameRoom,
        dangerRooms,
        results
    });
    
    // 更新房间状态
    gameRoom.status = 'finished';
    gameRoom.endTime = new Date().toISOString();
    
    // 5秒后删除房间
    setTimeout(() => {
        gameRooms = gameRooms.filter(room => room.id !== gameRoom.id);
        broadcastGameRooms();
    }, 5000);
    
    // 更新排行榜
    updateLeaderboard();
    
    console.log('🎮 游戏结束:', gameRoom.id, '结果:', results);
}

function updateLeaderboard() {
    const leaderboard = Object.values(users)
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map((user, index) => ({
            rank: index + 1,
            userId: user.id,
            username: user.username,
            points: user.points,
            role: user.role
        }));
    
    io.emit('leaderboardUpdate', leaderboard);
}

function broadcastGameRooms() {
    const availableRooms = gameRooms.filter(room => room.status === 'waiting');
    io.emit('gameRoomsList', availableRooms);
}

// 通配符路由 - 处理所有其他请求
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化管理员账号
async function initAdmin() {
    try {
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
        }
    } catch (error) {
        console.error('❌ 创建管理员账号失败:', error);
    }
}

// 启动服务器
const PORT = process.env.PORT || 3000;

initAdmin().then(() => {
    server.listen(PORT, () => {
        console.log('🚀 服务器启动成功！');
        console.log(`📱 端口: ${PORT}`);
        console.log(`📁 Public目录: ${publicDir}`);
        console.log('=====================================');
        console.log('👑 管理员: admin / admin123');
        console.log('=====================================');
        console.log('🎮 联机功能已启用');
        console.log('📊 实时排行榜已启用');
        console.log('💬 聊天功能已启用');
        console.log('🎮 多人游戏房间已启用');
        console.log('=====================================');
    });
}).catch(error => {
    console.error('❌ 服务器启动失败:', error);
});