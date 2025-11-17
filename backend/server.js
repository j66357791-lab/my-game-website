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

// 🔧 修复：统一用户数据管理
class UserDataManager {
    constructor() {
        this.data = this.loadData();
    }
    
    loadData() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = fs.readFileSync(DATA_FILE, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
        
        // 🔧 修复：统一数据结构
        return {
            users: {}, // 🔧 按用户ID存储，而不是用户名
            userProfiles: {}, // 🔧 用户详细资料
            userSettings: {}, // 🔧 用户设置
            dolls: {}, // 🔧 娃娃数据
            trades: {}, // 🔧 交易数据
            gameRecords: [], // 🔧 游戏记录
            diceLeaderboard: [], // 🔧 骰子排行榜
            backpacks: {}, // 🔧 背包数据
            orders: {}, // 🔧 订单数据
            pointsHistory: {}, // 🔧 积分历史
            notifications: {}, // 🔧 通知数据
            globalData: {
                // 全局共享数据
                systemSettings: {},
                statistics: {},
                announcements: []
            }
        };
    }
    
    saveData() {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
            console.log('✅ 数据已保存');
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }
    
    // 🔧 修复：获取用户数据（统一接口）
    getUserData(userId) {
        return {
            user: this.data.users[userId] || {},
            profile: this.data.userProfiles[userId] || {},
            settings: this.data.userSettings[userId] || {},
            dolls: this.data.dolls[userId] || [],
            backpack: this.data.backpacks[userId] || [],
            orders: this.data.orders[userId] || [],
            pointsHistory: this.data.pointsHistory[userId] || [],
            notifications: this.data.notifications[userId] || []
        };
    }
    
    // 🔧 修复：更新用户数据（确保同步）
    updateUserData(userId, userData) {
        if (!this.data.users[userId]) {
            this.data.users[userId] = {
                id: userId,
                createdAt: new Date().toISOString()
            };
        }
        
        // 🔧 修复：合并数据，确保最新数据
        Object.assign(this.data.users[userId], userData, {
            updatedAt: new Date().toISOString()
        });
        
        // 🔧 修复：同时更新其他相关数据
        if (userData.profile) {
            this.data.userProfiles[userId] = {
                ...this.data.userProfiles[userId],
                ...userData.profile,
                updatedAt: new Date().toISOString()
            };
        }
        
        if (userData.settings) {
            this.data.userSettings[userId] = {
                ...this.data.userSettings[userId],
                ...userData.settings,
                updatedAt: new Date().toISOString()
            };
        }
        
        this.saveData();
        
        // 🔧 修复：触发数据同步事件
        this.broadcastUserDataUpdate(userId, this.getUserData(userId));
    }
    
    // 🔧 修复：广播数据更新
    broadcastUserDataUpdate(userId, userData) {
        // 向所有连接的客户端广播数据更新
        io.emit('userDataUpdate', {
            userId: userId,
            userData: userData,
            timestamp: new Date().toISOString()
        });
        
        console.log(`📡 广播用户数据更新: ${userId}`);
    }
}

// 🔧 修复：创建全局数据管理器
const dataManager = new UserDataManager();

// ====== 增强的数据同步API ======

// 🔧 修复：用户数据同步
app.post('/api/user/sync', authenticateToken, async (req, res) => {
    try {
        const { userData, lastSyncTime } = req.body;
        const userId = req.user.userId;
        
        console.log('🔧 用户数据同步请求:', userId);
        
        let serverUserData = dataManager.getUserData(userId);
        
        if (!serverUserData.user.id) {
            // 云端没有数据，创建新用户
            const newUserData = {
                ...userData,
                id: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            dataManager.updateUserData(userId, { user: newUserData });
            serverUserData = dataManager.getUserData(userId);
            
            return res.json({
                success: true,
                data: {
                    userData: serverUserData,
                    syncType: 'created'
                }
            });
        }
        
        // 🔧 修复：比较更新时间
        const localUpdateTime = new Date(userData.updatedAt || 0);
        const cloudUpdateTime = new Date(serverUserData.user.updatedAt || 0);
        
        let syncType = 'no_change';
        let mergedUserData = serverUserData;
        
        if (localUpdateTime > cloudUpdateTime) {
            // 本地数据更新，更新云端
            dataManager.updateUserData(userId, userData);
            mergedUserData = dataManager.getUserData(userId);
            syncType = 'cloud_updated';
        } else if (cloudUpdateTime > localUpdateTime) {
            // 云端数据更新，返回云端数据
            syncType = 'local_updated';
            mergedUserData = serverUserData;
        }
        
        res.json({
            success: true,
            data: {
                userData: mergedUserData,
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

// 🔧 修复：积分数据同步
app.post('/api/points/sync', authenticateToken, async (req, res) => {
    try {
        const { localPoints, localHistory, lastSyncTime } = req.body;
        const userId = req.user.userId;
        
        console.log('🔧 积分数据同步请求:', userId);
        
        const userData = dataManager.getUserData(userId);
        const cloudPoints = userData.user.points || 0;
        const cloudHistory = userData.pointsHistory || [];
        
        let syncType = 'no_change';
        let finalPoints = cloudPoints;
        let finalHistory = cloudHistory;
        
        // 🔧 修复：同步积分
        if (localPoints > cloudPoints) {
            userData.user.points = localPoints;
            userData.user.updatedAt = new Date().toISOString();
            dataManager.updateUserData(userId, { user: userData.user });
            finalPoints = localPoints;
            syncType = 'cloud_updated';
        } else if (cloudPoints > localPoints) {
            finalPoints = cloudPoints;
            syncType = 'local_updated';
        }
        
        // 🔧 修复：同步积分历史
        if (localHistory && localHistory.length > 0) {
            // 合并历史记录
            const mergedHistory = [...cloudHistory];
            const existingIds = new Set(cloudHistory.map(h => h.id));
            
            localHistory.forEach(record => {
                if (!existingIds.has(record.id)) {
                    mergedHistory.push(record);
                }
            });
            
            // 按时间排序，保留最新的1000条
            mergedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            finalHistory = mergedHistory.slice(0, 1000);
            
            dataManager.data.pointsHistory[userId] = finalHistory;
            dataManager.saveData();
        }
        
        res.json({
            success: true,
            data: {
                points: finalPoints,
                history: finalHistory,
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

// 🔧 修复：订单数据同步
app.post('/api/orders/sync', authenticateToken, async (req, res) => {
    try {
        const { localOrders, lastSyncTime } = req.body;
        const userId = req.user.userId;
        
        console.log('🔧 订单数据同步请求:', userId);
        
        // 获取云端订单数据
        const cloudOrders = dataManager.data.orders[userId] || [];
        
        // 🔧 修复：合并订单数据
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
                allOrderIds.add(localOrder.id);
            }
        });
        
        // 保存合并后的订单
        dataManager.data.orders[userId] = mergedOrders;
        dataManager.saveData();
        
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

// 🔧 修复：背包数据同步
app.post('/api/backpack/sync', authenticateToken, async (req, res) => {
    try {
        const { localBackpack, lastSyncTime } = req.body;
        const userId = req.user.userId;
        
        console.log('🔧 背包数据同步请求:', userId);
        
        // 获取云端背包数据
        const cloudBackpack = dataManager.data.backpacks[userId] || [];
        
        // 🔧 修复：合并背包数据
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
                allItemIds.add(localItem.id);
            }
        });
        
        // 保存合并后的背包
        dataManager.data.backpacks[userId] = mergedBackpack;
        dataManager.saveData();
        
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

// 🔧 修复：娃娃数据同步
app.post('/api/dolls/sync', authenticateToken, async (req, res) => {
    try {
        const { localDolls, lastSyncTime } = req.body;
        const userId = req.user.userId;
        
        console.log('🔧 娃娃数据同步请求:', userId);
        
        // 获取云端娃娃数据
        const cloudDolls = dataManager.data.dolls[userId] || [];
        
        // 🔧 修复：合并娃娃数据
        const mergedDolls = [];
        const allDollIds = new Set();
        
        // 添加云端娃娃
        cloudDolls.forEach(doll => {
            mergedDolls.push(doll);
            allDollIds.add(doll.id);
        });
        
        // 添加本地独有的娃娃
        localDolls.forEach(localDoll => {
            if (!allDollIds.has(localDoll.id)) {
                mergedDolls.push(localDoll);
                allDollIds.add(localDoll.id);
            }
        });
        
        // 保存合并后的娃娃
        dataManager.data.dolls[userId] = mergedDolls;
        dataManager.saveData();
        
        res.json({
            success: true,
            data: {
                dolls: mergedDolls,
                syncType: 'merged',
                lastSyncTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('娃娃数据同步失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ====== 原有API保持不变，但修改数据存储 ======

// 🔧 修复：用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        
        // 🔧 修复：检查用户名是否已存在
        let existingUser = null;
        for (const [userId, user] of Object.entries(dataManager.data.users)) {
            if (user.username === username) {
                existingUser = user;
                break;
            }
        }
        
        if (existingUser) {
            return res.status(400).json({ message: '用户名已存在' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 🔧 修复：生成唯一用户ID
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const user = {
            id: userId,
            username,
            password: hashedPassword,
            name,
            role: 'user',
            points: 1000,
            canes: 0,
            isActive: true,
            createTime: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            banned: false
        };
        
        // 🔧 修复：保存用户数据
        dataManager.data.users[userId] = user;
        dataManager.saveData();
        
        console.log('✅ 新用户注册:', username, '用户ID:', userId);
        
        const token = jwt.sign(
            { userId: userId, username: username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({ 
            message: '注册成功',
            token: token,
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

// 🔧 修复：用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔑 用户尝试登录:', username);
        console.log('📋 当前用户列表:', Object.keys(dataManager.data.users));
        
        // 🔧 修复：查找用户（按用户名）
        let user = null;
        let userId = null;
        
        for (const [uid, u] of Object.entries(dataManager.data.users)) {
            if (u.username === username) {
                user = u;
                userId = uid;
                break;
            }
        }
        
        if (!user) {
            console.log('❌ 用户不存在:', username);
            return res.status(400).json({ message: '用户名或密码错误' });
        }
        
        console.log('🔍 找到用户:', user.username, '用户ID:', userId, '角色:', user.role);
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.log('❌ 密码错误');
            return res.status(400).json({ message: '用户名或密码错误' });
        }
        
        // 🔧 修复：生成JWT时包含用户ID
        const token = jwt.sign(
            { userId: userId, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // 🔧 修复：更新最后登录时间
        user.lastLoginAt = new Date().toISOString();
        user.lastLoginIP = req.ip;
        dataManager.updateUserData(userId, { user: user });
        
        console.log('✅ 用户登录成功:', username, '用户ID:', userId, '角色:', user.role);
        
        res.json({
            message: '登录成功',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                points: user.points,
                canes: user.canes,
                lastLoginAt: user.lastLoginAt
            }
        });
    } catch (error) {
        console.error('❌ 登录错误:', error);
        res.status(500).json({ message: '登录失败', error: error.message });
    }
});

// 🔧 修复：获取用户信息
app.get('/api/user', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const userData = dataManager.getUserData(userId);
    
    if (!userData.user.id) {
        return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json({
        success: true,
        data: {
            user: userData.user,
            profile: userData.profile,
            settings: userData.settings
        }
    });
});

// 🔧 修复：更新用户信息
app.put('/api/user', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        if (!userData.user.id) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 🔧 修复：更新用户信息
        Object.assign(userData.user, req.body);
        userData.user.updatedAt = new Date().toISOString();
        
        dataManager.updateUserData(userId, { user: userData.user });
        
        res.json({
            success: true,
            message: '用户信息更新成功',
            data: {
                user: userData.user,
                profile: userData.profile,
                settings: userData.settings
            }
        });
    } catch (error) {
        console.error('更新用户信息失败:', error);
        res.status(500).json({ message: '更新失败', error: error.message });
    }
});

// 🔧 修复：获取用户订单
app.get('/api/orders/user', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        res.json({
            success: true,
            data: {
                orders: userData.orders || []
            }
        });
    } catch (error) {
        console.error('获取用户订单失败:', error);
        res.status(500).json({ message: '获取订单失败', error: error.message });
    }
});

// 🔧 修复：获取积分余额
app.get('/api/points/balance', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        if (!userData.user.id) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        res.json({
            success: true,
            data: {
                balance: userData.user.points || 0
            }
        });
    } catch (error) {
        console.error('获取积分余额失败:', error);
        res.status(500).json({ message: '获取积分失败', error: error.message });
    }
});

// 🔧 修复：更新积分
app.post('/api/points/update', authenticateToken, (req, res) => {
    try {
        const { amount, reason, metadata = {} } = req.body;
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        if (!userData.user.id) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        const oldPoints = userData.user.points || 0;
        const newPoints = Math.max(0, oldPoints + amount);
        
        userData.user.points = newPoints;
        userData.user.updatedAt = new Date().toISOString();
        
        // 🔧 修复：添加积分历史记录
        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            reason: reason,
            amount: amount,
            oldPoints: oldPoints,
            newPoints: newPoints,
            type: amount > 0 ? 'earn' : 'spend',
            metadata: metadata
        };
        
        if (!dataManager.data.pointsHistory[userId]) {
            dataManager.data.pointsHistory[userId] = [];
        }
        
        dataManager.data.pointsHistory[userId].unshift(record);
        
        // 只保留最新的1000条记录
        if (dataManager.data.pointsHistory[userId].length > 1000) {
            dataManager.data.pointsHistory[userId] = dataManager.data.pointsHistory[userId].slice(0, 1000);
        }
        
        dataManager.updateUserData(userId, { 
            user: userData.user,
            pointsHistory: dataManager.data.pointsHistory[userId]
        });
        
        console.log('💰 积分更新:', userId, amount, reason);
        
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

// 🔧 修复：获取背包物品
app.get('/api/backpack/items', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        res.json({
            success: true,
            data: {
                items: userData.backpack || []
            }
        });
    } catch (error) {
        console.error('获取背包物品失败:', error);
        res.status(500).json({ message: '获取背包失败', error: error.message });
    }
});

// 🔧 修复：娃娃购买
app.post('/api/dolls/buy', authenticateToken, (req, res) => {
    try {
        const { level } = req.body;
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        const dollPrices = { 1: 50, 2: 200, 3: 500 };
        const price = dollPrices[level];
        
        if (userData.user.points < price) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 扣除积分
        userData.user.points -= price;
        userData.user.updatedAt = new Date().toISOString();
        
        // 创建娃娃
        const doll = {
            id: 'doll_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: userId,
            level,
            purchaseDate: new Date().toISOString(),
            dailyEarnings: level === 1 ? 0.88 : level === 2 ? 3.35 : 6.05,
            totalEarnings: 0,
            status: 'active'
        };
        
        if (!dataManager.data.dolls[userId]) {
            dataManager.data.dolls[userId] = [];
        }
        
        dataManager.data.dolls[userId].push(doll);
        
        dataManager.updateUserData(userId, { 
            user: userData.user,
            dolls: dataManager.data.dolls[userId]
        });
        
        console.log('✅ 用户购买娃娃:', userId, '等级:', level);
        
        // 广播新娃娃消息
        io.emit('dollPurchased', {
            user: userData.user.name,
            level,
            dollId: doll.id
        });
        
        res.json({
            message: '购买成功',
            doll,
            userPoints: userData.user.points
        });
    } catch (error) {
        console.error('❌ 购买娃娃失败:', error);
        res.status(500).json({ message: '购买失败', error: error.message });
    }
});

// 🔧 修复：获取用户娃娃列表
app.get('/api/dolls', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        res.json(userData.dolls || []);
    } catch (error) {
        console.error('获取娃娃列表失败:', error);
        res.status(500).json({ message: '获取娃娃失败', error: error.message });
    }
});

// 🔧 修复：保存用户娃娃数据
app.post('/api/dolls/user/:userId', authenticateToken, (req, res) => {
    try {
        const { userId } = req.params;
        const { dolls, gameState } = req.body;
        
        if (req.user.userId !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: '权限不足' });
        }
        
        dataManager.data.dolls[userId] = dolls || [];
        
        if (gameState) {
            // 更新游戏状态
            Object.assign(dataManager.data.globalData, gameState);
        }
        
        dataManager.saveData();
        
        res.json({
            success: true,
            message: '娃娃数据保存成功'
        });
    } catch (error) {
        console.error('保存用户娃娃数据失败:', error);
        res.status(500).json({ message: '保存失败', error: error.message });
    }
});

// 🔧 修复：获取积分历史
app.get('/api/user/points/history', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        res.json({
            success: true,
            data: {
                history: userData.pointsHistory || []
            }
        });
    } catch (error) {
        console.error('获取积分历史失败:', error);
        res.status(500).json({ message: '获取积分历史失败', error: error.message });
    }
});

// 🔧 修复：获取用户统计
app.get('/api/user/stats', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        const userData = dataManager.getUserData(userId);
        
        const stats = {
            totalOrders: (userData.orders || []).length,
            pendingOrders: (userData.orders || []).filter(o => o.status === 'pending').length,
            processingOrders: (userData.orders || []).filter(o => o.status === 'processing').length,
            completedOrders: (userData.orders || []).filter(o => o.status === 'completed').length,
            cancelledOrders: (userData.orders || []).filter(o => o.status === 'cancelled').length,
            totalSpent: (userData.orders || []).filter(order => order.status === 'completed').reduce((total, order) => total + (order.totalAmount || 0), 0),
            totalDolls: (userData.dolls || []).length,
            activeDolls: (userData.dolls || []).filter(d => d.status === 'active').length,
            totalBackpackItems: (userData.backpack || []).length,
            currentPoints: userData.user.points || 0,
            totalEarned: (userData.pointsHistory || []).filter(h => h.type === 'earn').reduce((total, h) => total + h.amount, 0),
            totalSpent: (userData.pointsHistory || []).filter(h => h.type === 'spend').reduce((total, h) => total + Math.abs(h.amount), 0)
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('获取用户统计失败:', error);
        res.status(500).json({ message: '获取用户统计失败', error: error.message });
    }
});

// 🔧 修复：JWT 验证中间件
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
    
    // 🔧 修复：用户登录
    socket.on('userLogin', (userData) => {
        socket.userData = userData;
        socket.broadcast.emit('userOnline', userData);
    });
    
    // 🔧 修复：用户数据同步
    socket.on('syncUserData', (data) => {
        const { userId, userData } = data;
        
        if (socket.userData && socket.userData.role === 'admin') {
            // 管理员可以同步任何用户数据
            dataManager.updateUserData(userId, userData);
            
            // 向用户广播数据更新
            socket.to(`user_${userId}`).emit('userDataSync', {
                userId: userId,
                userData: dataManager.getUserData(userId),
                timestamp: new Date().toISOString()
            });
        } else if (socket.userData && socket.userData.userId === userId) {
            // 用户只能同步自己的数据
            dataManager.updateUserData(userId, userData);
            
            // 向用户广播数据更新
            socket.to(`user_${userId}`).emit('userDataSync', {
                userId: userId,
                userData: dataManager.getUserData(userId),
                timestamp: new Date().toISOString()
            });
        }
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

// 🔧 修复：初始化管理员账号
async function initAdmin() {
    try {
        // 检查是否已存在管理员账号
        let adminExists = false;
        for (const [userId, user] of Object.entries(dataManager.data.users)) {
            if (user.username === 'admin') {
                adminExists = true;
                console.log('✅ 管理员账号已存在:', userId);
                break;
            }
        }
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            const adminUserId = 'admin_001';
            const adminUser = {
                id: adminUserId,
                username: 'admin',
                password: hashedPassword,
                name: '系统管理员',
                role: 'admin',
                points: 999999,
                canes: 1000,
                isActive: true,
                createTime: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                banned: false
            };
            
            dataManager.data.users[adminUserId] = adminUser;
            dataManager.saveData();
            
            console.log('✅ 管理员账号创建成功');
            console.log('👑 用户名: admin');
            console.log('🔑 密码: admin123');
            console.log('🆔 用户ID: admin_001');
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
        console.log('🆔 用户ID: admin_001');
        console.log('=====================================');
        console.log('🎮 游戏页面:');
        console.log('👻 恐怖奶奶: /grandma.html');
        console.log('🎲 幸运骰子: /dice.html');
        console.log('🧸 娃娃系统: /doll.html');
        console.log('=====================================');
        console.log('🔧 数据同步API已启用');
        console.log('📁 数据文件:', DATA_FILE);
        console.log('=====================================');
    });
}).catch(error => {
    console.error('❌ 服务器启动失败:', error);
});
