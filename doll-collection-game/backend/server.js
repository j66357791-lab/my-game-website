const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const http = require('http');
const { Server } = require('socket.io');

// 导入数据库模型
const User = require('./models/User');
const Doll = require('./models/Doll');
const Transaction = require('./models/Transaction');
const Transfer = require('./models/Transfer');

// 导入家庭乐园模型
const Family = require('./models/Family');
const Chicken = require('./models/Chicken');
const Feed = require('./models/Feed');
const Egg = require('./models/Egg');
const FamilyTransaction = require('./models/FamilyTransaction');

// 导入新增模型
const EggPool = require('./models/EggPool');

// 导入工具类
const LifespanManager = require('./utils/lifespan-manager');
const FeedLimiter = require('./utils/feed-limiter');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 🔥 新增：动物大冒险Socket服务（完整版）
const initAdventureSocket = require('./sockets/adventure-socket');

// 🔥 初始化动物大冒险Socket服务
initAdventureSocket(server);

const PORT = process.env.PORT || 3000;

// 环境变量配置
const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/doll-collection-game';

// 转账配置
const TRANSFER_CONFIG = {
    dailyLimit: 1000,        // 每日转账限额
    singleLimit: 100,        // 单次转账限额
    minTransfer: 0.01        // 最小转账金额
};

// 家庭乐园配置
const FAMILY_CONFIG = {
    coopUpgradeCosts: {
        2: 5000,
        3: 10000
    },
    chickenDrawCost: 500,
    eggExchangeRate: 100,
    dailyEggReleaseRate: 0.01
};

// 系统配置 - 修改二级娃娃价格为210
const systemConfig = {
    dollPrices: { 1: 50, 2: 210, 3: 500 },
    dollLifespans: { 1: 60, 2: 70, 3: 90 },
    dollIncomeRanges: {
        1: { min: 0.84, max: 0.92 },
        2: { min: 3.05, max: 3.25 },
        3: { min: 6.0, max: 6.3 }
    }
};

// 在线用户管理
const onlineUsers = new Map();

// WebSocket连接管理（家庭乐园）
io.on('connection', (socket) => {
    console.log('🔗 用户连接:', socket.id);
    
    // 用户登录
    socket.on('user-login', async (data) => {
        try {
            const { token } = data;
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (user) {
                onlineUsers.set(socket.id, {
                    userId: user._id,
                    username: user.username,
                    socketId: socket.id
                });
                
                // 加入用户房间
                socket.join(`user_${user._id}`);
                
                // 获取用户家庭并加入家庭房间
                const family = await Family.findOne({
                    $or: [
                        { ownerId: user._id },
                        { 'members.userId': user._id }
                    ]
                });
                
                if (family) {
                    socket.join(`family_${family._id}`);
                    socket.emit('family-joined', { familyId: family._id });
                    
                    // 通知家庭其他成员
                    socket.to(`family_${family._id}`).emit('member-online', {
                        userId: user._id,
                        username: user.username
                    });
                }
                
                socket.emit('login-success', { 
                    userId: user._id,
                    username: user.username 
                });
            }
        } catch (error) {
            socket.emit('login-error', { message: '登录验证失败' });
        }
    });
    
    // 用户断开连接
    socket.on('disconnect', () => {
        const userInfo = onlineUsers.get(socket.id);
        if (userInfo) {
            console.log('🔌 用户断开:', userInfo.username);
            
            // 通知家庭其他成员
            User.findById(userInfo.userId).then(user => {
                if (user) {
                    Family.findOne({
                        $or: [
                            { ownerId: user._id },
                            { 'members.userId': user._id }
                        ]
                    }).then(family => {
                        if (family) {
                            socket.to(`family_${family._id}`).emit('member-offline', {
                                userId: user._id,
                                username: user.username
                            });
                        }
                    });
                }
            });
            
            onlineUsers.delete(socket.id);
        }
    });
    
    // 喂养小鸡事件 - 增强版本
    socket.on('feed-chicken', async (data) => {
        try {
            const { chickenId, feedId, token } = data;
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (!user) {
                socket.emit('feed-error', { message: '用户验证失败' });
                return;
            }
            
            const chicken = await Chicken.findById(chickenId);
            const feed = await Feed.findById(feedId);
            
            if (!chicken || !feed) {
                socket.emit('feed-error', { message: '小鸡或饲料不存在' });
                return;
            }
            
            // 检查喂养权限
            const canFeedResult = await FeedLimiter.canFeed(user._id, chickenId);
            if (!canFeedResult.canFeed) {
                socket.emit('feed-error', { message: canFeedResult.reason });
                return;
            }
            
            // 检查积分
            if (user.points < feed.price) {
                socket.emit('feed-error', { message: '积分不足' });
                return;
            }
            
            // 执行喂养
            await User.findByIdAndUpdate(user._id, {
                $inc: { points: -feed.price }
            });
            
            const growthValue = feed.getRandomGrowth();
            const feedResult = await chicken.recordFeed(user._id, feedId, feed.price, growthValue);
            
            // 记录喂养限制
            await FeedLimiter.recordFeed(user._id, chickenId, feedId, feed.price);
            
            // 记录交易
            await FamilyTransaction.create({
                familyId: chicken.familyId,
                userId: user._id,
                chickenId: chicken._id,
                feedId: feedId,
                type: 'feed_purchase',
                amount: -feed.price,
                description: `喂养${chicken.name}，获得${growthValue}成长值`,
                details: {
                    growthValue: growthValue,
                    pointsSpent: feed.price,
                    feedType: 'normal'
                }
            });
            
            // 获取更新后的用户信息
            const updatedUser = await User.findById(user._id);
            
            // 通知家庭所有成员
            const family = await Family.findById(chicken.familyId);
            io.to(`family_${family._id}`).emit('chicken-fed', {
                chickenId: chicken._id,
                chickenName: chicken.name,
                feederName: user.username,
                growthValue: growthValue,
                upgraded: feedResult.upgraded,
                newLevel: chicken.level,
                newGrowthValue: chicken.growthValue,
                userPoints: updatedUser.points,
                feedType: 'normal'
            });
            
            socket.emit('feed-success', {
                message: `喂养成功！${chicken.name}获得${growthValue}成长值${feedResult.upgraded ? '并升级了！' : ''}`,
                chicken: chicken,
                userPoints: updatedUser.points
            });
            
        } catch (error) {
            console.error('WebSocket喂养错误:', error);
            socket.emit('feed-error', { message: '喂养失败' });
        }
    });
    
    // 协作喂养事件 - 新增
    socket.on('cooperative-feed', async (data) => {
        try {
            const { chickenId, feedId, token, contributorIds } = data;
            const decoded = jwt.verify(token, JWT_SECRET);
            const mainUser = await User.findById(decoded.id);
            
            if (!mainUser) {
                socket.emit('feed-error', { message: '用户验证失败' });
                return;
            }
            
            const chicken = await Chicken.findById(chickenId);
            const feed = await Feed.findById(feedId);
            
            if (!chicken || !feed) {
                socket.emit('feed-error', { message: '小鸡或饲料不存在' });
                return;
            }
            
            // 检查是否是协作所有者
            const isCooperativeOwner = chicken.cooperativeOwners.some(
                owner => owner.userId.toString() === mainUser._id.toString()
            );
            
            if (!isCooperativeOwner) {
                socket.emit('feed-error', { message: '您不是该小鸡的协作所有者' });
                return;
            }
            
            // 计算总积分需求
            const totalContributors = contributorIds ? contributorIds.length + 1 : 1;
            const totalPoints = feed.price * totalContributors;
            
            // 检查主用户积分
            if (mainUser.points < totalPoints) {
                socket.emit('feed-error', { message: `积分不足，需要${totalPoints}积分` });
                return;
            }
            
            // 执行协作喂养
            const growthValue = feed.getRandomGrowth();
            const bonusGrowth = Math.floor(growthValue * 0.2); // 协作喂养额外20%成长值
            const totalGrowth = growthValue + bonusGrowth;
            
            // 扣除主用户积分
            await User.findByIdAndUpdate(mainUser._id, {
                $inc: { points: -totalPoints }
            });
            
            // 更新小鸡
            chicken.growthValue += totalGrowth;
            chicken.lastFeedDate = new Date();
            
            let upgraded = false;
            if (chicken.canUpgrade()) {
                upgraded = chicken.upgrade();
            }
            
            await chicken.save();
            
            // 更新协作所有者贡献点
            await chicken.updateContributionPoints(mainUser._id, totalGrowth);
            
            // 记录交易
            await FamilyTransaction.create({
                familyId: chicken.familyId,
                userId: mainUser._id,
                chickenId: chicken._id,
                feedId: feedId,
                type: 'feed_purchase',
                amount: -totalPoints,
                description: `协作喂养${chicken.name}，获得${totalGrowth}成长值`,
                details: {
                    growthValue: totalGrowth,
                    pointsSpent: totalPoints,
                    feedType: 'cooperative',
                    bonusGrowth: bonusGrowth,
                    contributorCount: totalContributors
                },
                relatedUsers: [
                    { userId: mainUser._id, role: 'main', contribution: totalGrowth }
                ]
            });
            
            // 获取更新后的用户信息
            const updatedUser = await User.findById(mainUser._id);
            
            // 通知家庭所有成员
            const family = await Family.findById(chicken.familyId);
            io.to(`family_${family._id}`).emit('cooperative-chicken-fed', {
                chickenId: chicken._id,
                chickenName: chicken.name,
                mainFeederName: mainUser.username,
                growthValue: totalGrowth,
                bonusGrowth: bonusGrowth,
                upgraded: upgraded,
                newLevel: chicken.level,
                newGrowthValue: chicken.growthValue,
                userPoints: updatedUser.points,
                contributorCount: totalContributors,
                message: `${mainUser.username}发起了协作喂养，${chicken.name}获得${totalGrowth}成长值（含${bonusGrowth}奖励）`
            });
            
            socket.emit('cooperative-feed-success', {
                message: `协作喂养成功！${chicken.name}获得${totalGrowth}成长值（含${bonusGrowth}奖励）${upgraded ? '并升级了！' : ''}`,
                chicken: chicken,
                userPoints: updatedUser.points,
                contributorCount: totalContributors
            });
            
        } catch (error) {
            console.error('WebSocket协作喂养错误:', error);
            socket.emit('feed-error', { message: '协作喂养失败' });
        }
    });
    
    // 产蛋通知事件
    socket.on('egg-produced', async (data) => {
        try {
            const { familyId, chickenId, eggCount } = data;
            
            // 通知家庭所有成员
            io.to(`family_${familyId}`).emit('new-eggs', {
                chickenId: chickenId,
                eggCount: eggCount,
                message: `小鸡产了${eggCount}个鸡蛋！`
            });
            
        } catch (error) {
            console.error('WebSocket产蛋通知错误:', error);
        }
    });
    
    // 小鸡升级通知
    socket.on('chicken-upgraded', async (data) => {
        try {
            const { familyId, chickenId, newLevel } = data;
            
            // 通知家庭所有成员
            io.to(`family_${family._id}`).emit('chicken-leveled-up', {
                chickenId: chickenId,
                newLevel: newLevel,
                message: `恭喜！小鸡升级到${newLevel}级！`
            });
            
        } catch (error) {
            console.error('WebSocket升级通知错误:', error);
        }
    });
    
    // 积分池释放通知 - 新增
    socket.on('egg-pool-released', async (data) => {
        try {
            const { familyId, pointsReleased, pointsPerMember } = data;
            
            // 通知家庭所有成员
            io.to(`family_${family._id}`).emit('egg-pool-released', {
                familyId: familyId,
                pointsReleased: pointsReleased,
                pointsPerMember: pointsPerMember,
                message: `积分池释放成功，每位成员获得${pointsPerMember}积分`
            });
            
        } catch (error) {
            console.error('WebSocket积分池释放通知错误:', error);
        }
    });
    
    // 寿命管理通知 - 新增
    socket.on('lifespan-changed', async (data) => {
        try {
            const { familyId, chickenId, changeType, newLifespan, reason } = data;
            
            // 通知家庭所有成员
            io.to(`family_${family._id}`).emit('lifespan-changed', {
                chickenId: chickenId,
                changeType: changeType,
                newLifespan: newLifespan,
                reason: reason,
                message: `小鸡寿命${changeType}，当前寿命：${newLifespan}天，原因：${reason}`
            });
            
        } catch (error) {
            console.error('WebSocket寿命管理通知错误:', error);
        }
    });
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 🔥 新增：动物大冒险静态文件服务
app.use('/adventure', express.static(path.join(__dirname, '../frontend/adventure')));

// 创建默认管理员
const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                password: 'admin123',
                email: 'admin@tianchuang.com',
                points: 10000,
                role: 'admin',
                active: true
            });
            console.log('👑 默认管理员已创建: admin / admin123');
        }
    } catch (error) {
        console.error('❌ 创建管理员错误:', error);
    }
};

// 🔥 新增：创建测试用户
const createTestUsers = async () => {
    try {
        const testUsers = [
            { username: 'test1', password: '123456', points: 1000 },
            { username: 'test2', password: '123456', points: 500 },
            { username: 'test3', password: '123456', points: 2000 }
        ];
        
        for (const testUser of testUsers) {
            const existingUser = await User.findOne({ username: testUser.username });
            if (!existingUser) {
                await User.create({
                    username: testUser.username,
                    password: testUser.password,
                    email: `${testUser.username}@test.com`,
                    points: testUser.points,
                    role: 'user',
                    active: true
                });
                console.log(`👤 创建测试用户: ${testUser.username} / ${testUser.password} (积分: ${testUser.points})`);
            }
        }
    } catch (error) {
        console.error('❌ 创建测试用户失败:', error);
    }
};

// 初始化家庭乐园数据
const initFamilyData = async () => {
    try {
        // 检查是否已有饲料数据
        const feedCount = await Feed.countDocuments();
        if (feedCount === 0) {
            // 创建默认饲料
            await Feed.create([
                { name: '迷你饲料', price: 10, growthValue: 12, description: '基础饲料，适合新手' },
                { name: '小型饲料', price: 30, growthValue: 38, description: '性价比不错的选择' },
                { name: '中型饲料', price: 60, growthValue: 80, description: '效果显著的中级饲料' },
                { name: '大型饲料', price: 100, growthValue: 138, description: '高级饲料，效果出众' },
                { name: '超大型饲料', price: 200, growthValue: 248, description: '顶级饲料，效果惊人' },
                { name: '神秘饲料', price: 58, growthValue: 73, minGrowth: 38, maxGrowth: 108, isSpecial: true, description: '随机成长值，充满惊喜' }
            ]);
            console.log('🌾 饲料数据初始化完成');
        }
    } catch (error) {
        console.error('❌ 初始化家庭乐园数据错误:', error);
    }
};

// 中间件：验证JWT令牌
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '访问令牌缺失' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: '用户不存在' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: '无效的访问令牌' });
    }
};

// 中间件：检查管理员权限
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: '需要管理员权限' });
    }
    next();
};

// 每日收益自动发放 - 每天24:00执行
cron.schedule('0 0 * * *', async () => {
    console.log('🕐 开始执行每日收益发放...');
    await calculateAndDistributeDailyIncome();
});

// 重置每日转账限额 - 每天0点执行
cron.schedule('0 0 * * *', async () => {
    console.log('🔄 重置每日转账限额...');
    await User.updateMany(
        {},
        { $set: { dailyTransferAmount: 0, lastTransferDate: new Date() } }
    );
});

// 每日产蛋任务 - 每天0点执行
cron.schedule('0 0 * * *', async () => {
    console.log('🥚 开始执行每日产蛋任务...');
    await dailyEggProduction();
});

// 积分池每日释放 - 每天0点执行
cron.schedule('0 0 * * *', async () => {
    console.log('💰 开始执行积分池每日释放...');
    await dailyPointsPoolRelease();
});

// 寿命管理检查 - 每天0点执行
cron.schedule('0 0 * * *', async () => {
    console.log('🔍 开始执行每日寿命管理检查...');
    await LifespanManager.checkAndUpdateLifespans();
});

// 鸡蛋新鲜度更新 - 每6小时执行
cron.schedule('0 */6 * * *', async () => {
    console.log('🥚 开始执行鸡蛋新鲜度更新...');
    await Egg.updateAllFreshness();
});

// 计算并发放每日收益
async function calculateAndDistributeDailyIncome() {
    try {
        const activeDolls = await Doll.find({ active: true });
        
        for (const doll of activeDolls) {
            // 减少剩余天数
            doll.remainingDays -= 1;
            
            // 如果还有剩余天数，发放收益
            if (doll.remainingDays > 0) {
                const user = await User.findById(doll.userId);
                if (user) {
                    user.points += doll.dailyIncome;
                    await user.save();
                    
                    // 记录交易
                    await Transaction.create({
                        userId: doll.userId,
                        type: 'income',
                        amount: doll.dailyIncome,
                        description: `${doll.level}级娃娃每日收益`
                    });
                }
            } else {
                // 娃娃寿命结束，设为非活跃
                doll.active = false;
            }
            
            await doll.save();
        }
        
        console.log('✅ 每日收益发放完成');
    } catch (error) {
        console.error('❌ 每日收益发放失败:', error);
    }
}

// 每日产蛋任务 - 增强版本，支持实时通知
async function dailyEggProduction() {
    try {
        // 获取所有成年小鸡（3级以上）
        const adultChickens = await Chicken.find({
            level: { $gte: 3 },
            isAdult: true
        }).populate('familyId');
        
        for (const chicken of adultChickens) {
            // 检查小鸡健康状态
            if (!chicken.checkHealth()) {
                console.log(`小鸡${chicken.name}健康状况不佳，跳过产蛋`);
                continue;
            }
            
            // 计算产蛋数量
            const eggCount = chicken.calculateEggProduction();
            
            if (eggCount > 0) {
                // 创建鸡蛋记录
                const egg = await Egg.create({
                    familyId: chicken.familyId._id,
                    chickenId: chicken._id,
                    quantity: eggCount,
                    productionDate: new Date()
                });
                
                console.log(`小鸡${chicken.name}产了${eggCount}个鸡蛋`);
                
                // 通过WebSocket通知家庭成员
                io.to(`family_${chicken.familyId._id}`).emit('egg-produced', {
                    familyId: chicken.familyId._id,
                    chickenId: chicken._id,
                    eggCount: eggCount,
                    chickenName: chicken.name
                });
            }
        }
        
        console.log('✅ 每日产蛋任务完成');
    } catch (error) {
        console.error('❌ 每日产蛋任务失败:', error);
    }
}

// 积分池每日释放 - 增强版本
async function dailyPointsPoolRelease() {
    try {
        // 获取所有家庭
        const families = await Family.find({});
        
        for (const family of families) {
            try {
                // 获取家庭积分池
                const eggPool = await EggPool.findOne({ familyId: family._id });
                
                if (!eggPool || !eggPool.isActive) {
                    continue;
                }
                
                // 执行每日释放
                const releaseResult = await EggPool.dailyRelease(family._id);
                
                if (releaseResult.released) {
                    console.log(`家庭${family.name}释放了${releaseResult.pointsReleased}积分到成员池`);
                    
                    // 通过WebSocket通知家庭成员
                    io.to(`family_${family._id}`).emit('egg-pool-released', {
                        familyId: family._id,
                        pointsReleased: releaseResult.pointsReleased,
                        pointsPerMember: releaseResult.pointsPerMember,
                        message: `积分池释放成功，每位成员获得${releaseResult.pointsPerMember}积分`
                    });
                }
            } catch (error) {
                console.error(`❌ 家庭${family.name}积分池释放失败:`, error);
            }
        }
        
        console.log('✅ 积分池每日释放完成');
    } catch (error) {
        console.error('❌ 积分池每日释放失败:', error);
    }
}

// 健康检查
app.get('/api/health', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const dollCount = await Doll.countDocuments();
        const familyCount = await Family.countDocuments();
        const chickenCount = await Chicken.countDocuments();
        const eggCount = await Egg.countDocuments();
        const eggPoolCount = await EggPool.countDocuments();
        const onlineCount = onlineUsers.size;
        
        res.json({ 
            status: 'OK', 
            timestamp: new Date(),
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            websocket: 'connected',
            stats: {
                users: userCount,
                dolls: dollCount,
                families: familyCount,
                chickens: chickenCount,
                eggs: eggCount,
                eggPools: eggPoolCount,
                online: onlineCount
            }
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 用户注册 - 修改：不赠送积分
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ message: '用户名、密码和邮箱均为必填项' });
        }

        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        await User.create({
            username,
            password,
            email,
            points: 0, // 修改：注册时不赠送积分
            role: 'user',
            active: true
        });

        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码均为必填项' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        const validPassword = await user.comparePassword(password);
        if (!validPassword) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                points: user.points,
                role: user.role
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 验证令牌
app.get('/api/auth/validate', authenticateToken, (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            points: req.user.points,
            role: req.user.role
        }
    });
});

// 获取用户娃娃
app.get('/api/dolls/my-dolls', authenticateToken, async (req, res) => {
    try {
        const userDolls = await Doll.find({ userId: req.user._id });
        res.json({ dolls: userDolls });
    } catch (error) {
        console.error('获取娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 购买娃娃 - 修改：支持批量购买
app.post('/api/dolls/buy', authenticateToken, async (req, res) => {
    try {
        const { level, quantity } = req.body;
        const buyQuantity = quantity || 1; // 默认购买1个
        
        if (!level || ![1, 2, 3].includes(level)) {
            return res.status(400).json({ message: '无效的娃娃等级' });
        }
        
        if (buyQuantity < 1 || buyQuantity > 100) {
            return res.status(400).json({ message: '购买数量必须在1-100之间' });
        }
        
        const price = systemConfig.dollPrices[level];
        const totalPrice = price * buyQuantity;
        
        if (req.user.points < totalPrice) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        const newDolls = [];
        
        for (let i = 0; i < buyQuantity; i++) {
            const range = systemConfig.dollIncomeRanges[level];
            const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
            
            const doll = await Doll.create({
                userId: req.user._id,
                level: level,
                price: price,
                purchaseDate: new Date(),
                lifespan: systemConfig.dollLifespans[level],
                remainingDays: systemConfig.dollLifespans[level],
                dailyIncome: parseFloat(dailyIncome),
                active: true
            });
            
            newDolls.push(doll);
        }
        
        // 扣除积分
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -totalPrice }
        });
        
        // 记录交易
        await Transaction.create({
            userId: req.user._id,
            type: 'purchase',
            amount: -totalPrice,
            description: `购买${buyQuantity}个${level}级娃娃`
        });
        
        const updatedUser = await User.findById(req.user._id);
        
        res.json({
            dolls: newDolls,
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error('购买娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 合成娃娃 - 修改：寿命动态计算
app.post('/api/dolls/synthesize', authenticateToken, async (req, res) => {
    try {
        const { doll1Id, doll2Id, points } = req.body;
        const pointsNum = parseInt(points) || 0;
        
        if (!doll1Id || !doll2Id) {
            return res.status(400).json({ message: '请选择两个娃娃进行合成' });
        }
        
        if (req.user.points < pointsNum) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        const doll1 = await Doll.findOne({ _id: doll1Id, userId: req.user._id });
        const doll2 = await Doll.findOne({ _id: doll2Id, userId: req.user._id });
        
        if (!doll1 || !doll2) {
            return res.status(400).json({ message: '娃娃不存在' });
        }
        
        if (doll1.level !== doll2.level) {
            return res.status(400).json({ message: '只能合成相同等级的娃娃' });
        }
        
        if (doll1.level >= 3) {
            return res.status(400).json({ message: '无法合成更高级别的娃娃' });
        }
        
        const successRate = Math.min(pointsNum * 0.9, 90);
        const isSuccess = Math.random() * 100 < successRate;
        
        // 扣除积分
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -pointsNum }
        });
        
        // 记录交易
        await Transaction.create({
            userId: req.user._id,
            type: 'synthesis',
            amount: -pointsNum,
            description: '娃娃合成消耗'
        });
        
        let newDoll = null;
        
        if (isSuccess) {
            const newLevel = doll1.level + 1;
            
            // 修改：动态计算寿命 - 取两个娃娃剩余天数的平均值，再加上基础寿命的20%
            const avgRemainingDays = (doll1.remainingDays + doll2.remainingDays) / 2;
            const baseLifespan = systemConfig.dollLifespans[newLevel];
            const bonusDays = Math.floor(baseLifespan * 0.2); // 基础寿命的20%作为奖励
            const finalRemainingDays = Math.min(avgRemainingDays + bonusDays, baseLifespan);
            
            const range = systemConfig.dollIncomeRanges[newLevel];
            const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
            
            newDoll = await Doll.create({
                userId: req.user._id,
                level: newLevel,
                price: 0,
                purchaseDate: new Date(),
                lifespan: baseLifespan,
                remainingDays: finalRemainingDays,
                dailyIncome: parseFloat(dailyIncome),
                active: true
            });
            
            // 将原娃娃设为非活跃
            await Doll.updateMany(
                { _id: { $in: [doll1Id, doll2Id] } },
                { $set: { active: false } }
            );
        }
        
        const userDolls = await Doll.find({ userId: req.user._id });
        const updatedUser = await User.findById(req.user._id);
        
        res.json({
            success: isSuccess,
            newDoll,
            dolls: userDolls,
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error('合成娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// ==================== 好友系统 API ====================

// 搜索用户
app.get('/api/friends/search', authenticateToken, async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ message: '搜索关键词不能为空' });
        }
        
        const users = await User.find({
            username: { $regex: username, $options: 'i' },
            _id: { $ne: req.user._id }
        }).select('username email createdAt').limit(10);
        
        res.json({ users });
    } catch (error) {
        console.error('搜索用户错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 发送好友请求
app.post('/api/friends/request', authenticateToken, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        
        if (!targetUserId) {
            return res.status(400).json({ message: '目标用户ID不能为空' });
        }
        
        if (targetUserId === req.user._id.toString()) {
            return res.status(400).json({ message: '不能添加自己为好友' });
        }
        
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: '目标用户不存在' });
        }
        
        // 检查是否已经是好友
        const isAlreadyFriend = req.user.friends.some(friend => 
            friend.userId.toString() === targetUserId
        );
        if (isAlreadyFriend) {
            return res.status(400).json({ message: '已经是好友关系' });
        }
        
        // 检查是否已发送请求
        const hasRequested = targetUser.friendRequests.some(request => 
            request.fromUserId.toString() === req.user._id.toString()
        );
        if (hasRequested) {
            return res.status(400).json({ message: '已发送好友请求，请等待对方同意' });
        }
        
        // 添加好友请求
        targetUser.friendRequests.push({
            fromUserId: req.user._id
        });
        await targetUser.save();
        
        res.json({ message: '好友请求已发送' });
    } catch (error) {
        console.error('发送好友请求错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取好友列表
app.get('/api/friends', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friends.userId', 'username email');
        res.json({ friends: user.friends });
    } catch (error) {
        console.error('获取好友列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取好友请求
app.get('/api/friends/requests', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friendRequests.fromUserId', 'username email');
        res.json({ requests: user.friendRequests });
    } catch (error) {
        console.error('获取好友请求错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 处理好友请求
app.post('/api/friends/respond', authenticateToken, async (req, res) => {
    try {
        const { requestId, action } = req.body; // action: 'accept' or 'reject'
        
        if (!requestId || !action) {
            return res.status(400).json({ message: '参数不完整' });
        }
        
        const user = await User.findById(req.user._id);
        const requestIndex = user.friendRequests.findIndex(req => 
            req._id.toString() === requestId
        );
        
        if (requestIndex === -1) {
            return res.status(404).json({ message: '好友请求不存在' });
        }
        
        const request = user.friendRequests[requestIndex];
        
        if (action === 'accept') {
            // 添加好友关系
            user.friends.push({
                userId: request.fromUserId
            });
            
            // 双向添加好友
            const fromUser = await User.findById(request.fromUserId);
            fromUser.friends.push({
                userId: req.user._id
            });
            await fromUser.save();
        }
        
        // 移除请求
        user.friendRequests.splice(requestIndex, 1);
        await user.save();
        
        res.json({ message: action === 'accept' ? '已接受好友请求' : '已拒绝好友请求' });
    } catch (error) {
        console.error('处理好友请求错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除好友
app.delete('/api/friends/:friendId', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.params;
        
        // 从当前用户的好友列表中移除
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { friends: { userId: friendId } }
        });
        
        // 从好友的好友列表中移除当前用户
        await User.findByIdAndUpdate(friendId, {
            $pull: { friends: { userId: req.user._id } }
        });
        
        res.json({ message: '好友已删除' });
    } catch (error) {
        console.error('删除好友错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// ==================== 转账系统 API ====================

// 积分转账 - 修复500错误
app.post('/api/transfer', authenticateToken, async (req, res) => {
    try {
        const { toUserId, amount, description } = req.body;
        
        if (!toUserId || !amount) {
            return res.status(400).json({ message: '收款用户和转账金额不能为空' });
        }
        
        if (toUserId === req.user._id.toString()) {
            return res.status(400).json({ message: '不能给自己转账' });
        }
        
        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount < TRANSFER_CONFIG.minTransfer) {
            return res.status(400).json({ 
                message: `转账金额不能小于${TRANSFER_CONFIG.minTransfer}积分` 
            });
        }
        
        if (transferAmount > TRANSFER_CONFIG.singleLimit) {
            return res.status(400).json({ 
                message: `单次转账不能超过${TRANSFER_CONFIG.singleLimit}积分` 
            });
        }
        
        if (req.user.points < transferAmount) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 检查每日转账限额
        const today = new Date().toDateString();
        const lastTransferDate = req.user.lastTransferDate ? 
            req.user.lastTransferDate.toDateString() : null;
        
        let dailyTransferAmount = req.user.dailyTransferAmount || 0;
        if (lastTransferDate !== today) {
            dailyTransferAmount = 0;
        }
        
        if (dailyTransferAmount + transferAmount > TRANSFER_CONFIG.dailyLimit) {
            return res.status(400).json({ 
                message: `每日转账限额为${TRANSFER_CONFIG.dailyLimit}积分，今日已转账${dailyTransferAmount}积分` 
            });
        }
        
        const toUser = await User.findById(toUserId);
        if (!toUser) {
            return res.status(404).json({ message: '收款用户不存在' });
        }
        
        // 检查是否是好友（可选的安全限制）
        const isFriend = req.user.friends.some(friend => 
            friend.userId.toString() === toUserId
        );
        if (!isFriend) {
            return res.status(400).json({ message: '只能给好友转账' });
        }
        
        // 简化转账逻辑，不使用事务
        try {
            // 扣除转账用户积分
            const fromUser = await User.findById(req.user._id);
            if (fromUser.points < transferAmount) {
                return res.status(400).json({ message: '积分不足' });
            }
            
            fromUser.points -= transferAmount;
            fromUser.dailyTransferAmount = dailyTransferAmount + transferAmount;
            fromUser.lastTransferDate = new Date();
            await fromUser.save();
            
            // 增加收款用户积分
            toUser.points += transferAmount;
            await toUser.save();
            
            // 记录转账
            const Transfer = require('./models/Transfer');
            const transfer = await Transfer.create({
                fromUserId: req.user._id,
                toUserId: toUserId,
                amount: transferAmount,
                description: description || '积分转账'
            });
            
            // 记录交易
            await Transaction.create({
                userId: req.user._id,
                type: 'transfer_out',
                amount: -transferAmount,
                description: `转账给${toUser.username}: ${description || '积分转账'}`
            });
            
            await Transaction.create({
                userId: toUserId,
                type: 'transfer_in',
                amount: transferAmount,
                description: `收到${req.user.username}转账: ${description || '积分转账'}`
            });
            
            const updatedUser = await User.findById(req.user._id);
            
            res.json({
                message: '转账成功',
                transfer: transfer,
                user: {
                    id: updatedUser._id,
                    username: updatedUser.username,
                    points: updatedUser.points
                }
            });
        } catch (transferError) {
            console.error('转账执行错误:', transferError);
            return res.status(500).json({ message: '转账执行失败' });
        }
    } catch (error) {
        console.error('转账错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取转账记录
app.get('/api/transfers', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const Transfer = require('./models/Transfer');
        const transfers = await Transfer.find({
            $or: [
                { fromUserId: req.user._id },
                { toUserId: req.user._id }
            ]
        })
        .populate('fromUserId', 'username')
        .populate('toUserId', 'username')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
        
        const total = await Transfer.countDocuments({
            $or: [
                { fromUserId: req.user._id },
                { toUserId: req.user._id }
            ]
        });
        
        res.json({
            transfers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取转账记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// ==================== 家庭乐园系统 API ====================

// 创建或获取家庭
app.post('/api/family/create', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: '家庭名称不能为空' });
        }
        
        // 检查用户是否已有家庭
        const existingFamily = await Family.findOne({ 
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (existingFamily) {
            return res.status(400).json({ message: '您已加入其他家庭' });
        }
        
        // 创建新家庭
        const family = await Family.create({
            name,
            ownerId: req.user._id,
            members: [{ userId: req.user._id }]
        });
        
        // 首次创建家庭赠送小鸡
        const chicken = await Chicken.create({
            familyId: family._id,
            ownerId: req.user._id,
            name: `${req.user.username}的小鸡`,
            level: 0,
            quality: '普通'
        });
        
        res.json({
            message: '家庭创建成功！获得一只小鸡',
            family,
            chicken,
        });
    } catch (error) {
        console.error('创建家庭错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取我的家庭信息
app.get('/api/family/my-family', authenticateToken, async (req, res) => {
    try {
        const family = await Family.findOne({
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        }).populate('members.userId', 'username email')
        .populate('ownerId', 'username email');
        
        if (!family) {
            return res.json({ family: null, message: '您还没有加入任何家庭' });
        }
        
        // 获取家庭的小鸡
        const chickens = await Chicken.find({ familyId: family._id })
            .populate('ownerId', 'username')
            .populate('cooperativeOwners.userId', 'username');
        
        // 获取家庭的鸡蛋
        const eggs = await Egg.find({ 
            familyId: family._id, 
            collected: false 
        }).populate('chickenId', 'name');
        
        res.json({
            family,
            chickens,
            eggs
        });
    } catch (error) {
        console.error('获取家庭信息错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 邀请好友加入家庭
app.post('/api/family/invite', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.body;
        
        if (!friendId) {
            return res.status(400).json({ message: '好友ID不能为空' });
        }
        
        // 检查好友是否存在
        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json({ message: '好友不存在' });
        }
        
        // 检查是否为好友关系
        const user = await User.findById(req.user._id);
        const isFriend = user.friends.some(f => f.userId.toString() === friendId);
        if (!isFriend) {
            return res.status(400).json({ message: '只能邀请好友加入家庭' });
        }
        
        // 获取用户的家庭
        const family = await Family.findOne({
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(400).json({ message: '您还没有家庭' });
        }
        
        // 检查好友是否已在其他家庭
        const friendFamily = await Family.findOne({
            $or: [
                { ownerId: friendId },
                { 'members.userId': friendId }
            ]
        });
        
        if (friendFamily) {
            return res.status(400).json({ message: '好友已加入其他家庭' });
        }
        
        // 添加好友到家庭
        family.members.push({ userId: friendId });
        await family.save();
        
        // 首次邀请好友赠送小鸡
        const chicken = await Chicken.create({
            familyId: family._id,
            ownerId: friendId,
            name: `${friend.username}的小鸡`,
            level: 0,
            quality: '普通'
        });
        
        // 通过WebSocket通知
        io.to(`family_${family._id}`).emit('member-invited', {
            familyId: family._id,
            newMember: {
                userId: friendId,
                username: friend.username
            },
            chicken: chicken
        });
        
        res.json({
            message: '好友邀请成功！好友获得一只小鸡',
            family,
            chicken,
        });
    } catch (error) {
        console.error('邀请好友错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 协同领养小鸡 - 新增
app.post('/api/family/cooperative-adopt', authenticateToken, async (req, res) => {
    try {
        const { chickenId, targetUserId, role } = req.body;
        
        if (!chickenId || !targetUserId) {
            return res.status(400).json({ message: '小鸡ID和目标用户ID不能为空' });
        }
        
        // 检查小鸡是否存在
        const chicken = await Chicken.findById(chickenId);
        if (!chicken) {
            return res.status(404).json({ message: '小鸡不存在' });
        }
        
        // 检查目标用户是否存在
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: '目标用户不存在' });
        }
        
        // 检查用户是否在同一个家庭
        const family = await Family.findOne({
            _id: chicken.familyId,
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(400).json({ message: '您和小鸡不在同一个家庭' });
        }
        
        // 检查目标用户是否在家庭中
        const isMember = family.members.some(m => m.userId.toString() === targetUserId);
        if (!isMember) {
            return res.status(400).json({ message: '目标用户不在家庭中' });
        }
        
        // 检查用户是否已是协作所有者
        const isCooperativeOwner = chicken.cooperativeOwners.some(
            owner => owner.userId.toString() === targetUserId.toString()
        );
        
        if (isCooperativeOwner) {
            return res.status(400).json({ message: '该用户已是协作所有者' });
        }
        
        // 添加协作所有者
        await chicken.addCooperativeOwner(targetUserId, role || '次要');
        
        // 在家庭中记录协同领养
        await family.addCooperativeChicken(chickenId, targetUserId, req.user._id, role || '次要');
        
        // 通过WebSocket通知
        io.to(`family_${family._id}`).emit('cooperative-chicken-adopted', {
            familyId: family._id,
            chickenId: chickenId,
            chickenName: chicken.name,
            targetUserId: targetUserId,
            targetUsername: targetUser.username,
            invitedBy: req.user.username,
            role: role || '次要',
            message: `${req.user.username}邀请${targetUser.username}成为${chicken.name}的协作所有者`
        });
        
        res.json({
            message: '协同领养成功！',
            chicken: chicken,
            targetUser: {
                id: targetUser._id,
                username: targetUser.username
            },
            role: role || '次要'
        });
    } catch (error) {
        console.error('协同领养小鸡错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取家庭协同领养信息 - 新增
app.get('/api/family/cooperative-chickens/:familyId', authenticateToken, async (req, res) => {
    try {
        const { familyId } = req.params;
        
        // 检查用户是否是家庭成员
        const family = await Family.findOne({
            _id: familyId,
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(404).json({ message: '家庭不存在或您不是成员' });
        }
        
        const cooperativeChickens = await family.getCooperativeChickens();
        
        res.json({
            success: true,
            familyId: familyId,
            cooperativeChickens: cooperativeChickens
        });
    } catch (error) {
        console.error('获取协同领养信息错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取饲料商城
app.get('/api/family/feed-shop', authenticateToken, async (req, res) => {
    try {
        const feeds = await Feed.find({ isActive: true });
        res.json({ feeds });
    } catch (error) {
        console.error('获取饲料商城错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 购买饲料
app.post('/api/family/buy-feed', authenticateToken, async (req, res) => {
    try {
        const { feedId, quantity = 1 } = req.body;
        
        if (!feedId) {
            return res.status(400).json({ message: '饲料ID不能为空' });
        }
        
        const feed = await Feed.findById(feedId);
        if (!feed || !feed.isActive) {
            return res.status(404).json({ message: '饲料不存在或已下架' });
        }
        
        const totalPrice = feed.price * quantity;
        
        if (req.user.points < totalPrice) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 扣除积分
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -totalPrice }
        });
        
        // 记录交易
        await FamilyTransaction.create({
            familyId: null, // 临时记录，后续需要关联家庭
            userId: req.user._id,
            type: 'feed_purchase',
            amount: -totalPrice,
            description: `购买${quantity}个${feed.name}`
        });
        
        const updatedUser = await User.findById(req.user._id);
        
        res.json({
            message: `成功购买${quantity}个${feed.name}`,
            feed: {
                ...feed.toObject(),
                quantity,
                totalPrice
            },
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points
            }
        });
    } catch (error) {
        console.error('购买饲料错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 喂养小鸡 - 增强版本，支持实时通知
app.post('/api/family/feed-chicken', authenticateToken, async (req, res) => {
    try {
        const { chickenId, feedId } = req.body;
        
        if (!chickenId || !feedId) {
            return res.status(400).json({ message: '小鸡ID和饲料ID不能为空' });
        }
        
        const chicken = await Chicken.findById(chickenId);
        const feed = await Feed.findById(feedId);
        
        if (!chicken) {
            return res.status(404).json({ message: '小鸡不存在' });
        }
        
        if (!feed || !feed.isActive) {
            return res.status(404).json({ message: '饲料不存在或已下架' });
        }
        
        // 检查用户是否有权限喂养这只小鸡
        const family = await Family.findOne({
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family || !family._id.equals(chicken.familyId)) {
            return res.status(403).json({ message: '您没有权限喂养这只小鸡' });
        }
        
        // 检查喂养权限
        const canFeedResult = await FeedLimiter.canFeed(req.user._id, chickenId);
        if (!canFeedResult.canFeed) {
            return res.status(400).json({ message: canFeedResult.reason });
        }
        
        // 检查用户积分
        if (req.user.points < feed.price) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 执行喂养
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -feed.price }
        });
        
        const growthValue = feed.getRandomGrowth();
        const feedResult = await chicken.recordFeed(req.user._id, feedId, feed.price, growthValue);
        
        // 记录喂养限制
        await FeedLimiter.recordFeed(req.user._id, chickenId, feedId, feed.price);
        
        // 记录交易
        await FamilyTransaction.create({
            familyId: chicken.familyId,
            userId: req.user._id,
            chickenId: chicken._id,
            feedId: feedId,
            type: 'feed_purchase',
            amount: -feed.price,
            description: `喂养${chicken.name}，获得${growthValue}成长值`,
            details: {
                growthValue: growthValue,
                pointsSpent: feed.price,
                feedType: 'normal'
            }
        });
        
        const updatedUser = await User.findById(req.user._id);
        
        // 通过WebSocket通知家庭成员
        io.to(`family_${family._id}`).emit('chicken-fed', {
            chickenId: chicken._id,
            chickenName: chicken.name,
            feederName: req.user.username,
            growthValue: growthValue,
            upgraded: feedResult.upgraded,
            newLevel: chicken.level,
            newGrowthValue: chicken.growthValue,
            userPoints: updatedUser.points,
            feedType: 'normal'
        });
        
        res.json({
            message: `喂养成功！${chicken.name}获得${growthValue}成长值${feedResult.upgraded ? '并升级了！' : ''}`,
            chicken: chicken,
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points
            }
        });
    } catch (error) {
        console.error('喂养小鸡错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 协作喂养小鸡 - 新增
app.post('/api/family/cooperative-feed', authenticateToken, async (req, res) => {
    try {
        const { chickenId, feedId, contributorIds } = req.body;
        
        if (!chickenId || !feedId) {
            return res.status(400).json({ message: '小鸡ID和饲料ID不能为空' });
        }
        
        const chicken = await Chicken.findById(chickenId);
        const feed = await Feed.findById(feedId);
        
        if (!chicken) {
            return res.status(404).json({ message: '小鸡不存在' });
        }
        
        if (!feed || !feed.isActive) {
            return res.status(404).json({ message: '饲料不存在或已下架' });
        }
        
        // 检查用户是否是协作所有者
        const isCooperativeOwner = chicken.cooperativeOwners.some(
            owner => owner.userId.toString() === req.user._id.toString()
        );
        
        if (!isCooperativeOwner) {
            return res.status(403).json({ message: '您不是该小鸡的协作所有者' });
        }
        
        // 计算总积分需求
        const totalContributors = contributorIds ? contributorIds.length + 1 : 1;
        const totalPoints = feed.price * totalContributors;
        
        // 检查主用户积分
        if (req.user.points < totalPoints) {
            return res.status(400).json({ message: `积分不足，需要${totalPoints}积分` });
        }
        
        // 执行协作喂养
        const growthValue = feed.getRandomGrowth();
        const bonusGrowth = Math.floor(growthValue * 0.2); // 协作喂养额外20%成长值
        const totalGrowth = growthValue + bonusGrowth;
        
        // 扣除主用户积分
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -totalPoints }
        });
        
        // 更新小鸡
        chicken.growthValue += totalGrowth;
        chicken.lastFeedDate = new Date();
        
        let upgraded = false;
        if (chicken.canUpgrade()) {
            upgraded = chicken.upgrade();
        }
        
        await chicken.save();
        
        // 更新协作所有者贡献点
        await chicken.updateContributionPoints(req.user._id, totalGrowth);
        
        // 记录交易
        await FamilyTransaction.create({
            familyId: chicken.familyId,
            userId: req.user._id,
            chickenId: chicken._id,
            feedId: feedId,
            type: 'feed_purchase',
            amount: -totalPoints,
            description: `协作喂养${chicken.name}，获得${totalGrowth}成长值`,
            details: {
                growthValue: totalGrowth,
                pointsSpent: totalPoints,
                feedType: 'cooperative',
                bonusGrowth: bonusGrowth,
                contributorCount: totalContributors
            },
            relatedUsers: [
                { userId: req.user._id, role: 'main', contribution: totalGrowth }
            ]
        });
        
        // 获取更新后的用户信息
        const updatedUser = await User.findById(req.user._id);
        
        // 通知家庭所有成员
        const family = await Family.findById(chicken.familyId);
        io.to(`family_${family._id}`).emit('cooperative-chicken-fed', {
            chickenId: chicken._id,
            chickenName: chicken.name,
            mainFeederName: req.user.username,
            growthValue: totalGrowth,
            bonusGrowth: bonusGrowth,
            upgraded: upgraded,
            newLevel: chicken.level,
            newGrowthValue: chicken.growthValue,
            userPoints: updatedUser.points,
            contributorCount: totalContributors,
            message: `${req.user.username}发起了协作喂养，${chicken.name}获得${totalGrowth}成长值（含${bonusGrowth}奖励）`
        });
        
        res.json({
            message: `协作喂养成功！${chicken.name}获得${totalGrowth}成长值（含${bonusGrowth}奖励）${upgraded ? '并升级了！' : ''}`,
            chicken: chicken,
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points
            },
            contributorCount: totalContributors
        });
    } catch (error) {
        console.error('协作喂养小鸡错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 抽取新小鸡
app.post('/api/family/draw-chicken', authenticateToken, async (req, res) => {
    try {
        // 检查用户是否有家庭
        const family = await Family.findOne({
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(400).json({ message: '您还没有加入任何家庭' });
        }
        
        // 检查家庭是否有达到3级的小鸡
        const hasLevel3Chicken = await Chicken.findOne({
            familyId: family._id,
            level: { $gte: 3 }
        });
        
        if (!hasLevel3Chicken) {
            return res.status(400).json({ message: '需要有一只3级以上的小鸡才能抽取新小鸡' });
        }
        
        // 检查积分
        if (req.user.points < FAMILY_CONFIG.chickenDrawCost) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 检查养鸡场容量
        const currentChickens = await Chicken.countDocuments({ familyId: family._id });
        if (currentChickens >= family.maxChickens) {
            return res.status(400).json({ message: '养鸡场已满，请先升级养鸡场' });
        }
        
        // 扣除积分
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -FAMILY_CONFIG.chickenDrawCost }
        });
        
        // 抽取小鸡品质
        const random = Math.random() * 100;
        let quality;
        if (random < 75) {
            quality = '普通';
        } else if (random < 90) {
            quality = '精英';
        } else if (random < 98) {
            quality = '传说';
        } else {
            quality = '神话';
        }
        
        // 创建新小鸡
        const chicken = await Chicken.create({
            familyId: family._id,
            ownerId: req.user._id,
            name: `${req.user.username}的${quality}小鸡`,
            quality: quality
        });
        
        // 通过WebSocket通知
        io.to(`family_${family._id}`).emit('chicken-drawn', {
            familyId: family._id,
            chicken: chicken,
            drawerName: req.user.username,
            quality: quality
        });
        
        // 记录交易
        await FamilyTransaction.create({
            familyId: family._id,
            userId: req.user._id,
            type: 'chicken_draw',
            amount: -FAMILY_CONFIG.chickenDrawCost,
            description: `抽取${quality}小鸡`
        });
        
        const updatedUser = await User.findById(req.user._id);
        
        res.json({
            message: `抽取成功！获得${quality}小鸡`,
            chicken,
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points
            }
        });
    } catch (error) {
        console.error('抽取小鸡错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 升级养鸡场
app.post('/api/family/upgrade-coop', authenticateToken, async (req, res) => {
    try {
        const { targetLevel } = req.body;
        
        if (!targetLevel || targetLevel < 2 || targetLevel > 3) {
            return res.status(400).json({ message: '目标等级无效' });
        }
        
        // 获取用户的家庭
        const family = await Family.findOne({
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(400).json({ message: '您还没有加入任何家庭' });
        }
        
        // 检查是否为家庭主人
        if (!family.ownerId.equals(req.user._id)) {
            return res.status(403).json({ message: '只有家庭主人可以升级养鸡场' });
        }
        
        // 检查当前等级
        if (family.level >= targetLevel) {
            return res.status(400).json({ message: '当前等级已达到或超过目标等级' });
        }
        
        // 检查是否满足升级条件
        if (targetLevel === 2) {
            // 需要有一只5级的小鸡
            const hasLevel5Chicken = await Chicken.findOne({
                familyId: family._id,
                level: { $gte: 5 }
            });
            
            if (!hasLevel5Chicken) {
                return res.status(400).json({ message: '需要有一只5级以上的小鸡才能升级到2级养鸡场' });
            }
        } else if (targetLevel === 3) {
            // 需要有一只6级的小鸡
            const hasLevel6Chicken = await Chicken.findOne({
                familyId: family._id,
                level: { $gte: 6 }
            });
            
            if (!hasLevel6Chicken) {
                return res.status(400).json({ message: '需要有一只6级的小鸡才能升级到3级养鸡场' });
            }
        }
        
        const upgradeCost = FAMILY_CONFIG.coopUpgradeCosts[targetLevel];
        
        if (req.user.points < upgradeCost) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 扣除积分
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -upgradeCost }
        });
        
        // 升级养鸡场
        family.level = targetLevel;
        await family.updateMaxChickens();
        
        // 通过WebSocket通知
        io.to(`family_${family._id}`).emit('coop-upgraded', {
            familyId: family._id,
            newLevel: targetLevel,
            newMaxChickens: family.maxChickens,
            upgradedBy: req.user.username
        });
        
        // 记录交易
        await FamilyTransaction.create({
            familyId: family._id,
            userId: req.user._id,
            type: 'coop_upgrade',
            amount: -upgradeCost,
            description: `升级养鸡场到${targetLevel}级`
        });
        
        const updatedUser = await User.findById(req.user._id);
        
        res.json({
            message: `养鸡场升级成功！当前容量：${family.maxChickens}只`,
            family,
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points
            }
        });
    } catch (error) {
        console.error('升级养鸡场错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 收集鸡蛋
app.post('/api/family/collect-eggs', authenticateToken, async (req, res) => {
    try {
        const { eggIds, exchangeToPool = false } = req.body;
        
        if (!eggIds || !Array.isArray(eggIds) || eggIds.length === 0) {
            return res.status(400).json({ message: '请选择要收集的鸡蛋' });
        }
        
        // 获取用户的家庭
        const family = await Family.findOne({
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(400).json({ message: '您还没有加入任何家庭' });
        }
        
        let totalEggs = 0;
        const collectedEggs = [];
        
        for (const eggId of eggIds) {
            const egg = await Egg.findById(eggId);
            
            if (!egg || !egg.familyId.equals(family._id) || egg.collected) {
                continue;
            }
            
            if (exchangeToPool) {
                // 兑换到积分池
                const eggPool = await EggPool.getOrCreatePool(family._id);
                await eggPool.addEggs(family._id, egg.quantity);
                totalEggs += egg.quantity;
                collectedEggs.push(egg);
            } else {
                // 收集鸡蛋
                egg.collected = true;
                egg.collectedBy = req.user._id;
                egg.collectedAt = new Date();
                await egg.save();
                
                totalEggs += egg.quantity;
                collectedEggs.push(egg);
            }
        }
        
        if (totalEggs === 0) {
            return res.status(400).json({ message: '没有可收集的鸡蛋' });
        }
        
        let message = '';
        let totalPoints = 0;
        
        if (exchangeToPool) {
            message = `成功将${totalEggs}个鸡蛋兑换到积分池`;
        } else {
            // 兑换积分
            totalPoints = totalEggs * FAMILY_CONFIG.eggExchangeRate;
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { points: totalPoints }
            });
            
            message = `成功收集${totalEggs}个鸡蛋，兑换${totalPoints}积分`;
        }
        
        // 通过WebSocket通知
        io.to(`family_${family._id}`).emit('eggs-collected', {
            familyId: family._id,
            totalEggs: totalEggs,
            totalPoints: totalPoints,
            collectedBy: req.user.username,
            exchangeToPool: exchangeToPool,
            message: message
        });
        
        // 记录交易
        await FamilyTransaction.create({
            familyId: family._id,
            userId: req.user._id,
            type: exchangeToPool ? 'egg_pool_exchange' : 'egg_exchange',
            amount: totalPoints,
            description: message
        });
        
        const updatedUser = await User.findById(req.user._id);
        
        res.json({
            message: message,
            totalEggs: totalEggs,
            totalPoints: totalPoints,
            exchangeToPool: exchangeToPool,
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points
            }
        });
    } catch (error) {
        console.error('收集鸡蛋错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// ==================== 鸡蛋积分池系统 API ====================

// 加载鸡蛋积分池路由
const eggPoolRouter = require('./routes/egg-pool');
app.use('/api/egg-pool', eggPoolRouter);

// 加载喂养限制路由
const feedLimiterRouter = require('./routes/feed-limiter');
app.use('/api/feed-limiter', feedLimiterRouter);

// ==================== 寿命管理系统 API ====================

// 获取小鸡寿命报告
app.get('/api/chicken/lifespan-report/:chickenId', authenticateToken, async (req, res) => {
    try {
        const { chickenId } = req.params;
        
        // 检查用户是否有权限查看这只小鸡
        const chicken = await Chicken.findById(chickenId);
        if (!chicken) {
            return res.status(404).json({ message: '小鸡不存在' });
        }
        
        const family = await Family.findOne({
            _id: chicken.familyId,
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.status(403).json({ message: '您没有权限查看这只小鸡的寿命报告' });
        }
        
        const report = await LifespanManager.getLifespanReport(chickenId);
        
        res.json({
            success: true,
            report: report
        });
    } catch (error) {
        console.error('获取寿命报告错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 手动调整小鸡寿命
app.post('/api/chicken/adjust-lifespan/:chickenId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { chickenId } = req.params;
        const { days, reason } = req.body;
        
        if (!days || isNaN(days)) {
            return res.status(400).json({ message: '请输入有效的天数' });
        }
        
        const result = await LifespanManager.manualAdjustLifespan(chickenId, parseInt(days), reason || '管理员调整', req.user._id);
        
        res.json({
            success: true,
            message: result.message,
            newLifespan: result.newLifespan
        });
    } catch (error) {
        console.error('手动调整寿命错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 获取所有小鸡的寿命状态
app.get('/api/chicken/lifespan-status', authenticateToken, async (req, res) => {
    try {
        // 检查用户是否有家庭
        const family = await Family.findOne({
            $or: [
                { ownerId: req.user._id },
                { 'members.userId': req.user._id }
            ]
        });
        
        if (!family) {
            return res.json({ success: true, chickens: [] });
        }
        
        // 获取家庭所有小鸡
        const chickens = await Chicken.find({ familyId: family._id });
        
        const lifespanReports = [];
        
        for (const chicken of chickens) {
            const report = await LifespanManager.getLifespanReport(chicken._id);
            lifespanReports.push(report);
        }
        
        res.json({
            success: true,
            familyId: family._id,
            chickens: lifespanReports
        });
    } catch (error) {
        console.error('获取寿命状态错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 执行寿命管理检查
app.post('/api/chicken/check-lifespans', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await LifespanManager.checkAndUpdateLifespans();
        
        res.json({
            success: true,
            message: '寿命管理检查完成',
            result: result
        });
    } catch (error) {
        console.error('执行寿命管理检查错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// ==================== 管理员路由 ====================

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json({ users });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.get('/api/admin/dolls', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { level, active, userId } = req.query;
        let filter = {};
        
        if (level) filter.level = parseInt(level);
        if (active !== undefined) filter.active = active === 'true';
        if (userId) filter.userId = userId;
        
        const dolls = await Doll.find(filter).populate('userId', 'username');
        res.json({ dolls });
    } catch (error) {
        console.error('获取娃娃列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取交易记录
app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, type, startDate, endDate } = req.query;
        let filter = {};
        
        if (userId) filter.userId = userId;
        if (type) filter.type = type;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        
        const transactions = await Transaction.find(filter)
            .populate('userId', 'username')
            .sort({ createdAt: -1 });
            
        res.json({ transactions });
    } catch (error) {
        console.error('获取交易记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 调整娃娃价格
app.post('/api/admin/update-doll-prices', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { prices } = req.body;
        
        if (!prices || typeof prices !== 'object') {
            return res.status(400).json({ message: '无效的价格数据' });
        }
        
        // 更新系统配置
        Object.keys(prices).forEach(level => {
            if (systemConfig.dollPrices[level] !== undefined) {
                systemConfig.dollPrices[level] = prices[level];
            }
        });
        
        res.json({ 
            message: '娃娃价格更新成功',
            prices: systemConfig.dollPrices
        });
    } catch (error) {
        console.error('更新娃娃价格错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 调整娃娃寿命
app.post('/api/admin/adjust-doll-lifespan', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { dollId, remainingDays } = req.body;
        
        const doll = await Doll.findById(dollId);
        if (!doll) {
            return res.status(400).json({ message: '娃娃不存在' });
        }
        
        doll.remainingDays = Math.max(0, Math.min(remainingDays, doll.lifespan));
        doll.active = doll.remainingDays > 0;
        await doll.save();
        
        res.json({ message: '娃娃寿命调整成功' });
    } catch (error) {
        console.error('调整娃娃寿命错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 新增：删除娃娃
app.delete('/api/admin/dolls/:dollId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { dollId } = req.params;
        
        const doll = await Doll.findById(dollId);
        if (!doll) {
            return res.status(404).json({ message: '娃娃不存在' });
        }
        
        await Doll.findByIdAndDelete(dollId);
        
        res.json({ message: '娃娃删除成功' });
    } catch (error) {
        console.error('删除娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 新增：切换用户状态
app.post('/api/admin/toggle-user-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        user.active = !user.active;
        await user.save();
        
        res.json({ 
            message: `用户${user.active ? '启用' : '禁用'}成功`,
            active: user.active
        });
    } catch (error) {
        console.error('切换用户状态错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 手动计算每日收益
app.post('/api/admin/calculate-daily-income', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await calculateAndDistributeDailyIncome();
        res.json({ message: '每日收益计算并发放完成' });
    } catch (error) {
        console.error('手动计算收益错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 新增：手动执行积分池释放
app.post('/api/admin/release-egg-pool/:familyId?', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { familyId } = req.params;
        
        if (familyId) {
            // 释放特定家庭的积分池
            const result = await EggPool.dailyRelease(familyId);
            res.json({
                success: true,
                message: result.message,
                familyId: familyId,
                ...result
            });
        } else {
            // 释放所有家庭的积分池
            const families = await Family.find({});
            const results = [];
            
            for (const family of families) {
                const result = await EggPool.dailyRelease(family._id);
                results.push({
                    familyId: family._id,
                    familyName: family.name,
                    ...result
                });
            }
            
            res.json({
                success: true,
                message: '所有家庭积分池释放完成',
                results: results
            });
        }
    } catch (error) {
        console.error('手动执行积分池释放错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 新增：手动执行寿命管理检查
app.post('/api/admin/check-lifespans', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await LifespanManager.checkAndUpdateLifespans();
        
        res.json({
            success: true,
            message: '寿命管理检查完成',
            result: result
        });
    } catch (error) {
        console.error('手动执行寿命管理检查错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 新增：手动更新鸡蛋新鲜度
app.post('/api/admin/update-egg-freshness', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await Egg.updateAllFreshness();
        
        res.json({
            success: true,
            message: '鸡蛋新鲜度更新完成',
            result: result
        });
    } catch (error) {
        console.error('手动更新鸡蛋新鲜度错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

app.post('/api/admin/adjust-points', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: '用户不存在' });
        }
        
        user.points = parseFloat(points);
        await user.save();
        
        res.json({ message: '积分调整成功' });
    } catch (error) {
        console.error('调整积分错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取系统配置
app.get('/api/admin/system-config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        res.json({ config: systemConfig });
    } catch (error) {
        console.error('获取系统配置错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取系统统计信息 - 新增
app.get('/api/admin/system-stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const activeUserCount = await User.countDocuments({ active: true });
        const dollCount = await Doll.countDocuments();
        const activeDollCount = await Doll.countDocuments({ active: true });
        const familyCount = await Family.countDocuments();
        const chickenCount = await Chicken.countDocuments();
        const activeChickenCount = await Chicken.countDocuments({ active: true });
        const eggCount = await Egg.countDocuments();
        const collectedEggCount = await Egg.countDocuments({ collected: true });
        const eggPoolCount = await EggPool.countDocuments();
        const familyTransactionCount = await FamilyTransaction.countDocuments();
        
        // 获取最近24小时的交易统计
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentTransactions = await FamilyTransaction.countDocuments({
            createdAt: { $gte: last24Hours }
        });
        
        // 获取积分池统计
        const eggPoolStats = await EggPool.aggregate([
            {
                $group: {
                    _id: null,
                    totalEggs: { $sum: '$totalEggs' },
                    totalPoints: { $sum: '$totalPoints' },
                    activePools: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1] } }
                }
            }
        ]);
        
        res.json({
            success: true,
            timestamp: new Date(),
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            websocket: 'connected',
            stats: {
                users: {
                    total: userCount,
                    active: activeUserCount
                },
                dolls: {
                    total: dollCount,
                    active: activeDollCount
                },
                families: familyCount,
                chickens: {
                    total: chickenCount,
                    active: activeChickenCount
                },
                eggs: {
                    total: eggCount,
                    collected: collectedEggCount,
                    available: eggCount - collectedEggCount
                },
                eggPools: {
                    total: eggPoolCount,
                    active: eggPoolStats[0]?.activePools || 0,
                    totalEggs: eggPoolStats[0]?.totalEggs || 0,
                    totalPoints: eggPoolStats[0]?.totalPoints || 0
                },
                transactions: {
                    total: familyTransactionCount,
                    recent24Hours: recentTransactions
                }
            }
        });
    } catch (error) {
        console.error('获取系统统计错误:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 家庭乐园路由
app.get('/family乐园', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/family乐园/index.html'));
});

app.get('/family乐园/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/family乐园/index.html'));
});

// 静态文件路由（CSS、JS、图片等）
app.use('/family乐园/css', express.static(path.join(__dirname, '../frontend/family乐园/css')));
app.use('/family乐园/js', express.static(path.join(__dirname, '../frontend/family乐园/js')));
app.use('/family乐园/images', express.static(path.join(__dirname, '../frontend/family乐园/images')));

// 管理员页面路由
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// 404处理
app.use('*', (req, res) => {
    // 如果是API请求，返回404 JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API接口不存在' });
    }
    // 如果是页面请求，返回404页面
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - 页面不存在</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #ff6b6b; }
            </style>
        </head>
        <body>
            <h1>404 - 页面不存在</h1>
            <p>您访问的页面不存在，请检查URL是否正确。</p>
            <a href="/">返回首页</a>
        </body>
        </html>
    `);
});

// 启动服务器
server.listen(PORT, async () => {
    console.log('🚀 正在启动天创娃娃收藏服务器...');
    
    // 创建默认管理员
    await createDefaultAdmin();
    
    // 初始化家庭乐园数据
    await initFamilyData();
    
    // 🔥 新增：创建测试用户
    await createTestUsers();
    
    console.log('========================================');
    console.log(`🎮 天创娃娃收藏服务器运行在端口 ${PORT}`);
    console.log(`🌐 WebSocket已启用`);
    console.log(`📊 数据库: ${mongoose.connection.readyState === 1 ? '✅ 已连接' : '❌ 未连接'}`);
    console.log(`🎮 动物大冒险访问地址: http://localhost:${PORT}/adventure`);
    console.log('========================================');
});
