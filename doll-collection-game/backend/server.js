const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 导入数据库模型
const User = require('./models/User');
const Doll = require('./models/Doll');
const Transaction = require('./models/Transaction');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024';

// MongoDB连接字符串 - 使用环境变量，更安全
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/doll-collection-game';

// 连接MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB连接成功'))
.catch(err => {
    console.error('MongoDB连接失败:', err);
    console.log('请检查MONGODB_URI环境变量是否正确设置');
});

// 中间件 - 配置CORS以允许生产环境域名
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://tianchuang.onrender.com', 'https://您的域名.com'] // 生产环境域名
        : ['http://localhost:3000', 'http://127.0.0.1:3000'], // 开发环境域名
    credentials: true
}));

app.use(express.json());

// 静态文件服务 - 根据环境配置路径
if (process.env.NODE_ENV === 'production') {
    // 生产环境：前端文件与后端在同一目录
    app.use(express.static(path.join(__dirname, 'frontend')));
} else {
    // 开发环境：前端文件在上级目录
    app.use(express.static(path.join(__dirname, '../frontend')));
}

// 系统配置
const systemConfig = {
    dollPrices: { 1: 50, 2: 200, 3: 500 },
    dollLifespans: { 1: 60, 2: 70, 3: 90 },
    dollIncomeRanges: {
        1: { min: 0.84, max: 0.92 },
        2: { min: 3.05, max: 3.25 },
        3: { min: 6.0, max: 6.3 }
    }
};

// 创建默认管理员
const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                password: 'admin123', // 模型会自动加密
                email: 'admin@tianchuang.com',
                points: 10000,
                role: 'admin',
                active: true
            });
            console.log('默认管理员账户已创建: admin / admin123');
        } else {
            console.log('管理员账户已存在');
        }
    } catch (error) {
        console.error('创建管理员错误:', error);
    }
};

// 立即创建管理员
createDefaultAdmin();

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
        if (!user.active) {
            return res.status(401).json({ message: '账户已被禁用' });
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

// API路由
// 健康检查
app.get('/api/health', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const dollCount = await Doll.countDocuments();
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        res.json({ 
            status: 'OK', 
            timestamp: new Date(), 
            database: dbStatus,
            environment: process.env.NODE_ENV || 'development',
            users: userCount,
            dolls: dollCount
        });
    } catch (error) {
        res.status(500).json({ message: '数据库错误', error: error.message });
    }
});

// 用户认证路由
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // 验证输入
        if (!username || !password || !email) {
            return res.status(400).json({ message: '用户名、密码和邮箱均为必填项' });
        }

        // 检查用户是否已存在
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 创建用户
        await User.create({
            username,
            password,
            email,
            points: 1000,
            role: 'user',
            active: true
        });

        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码均为必填项' });
        }

        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 检查密码
        const validPassword = await user.comparePassword(password);
        if (!validPassword) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 检查用户状态
        if (!user.active) {
            return res.status(400).json({ message: '账户已被禁用' });
        }

        // 生成JWT令牌
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

// 娃娃相关路由
app.get('/api/dolls/my-dolls', authenticateToken, async (req, res) => {
    try {
        const userDolls = await Doll.find({ userId: req.user._id }).sort({ purchaseDate: -1 });
        res.json({ dolls: userDolls });
    } catch (error) {
        console.error('获取娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/dolls/buy', authenticateToken, async (req, res) => {
    try {
        const { level } = req.body;
        
        if () {
            return res.status(400).json({ message: '无效的娃娃等级' });
        }
        
        const price = systemConfig.dollPrices[level];
        
        // 检查用户积分
        if (req.user.points < price) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 计算每日收益
        const range = systemConfig.dollIncomeRanges[level];
        const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
        
        // 创建娃娃
        const doll = await Doll.create({
            userId: req.user._id,
            level,
            price,
            purchaseDate: new Date(),
            lifespan: systemConfig.dollLifespans[level],
            remainingDays: systemConfig.dollLifespans[level],
            dailyIncome: parseFloat(dailyIncome),
            active: true
        });
        
        // 扣除用户积分
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -price }
        });
        
        // 记录交易
        await Transaction.create({
            userId: req.user._id,
            type: 'purchase',
            amount: -price,
            description: `购买${level}级娃娃`
        });
        
        // 获取更新后的用户信息
        const updatedUser = await User.findById(req.user._id);
        
        res.json({
            doll,
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

app.post('/api/dolls/synthesize', authenticateToken, async (req, res) => {
    try {
        const { doll1Id, doll2Id, points } = req.body;
        const pointsNum = parseInt(points) || 0;
        
        if (!doll1Id || !doll2Id) {
            return res.status(400).json({ message: '请选择两个娃娃进行合成' });
        }
        
        // 检查积分
        if (req.user.points < pointsNum) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 获取娃娃
        const doll1 = await Doll.findOne({ _id: doll1Id, userId: req.user._id });
        const doll2 = await Doll.findOne({ _id: doll2Id, userId: req.user._id });
        
        if (!doll1 || !doll2) {
            return res.status(400).json({ message: '娃娃不存在' });
        }
        
        // 检查娃娃等级
        if (doll1.level !== doll2.level) {
            return res.status(400).json({ message: '只能合成相同等级的娃娃' });
        }
        
        if (doll1.level >= 3) {
            return res.status(400).json({ message: '无法合成更高级别的娃娃' });
        }
        
        // 计算成功率
        const successRate = Math.min(pointsNum * 0.9, 90); // 最大成功率90%
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
            description: `娃娃合成消耗`
        });
        
        let newDoll = null;
        
        if (isSuccess) {
            // 合成成功
            const newLevel = doll1.level + 1;
            
            // 计算剩余天数（取较小值）
            const remainingDays = Math.min(doll1.remainingDays, doll2.remainingDays);
            
            // 计算每日收益
            const range = systemConfig.dollIncomeRanges[newLevel];
            const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
            
            // 创建新娃娃
            newDoll = await Doll.create({
                userId: req.user._id,
                level: newLevel,
                price: 0, // 合成获得的娃娃价格为0
                purchaseDate: new Date(),
                lifespan: systemConfig.dollLifespans[newLevel],
                remainingDays,
                dailyIncome: parseFloat(dailyIncome),
                active: true
            });
            
            // 停用原来的娃娃
            await Doll.updateMany(
                { _id: { $in: [doll1Id, doll2Id] } },
                { $set: { active: false } }
            );
            
            // 记录交易
            await Transaction.create({
                userId: req.user._id,
                type: 'synthesis_success',
                amount: 0,
                description: `成功合成${newLevel}级娃娃`
            });
        } else {
            // 合成失败，记录失败交易
            await Transaction.create({
                userId: req.user._id,
                type: 'synthesis_failed',
                amount: 0,
                description: `合成失败，积分已消耗`
            });
        }
        
        // 获取更新后的娃娃列表
        const userDolls = await Doll.find({ userId: req.user._id });
        const updatedUser = await User.findById(req.user._id);
        
        res.json({
            success: isSuccess,
            successRate: successRate,
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

// 管理员路由
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
        
        const usersWithDollCount = await Promise.all(
            users.map(async (user) => {
                const dollCount = await Doll.countDocuments({ userId: user._id });
                const activeDollCount = await Doll.countDocuments({ 
                    userId: user._id, 
                    active: true 
                });
                return {
                    ...user.toObject(),
                    dollCount,
                    activeDollCount
                };
            })
        );
        
        res.json({ users: usersWithDollCount });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.get('/api/admin/dolls', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dolls = await Doll.find().populate('userId', 'username').sort({ purchaseDate: -1 });
        const dollsWithUser = dolls.map(doll => ({
            ...doll.toObject(),
            username: doll.userId ? doll.userId.username : '未知用户'
        }));
        
        res.json({ dolls: dollsWithUser });
    } catch (error) {
        console.error('获取娃娃列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        const transactions = await Transaction.find()
            .populate('userId', 'username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const total = await Transaction.countDocuments();
        
        const transactionsWithUser = transactions.map(transaction => ({
            ...transaction.toObject(),
            username: transaction.userId ? transaction.userId.username : '未知用户'
        }));
        
        res.json({ 
            transactions: transactionsWithUser,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取交易记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/admin/adjust-points', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        if (!userId || points === undefined) {
            return res.status(400).json({ message: '用户ID和积分均为必填项' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: '用户不存在' });
        }
        
        const oldPoints = user.points;
        user.points = parseFloat(points);
        await user.save();
        
        // 记录交易
        await Transaction.create({
            userId: user._id,
            type: 'admin_adjust',
            amount: user.points - oldPoints,
            description: `管理员调整积分`
        });
        
        res.json({ 
            message: '积分调整成功',
            oldPoints,
            newPoints: user.points
        });
    } catch (error) {
        console.error('调整积分错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/admin/toggle-user-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: '用户ID为必填项' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: '用户不存在' });
        }
        
        user.active = !user.active;
        await user.save();
        
        res.json({ 
            message: `用户已${user.active ? '启用' : '禁用'}`,
            active: user.active
        });
    } catch (error) {
        console.error('切换用户状态错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/admin/create-user', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, email, points = 1000 } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ message: '用户名、密码和邮箱均为必填项' });
        }

        // 检查用户是否已存在
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 创建用户
        await User.create({
            username,
            password,
            email,
            points: parseFloat(points),
            role: 'user',
            active: true
        });

        res.json({ message: '用户创建成功' });
    } catch (error) {
        console.error('创建用户错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/admin/delete-doll', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { dollId } = req.body;
        
        if (!dollId) {
            return res.status(400).json({ message: '娃娃ID为必填项' });
        }
        
        const doll = await Doll.findById(dollId);
        if (!doll) {
            return res.status(400).json({ message: '娃娃不存在' });
        }
        
        await Doll.findByIdAndDelete(dollId);
        
        res.json({ message: '娃娃已删除' });
    } catch (error) {
        console.error('删除娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/admin/add-points-to-all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { points } = req.body;
        const pointsNum = parseFloat(points);
        
        if (!points || isNaN(pointsNum)) {
            return res.status(400).json({ message: '积分数量为必填项' });
        }
        
        // 获取所有活跃用户
        const activeUsers = await User.find({ active: true });
        
        // 为每个用户增加积分并记录交易
        for (const user of activeUsers) {
            user.points += pointsNum;
            await user.save();
            
            await Transaction.create({
                userId: user._id,
                type: 'admin_grant',
                amount: pointsNum,
                description: `管理员发放积分`
            });
        }
        
        res.json({ 
            message: `已为 ${activeUsers.length} 个用户发放 ${points} 积分`,
            affectedUsers: activeUsers.length
        });
    } catch (error) {
        console.error('批量发放积分错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/admin/update-doll-prices', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { level1, level2, level3 } = req.body;
        
        if (!level1 || !level2 || !level3) {
            return res.status(400).json({ message: '所有娃娃价格均为必填项' });
        }
        
        systemConfig.dollPrices[1] = parseFloat(level1);
        systemConfig.dollPrices[2] = parseFloat(level2);
        systemConfig.dollPrices[3] = parseFloat(level3);
        
        res.json({ 
            message: '娃娃价格已更新',
            prices: systemConfig.dollPrices
        });
    } catch (error) {
        console.error('更新娃娃价格错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/admin/calculate-daily-income', authenticateToken, requireAdmin, async (req, res) => {
    try {
        let totalPayout = 0;
        let affectedUsers = 0;
        let expiredDolls = 0;
        
        // 获取所有活跃娃娃
        const activeDolls = await Doll.find({ active: true });
        
        for (const doll of activeDolls) {
            const income = doll.dailyIncome;
            const user = await User.findById(doll.userId);
            
            if (user && user.active) {
                // 更新用户积分
                user.points += income;
                await user.save();
                
                // 记录交易
                await Transaction.create({
                    userId: doll.userId,
                    type: 'income',
                    amount: income,
                    description: `娃娃每日收益`
                });
                
                totalPayout += income;
                affectedUsers++;
                
                // 更新娃娃剩余天数
                doll.remainingDays -= 1;
                if (doll.remainingDays <= 0) {
                    doll.active = false;
                    expiredDolls++;
                }
                await doll.save();
            }
        }
        
        res.json({ 
            message: '每日收益计算完成', 
            totalPayout: parseFloat(totalPayout.toFixed(2)),
            affectedUsers,
            expiredDolls,
            activeDolls: activeDolls.length
        });
    } catch (error) {
        console.error('计算每日收益错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/admin/reset-system', authenticateToken, requireAdmin, async (req, res) => {
    try {
        if (!req.body.confirm || req.body.confirm !== 'YES_RESET') {
            return res.status(400).json({ 
                message: '请确认重置操作，此操作不可逆！',
                instruction: '在请求体中添加 { "confirm": "YES_RESET" } 来确认重置'
            });
        }
        
        // 保留管理员账户
        await Doll.deleteMany({});
        await Transaction.deleteMany({});
        await User.deleteMany({ role: { $ne: 'admin' } });
        
        // 重置管理员积分
        await User.updateMany({ role: 'admin' }, { points: 10000 });
        
        res.json({ message: '系统已重置，所有用户数据和娃娃数据已清除' });
    } catch (error) {
        console.error('重置系统错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.get('/api/admin/system-config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        res.json({ 
            config: systemConfig,
            environment: process.env.NODE_ENV || 'development',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    } catch (error) {
        console.error('获取系统配置错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 提供前端静态文件 - 处理所有未匹配的路由
app.get('*', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('未处理的错误:', error);
    res.status(500).json({ 
        message: '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ message: '接口不存在' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`天创娃娃收藏服务器运行在端口 ${PORT}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`数据库: ${mongoose.connection.readyState === 1 ? '已连接' : '未连接'}`);
    console.log(`管理员账户: admin / admin123`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log(`========================================`);
});

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n正在关闭服务器...');
    await mongoose.connection.close();
    console.log('MongoDB连接已关闭');
    process.exit(0);
});