const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
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

// 🌟 新增：数据库用户管理
let users = {};
let databaseUsers = [];
let pendingUsers = [];

// 保留原有的管理员账号
const ADMIN_USERNAME = '18679012034';
const ADMIN_PASSWORD = 'hjh628727';

// 其他数据保持不变
let dolls = {};
let trades = {};
let gameRecords = [];
let diceLeaderboard = [];

// 新增：游戏房间管理
let gameRooms = [];
let activeGames = {};
let onlineUsers = new Map();

// 🌟 新增：从文件加载用户数据
function loadUsersFromFile() {
    try {
        const usersFile = path.join(__dirname, 'users.json');
        if (fs.existsSync(usersFile)) {
            const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
            databaseUsers = usersData.users || [];
            console.log('✅ 从文件加载用户数据:', databaseUsers.length, '个用户');
        }
    } catch (error) {
        console.error('❌ 加载用户数据失败:', error);
    }
}

// 🌟 新增：保存用户数据到文件
function saveUsersToFile() {
    try {
        const usersFile = path.join(__dirname, 'users.json');
        const usersData = {
            users: databaseUsers,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2));
        console.log('✅ 用户数据已保存到文件');
    } catch (error) {
        console.error('❌ 保存用户数据失败:', error);
    }
}

// 🌟 新增：用户数据同步
function syncUsersToMemory() {
    // 清空内存用户数据
    users = {};
    
    // 添加管理员账号
    users[ADMIN_USERNAME] = {
        id: 'admin_001',
        username: ADMIN_USERNAME,
        password: bcryptjs.hashSync(ADMIN_PASSWORD, 10),
        name: '系统管理员',
        role: 'admin',
        points: 999999,
        canes: 1000,
        createTime: new Date().toISOString(),
        banned: false,
        isActive: true,
        isDatabaseUser: false
    };
    
    // 添加数据库用户到内存
    databaseUsers.forEach(dbUser => {
        if (dbUser.isActive && !dbUser.banned) {
            users[dbUser.username] = {
                ...dbUser,
                isDatabaseUser: true
            };
        }
    });
    
    console.log('✅ 用户数据同步完成，内存用户数:', Object.keys(users).length);
}

// 🌟 新增：初始化用户系统
function initUserSystem() {
    loadUsersFromFile();
    syncUsersToMemory();
    
    // 定期同步用户数据
    setInterval(() => {
        syncUsersToMemory();
    }, 60000); // 每分钟同步一次
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT 验证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: '需要登录' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: '无效的登录信息' });
        }
        req.user = user;
        next();
    });
}

// 🌟 新增：管理员验证中间件
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: '需要管理员登录' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: '无效的登录信息' });
        }
        
        if (user.username !== ADMIN_USERNAME) {
            return res.status(403).json({ success: false, message: '权限不足' });
        }
        
        req.user = user;
        next();
    });
}

// API 路由

// 🌟 新增：用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name, phone, email } = req.body;
        
        // 验证必填字段
        if (!username || !password || !name) {
            return res.status(400).json({ 
                success: false, 
                message: '请填写用户名、密码和姓名' 
            });
        }
        
        // 验证用户名长度
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ 
                success: false, 
                message: '用户名长度应在3-20个字符之间' 
            });
        }
        
        // 验证密码长度
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: '密码长度至少6位' 
            });
        }
        
        // 验证手机号格式
        if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: '请输入正确的手机号格式' 
            });
        }
        
        // 检查用户名是否已存在
        if (users[username]) {
            return res.status(400).json({ 
                success: false, 
                message: '用户名已存在' 
            });
        }
        
        // 检查手机号是否已存在
        if (phone) {
            const existingUser = Object.values(users).find(u => u.phone === phone);
            if (existingUser) {
                return res.status(400).json({ 
                    success: false, 
                    message: '手机号已被注册' 
                });
            }
        }
        
        // 加密密码
        const hashedPassword = await bcryptjs.hash(password, 10);
        
        // 创建新用户
        const newUser = {
            id: 'user_' + Date.now(),
            username,
            password: hashedPassword,
            name,
            phone: phone || '',
            email: email || '',
            role: 'user',
            points: 1000,
            canes: 0,
            createTime: new Date().toISOString(),
            lastLoginTime: null,
            banned: false,
            isActive: true,
            inventory: [],
            achievements: [],
            stats: {
                totalGames: 0,
                totalWins: 0,
                totalLosses: 0,
                totalBets: 0,
                totalWinnings: 0
            }
        };
        
        // 保存到内存
        users[username] = newUser;
        
        // 保存到数据库
        databaseUsers.push(newUser);
        saveUsersToFile();
        
        console.log('✅ 新用户注册:', username);
        
        // 生成JWT
        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({ 
            success: true,
            message: '注册成功',
            user: {
                id: newUser.id,
                username: newUser.username,
                name: newUser.name,
                phone: newUser.phone,
                email: newUser.email,
                role: newUser.role,
                points: newUser.points,
                canes: newUser.canes
            },
            token: token
        });
        
    } catch (error) {
        console.error('❌ 注册错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '注册失败', 
            error: error.message 
        });
    }
});

// 🌟 更新：用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔑 用户尝试登录:', username);
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '请填写用户名和密码' 
            });
        }
        
        const user = users[username];
        if (!user) {
            console.log('❌ 用户不存在:', username);
            return res.status(400).json({ 
                success: false, 
                message: '用户名或密码错误' 
            });
        }
        
        // 检查用户是否被封禁
        if (user.banned) {
            console.log('❌ 用户已被封禁:', username);
            return res.status(403).json({ 
                success: false, 
                message: '账号已被封禁，请联系管理员' 
            });
        }
        
        // 检查用户是否激活
        if (!user.isActive) {
            console.log('❌ 用户未激活:', username);
            return res.status(403).json({ 
                success: false, 
                message: '账号未激活，请联系管理员' 
            });
        }
        
        const isValid = await bcryptjs.compare(password, user.password);
        if (!isValid) {
            console.log('❌ 密码错误');
            return res.status(400).json({ 
                success: false, 
                message: '用户名或密码错误' 
            });
        }
        
        // 更新最后登录时间
        user.lastLoginTime = new Date().toISOString();
        
        // 同步到数据库
        const dbUserIndex = databaseUsers.findIndex(u => u.username === username);
        if (dbUserIndex !== -1) {
            databaseUsers[dbUserIndex].lastLoginTime = user.lastLoginTime;
        }
        saveUsersToFile();
        
        // 生成JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('✅ 用户登录成功:', username);
        
        res.json({
            success: true,
            message: '登录成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                points: user.points,
                canes: user.canes,
                inventory: user.inventory,
                achievements: user.achievements,
                stats: user.stats
            },
            token: token
        });
        
    } catch (error) {
        console.error('❌ 登录错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '登录失败', 
            error: error.message 
        });
    }
});

// 🌟 新增：获取用户信息
app.get('/api/user', authenticateToken, (req, res) => {
    try {
        const username = req.user.username;
        const user = users[username];
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '用户不存在' 
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                points: user.points,
                canes: user.canes,
                inventory: user.inventory,
                achievements: user.achievements,
                stats: user.stats,
                createTime: user.createTime,
                lastLoginTime: user.lastLoginTime,
                isActive: user.isActive,
                banned: user.banned
            }
        });
    } catch (error) {
        console.error('❌ 获取用户信息错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取用户信息失败', 
            error: error.message 
        });
    }
});

// 🌟 新增：更新用户信息
app.put('/api/user', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const updates = req.body;
        
        const user = users[username];
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '用户不存在' 
            });
        }
        
        // 更新允许的字段
        const allowedUpdates = ['name', 'phone', 'email', 'bio'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                user[field] = updates[field];
            }
        });
        
        // 同步到数据库
        const dbUserIndex = databaseUsers.findIndex(u => u.username === username);
        if (dbUserIndex !== -1) {
            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    databaseUsers[dbUserIndex][field] = updates[field];
                }
            });
        }
        saveUsersToFile();
        
        res.json({
            success: true,
            message: '用户信息更新成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                phone: user.phone,
                email: user.email,
                bio: user.bio
            }
        });
        
    } catch (error) {
        console.error('❌ 更新用户信息错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '更新用户信息失败', 
            error: error.message 
        });
    }
});

// 🌟 新增：管理员获取所有用户
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    try {
        const allUsers = Object.values(users).map(user => ({
            id: user.id,
            username: user.username,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            points: user.points,
            canes: user.canes,
            createTime: user.createTime,
            lastLoginTime: user.lastLoginTime,
            isActive: user.isActive,
            banned: user.banned,
            stats: user.stats
        }));
        
        res.json({
            success: true,
            users: allUsers,
            total: allUsers.length
        });
        
    } catch (error) {
        console.error('❌ 获取用户列表错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取用户列表失败', 
            error: error.message 
        });
    }
});

// 🌟 新增：管理员更新用户积分
app.post('/api/admin/users/:username/points', authenticateAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        const { amount, reason } = req.body;
        
        const user = users[username];
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '用户不存在' 
            });
        }
        
        const oldPoints = user.points;
        user.points = Math.max(0, user.points + amount);
        
        // 同步到数据库
        const dbUserIndex = databaseUsers.findIndex(u => u.username === username);
        if (dbUserIndex !== -1) {
            databaseUsers[dbUserIndex].points = user.points;
        }
        saveUsersToFile();
        
        // 记录积分变动
        const record = {
            userId: user.id,
            username: username,
            amount: amount,
            reason: reason || '管理员调整',
            oldPoints: oldPoints,
            newPoints: user.points,
            timestamp: new Date().toISOString(),
            adminId: req.user.userId
        };
        
        console.log('💰 管理员调整积分:', record);
        
        res.json({
            success: true,
            message: '积分更新成功',
            record: record
        });
        
    } catch (error) {
        console.error('❌ 更新用户积分错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '更新用户积分失败', 
            error: error.message 
        });
    }
});

// 🌟 新增：管理员封禁/解封用户
app.post('/api/admin/users/:username/ban', authenticateAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        const { banned, reason } = req.body;
        
        const user = users[username];
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '用户不存在' 
            });
        }
        
        user.banned = banned;
        user.isActive = !banned;
        
        // 同步到数据库
        const dbUserIndex = databaseUsers.findIndex(u => u.username === username);
        if (dbUserIndex !== -1) {
            databaseUsers[dbUserIndex].banned = banned;
            databaseUsers[dbUserIndex].isActive = !banned;
        }
        saveUsersToFile();
        
        // 同步到内存
        syncUsersToMemory();
        
        const record = {
            userId: user.id,
            username: username,
            banned: banned,
            reason: reason || '管理员操作',
            timestamp: new Date().toISOString(),
            adminId: req.user.userId
        };
        
        console.log('🚫 管理员封禁操作:', record);
        
        res.json({
            success: true,
            message: banned ? '用户已封禁' : '用户已解封',
            record: record
        });
        
    } catch (error) {
        console.error('❌ 封禁用户错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '封禁用户失败', 
            error: error.message 
        });
    }
});

// 🌟 新增：管理员删除用户
app.delete('/api/admin/users/:username', authenticateAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        
        // 不能删除管理员账号
        if (username === ADMIN_USERNAME) {
            return res.status(403).json({ 
                success: false, 
                message: '不能删除管理员账号' 
            });
        }
        
        const user = users[username];
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '用户不存在' 
            });
        }
        
        // 从内存删除
        delete users[username];
        
        // 从数据库删除
        const dbUserIndex = databaseUsers.findIndex(u => u.username === username);
        if (dbUserIndex !== -1) {
            databaseUsers.splice(dbUserIndex, 1);
        }
        saveUsersToFile();
        
        const record = {
            userId: user.id,
            username: username,
            deleted: true,
            reason: '管理员删除',
            timestamp: new Date().toISOString(),
            adminId: req.user.userId
        };
        
        console.log('🗑️ 管理员删除用户:', record);
        
        res.json({
            success: true,
            message: '用户已删除',
            record: record
        });
        
    } catch (error) {
        console.error('❌ 删除用户错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '删除用户失败', 
            error: error.message 
        });
    }
});

// 🌟 新增：管理员获取用户统计
app.get('/api/admin/users/stats', authenticateAdmin, (req, res) => {
    try {
        const allUsers = Object.values(users);
        
        const stats = {
            totalUsers: allUsers.length,
            activeUsers: allUsers.filter(u => u.isActive).length,
            bannedUsers: allUsers.filter(u => u.banned).length,
            totalPoints: allUsers.reduce((sum, u) => sum + u.points, 0),
            totalCanes: allUsers.reduce((sum, u) => sum + u.canes, 0),
            newUsersToday: allUsers.filter(u => {
                const today = new Date().toDateString();
                const createTime = new Date(u.createTime).toDateString();
                return today === createTime;
            }).length,
            activeUsersToday: allUsers.filter(u => {
                const today = new Date().toDateString();
                const lastLogin = u.lastLoginTime ? new Date(u.lastLoginTime).toDateString() : '';
                return today === lastLogin;
            }).length
        };
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ 获取用户统计错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取用户统计失败', 
            error: error.message 
        });
    }
});

// 保留原有的其他API路由...

// 新骰子游戏API
app.post('/api/games/dice/new', authenticateToken, (req, res) => {
    try {
        const { betAmount } = req.body;
        const username = req.user.username;
        const user = users[username];
        
        if (user.points < betAmount) {
            return res.status(400).json({ success: false, message: '积分不足' });
        }
        
        if (betAmount < 5 || betAmount % 5 !== 0) {
            return res.status(400).json({ success: false, message: '投注金额必须是5的倍数且最小5积分' });
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
        
        // 更新用户统计
        user.stats.totalGames = (user.stats.totalGames || 0) + 1;
        user.stats.totalBets = (user.stats.totalBets || 0) + betAmount;
        if (winAmount > betAmount) {
            user.stats.totalWins = (user.stats.totalWins || 0) + 1;
            user.stats.totalWinnings = (user.stats.totalWinnings || 0) + (winAmount - betAmount);
        } else {
            user.stats.totalLosses = (user.stats.totalLosses || 0) + 1;
        }
        
        // 同步到数据库
        const dbUserIndex = databaseUsers.findIndex(u => u.username === username);
        if (dbUserIndex !== -1) {
            databaseUsers[dbUserIndex].points = user.points;
            databaseUsers[dbUserIndex].stats = user.stats;
        }
        saveUsersToFile();
        
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
            success: true,
            result: result,
            winAmount: winAmount,
            userPoints: user.points,
            leaderboard: diceLeaderboard
        });
        
    } catch (error) {
        console.error('❌ 骰子游戏失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '游戏失败', 
            error: error.message 
        });
    }
});

// 获取骰子排行榜
app.get('/api/games/dice/leaderboard', (req, res) => {
    res.json({
        success: true,
        leaderboard: diceLeaderboard
    });
});

// 恐怖奶奶游戏API
app.post('/api/games/grandma/play', authenticateToken, (req, res) => {
    try {
        const { roomId, betAmount } = req.body;
        const username = req.user.username;
        const user = users[username];
        
        if (user.points < betAmount) {
            return res.status(400).json({ success: false, message: '积分不足' });
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
        
        // 更新用户统计
        user.stats.totalGames = (user.stats.totalGames || 0) + 1;
        user.stats.totalBets = (user.stats.totalBets || 0) + betAmount;
        if (isSafe) {
            user.stats.totalWins = (user.stats.totalWins || 0) + 1;
            user.stats.totalWinnings = (user.stats.totalWinnings || 0) + (winAmount - betAmount);
        } else {
            user.stats.totalLosses = (user.stats.totalLosses || 0) + 1;
        }
        
        // 同步到数据库
        const dbUserIndex = databaseUsers.findIndex(u => u.username === username);
        if (dbUserIndex !== -1) {
            databaseUsers[dbUserIndex].points = user.points;
            databaseUsers[dbUserIndex].canes = user.canes;
            databaseUsers[dbUserIndex].stats = user.stats;
        }
        saveUsersToFile();
        
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
            success: true,
            dangerRooms: dangerRooms,
            result: result,
            winAmount: winAmount,
            userPoints: user.points,
            userCanes: user.canes
        });
        
    } catch (error) {
        console.error('❌ 恐怖奶奶游戏失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '游戏失败', 
            error: error.message 
        });
    }
});

// 获取在线用户
app.get('/api/online-users', (req, res) => {
    const onlineUsers = Array.from(io.sockets.sockets.values())
        .map(socket => socket.userData)
        .filter(user => user);
    
    res.json({
        success: true,
        users: onlineUsers,
        count: onlineUsers.length
    });
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
    
    // 保留原有的其他WebSocket事件...
    
    // 用户断开连接
    socket.on('disconnect', () => {
        if (socket.userData) {
            // 从在线用户列表移除
            onlineUsers.delete(socket.id);
            
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
        
        // 更新用户统计
        user.stats.totalGames = (user.stats.totalGames || 0) + 1;
        user.stats.totalBets = (user.stats.totalBets || 0) + player.betAmount;
        if (isWin) {
            user.stats.totalWins = (user.stats.totalWins || 0) + 1;
            user.stats.totalWinnings = (user.stats.totalWinnings || 0) + (winAmount - player.betAmount);
        } else {
            user.stats.totalLosses = (user.stats.totalLosses || 0) + 1;
        }
        
        // 同步到数据库
        const dbUserIndex = databaseUsers.findIndex(u => u.username === user.username);
        if (dbUserIndex !== -1) {
            databaseUsers[dbUserIndex].points = user.points;
            databaseUsers[dbUserIndex].canes = user.canes;
            databaseUsers[dbUserIndex].stats = user.stats;
        }
        saveUsersToFile();
        
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

// 🌟 更新：初始化用户系统
async function initUserSystem() {
    console.log('=== 初始化用户系统 ===');
    
    // 加载用户数据
    loadUsersFromFile();
    syncUsersToMemory();
    
    // 创建管理员账号
    try {
        if (!users[ADMIN_USERNAME]) {
            const hashedPassword = await bcryptjs.hash(ADMIN_PASSWORD, 10);
            
            users[ADMIN_USERNAME] = {
                id: 'admin_001',
                username: ADMIN_USERNAME,
                password: hashedPassword,
                name: '系统管理员',
                role: 'admin',
                points: 999999,
                canes: 1000,
                createTime: new Date().toISOString(),
                lastLoginTime: null,
                banned: false,
                isActive: true,
                isDatabaseUser: false
            };
            
            // 同时添加到数据库
            databaseUsers.push(users[ADMIN_USERNAME]);
            saveUsersToFile();
            
            console.log('✅ 管理员账号已初始化');
        }
    } catch (error) {
        console.error('❌ 创建管理员账号失败:', error);
    }
    
    console.log('✅ 用户系统初始化完成');
}

// 启动服务器
const PORT = process.env.PORT || 3000;

// 启动时初始化用户系统
initUserSystem().then(() => {
    server.listen(PORT, () => {
        console.log('🚀 服务器启动成功！');
        console.log(`📱 端口: ${PORT}`);
        console.log(`📁 Public目录: ${publicDir}`);
        console.log('=====================================');
        console.log('👑 管理员: ' + ADMIN_USERNAME + ' / ' + ADMIN_PASSWORD);
        console.log('=====================================');
        console.log('🎮 联机功能已启用');
        console.log('📊 实时排行榜已启用');
        console.log('💬 聊天功能已启用');
        console.log('🎮 多人游戏房间已启用');
        console.log('👥 用户管理系统已启用');
        console.log('=====================================');
    });
}).catch(error => {
    console.error('❌ 服务器启动失败:', error);
});
