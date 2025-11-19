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

// 环境变量配置
const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/doll-collection-game';

// 连接MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB连接成功');
})
.catch(err => {
    console.error('❌ MongoDB连接失败:', err.message);
    process.exit(1);
});

// 🔧 修复：正确的 CORS 配置
const corsOptions = {
    origin: [
        'https://tianchuang.onrender.com',  // 你的前端域名
        'http://localhost:3000',            // 本地开发
        'http://127.0.0.1:3000'             // 本地开发备用
    ],
    credentials: true,                      // 允许携带 cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // 允许的方法
    allowedHeaders: ['Content-Type', 'Authorization'],       // 允许的头部
    optionsSuccessStatus: 200              // 预检请求的成功状态
};

// 🔧 修复：使用配置好的 CORS
app.use(cors(corsOptions));

// 🔧 新增：处理预检请求
app.options('*', cors(corsOptions));

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

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

// 每日收益发放定时任务
const scheduleDailyPayout = async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow - now;
    
    setTimeout(async () => {
        await processDailyPayout();
        // 设置下一次执行
        setInterval(processDailyPayout, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
};

// 处理每日收益发放
const processDailyPayout = async () => {
    try {
        console.log('🕐 开始处理每日收益发放...');
        
        // 获取所有活跃娃娃
        const activeDolls = await Doll.find({ active: true });
        
        for (const doll of activeDolls) {
            // 减少剩余天数
            doll.remainingDays -= 1;
            
            // 如果还有剩余天数，发放收益
            if (doll.remainingDays > 0) {
                // 给用户增加收益
                await User.findByIdAndUpdate(doll.userId, {
                    $inc: { points: doll.dailyIncome }
                });
                
                // 记录交易
                await Transaction.create({
                    userId: doll.userId,
                    type: 'income',
                    amount: doll.dailyIncome,
                    description: `${doll.level}级娃娃每日收益`
                });
                
                await doll.save();
            } else {
                // 娃娃生命周期结束
                doll.active = false;
                await doll.save();
                
                // 记录交易
                await Transaction.create({
                    userId: doll.userId,
                    type: 'admin_adjust',
                    amount: 0,
                    description: `${doll.level}级娃娃生命周期结束`
                });
            }
        }
        
        console.log('✅ 每日收益发放完成');
    } catch (error) {
        console.error('❌ 每日收益发放失败:', error);
    }
};

// 健康检查
app.get('/api/health', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const dollCount = await Doll.countDocuments();
        
        res.json({ 
            status: 'OK', 
            timestamp: new Date(),
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            stats: {
                users: userCount,
                dolls: dollCount
            }
        });
    } catch (error) {
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
});

// 用户注册
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

// 购买娃娃
app.post('/api/dolls/buy', authenticateToken, async (req, res) => {
    try {
        const { level } = req.body;
        
        if (!level || ![1, 2, 3].includes(level)) {
            return res.status(400).json({ message: '无效的娃娃等级' });
        }
        
        const price = systemConfig.dollPrices[level];
        
        if (req.user.points < price) {
            return res.status(400).json({ message: '积分不足' });
        }
        
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
        
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -price }
        });
        
        await Transaction.create({
            userId: req.user._id,
            type: 'purchase',
            amount: -price,
            description: `购买${level}级娃娃`
        });
        
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

// 合成娃娃
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
        
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -pointsNum }
        });
        
        await Transaction.create({
            userId: req.user._id,
            type: 'synthesis',
            amount: -pointsNum,
            description: `娃娃合成消耗`
        });
        
        let newDoll = null;
        
        if (isSuccess) {
            const newLevel = doll1.level + 1;
            const remainingDays = Math.min(doll1.remainingDays, doll2.remainingDays);
            const range = systemConfig.dollIncomeRanges[newLevel];
            const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
            
            newDoll = await Doll.create({
                userId: req.user._id,
                level: newLevel,
                price: 0,
                purchaseDate: new Date(),
                lifespan: systemConfig.dollLifespans[newLevel],
                remainingDays: remainingDays,
                dailyIncome: parseFloat(dailyIncome),
                active: true
            });
            
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

// 获取用户交易记录
app.get('/api/transactions/my-transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json({ transactions });
    } catch (error) {
        console.error('获取交易记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由
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
        const dolls = await Doll.find().populate('userId', 'username');
        res.json({ dolls });
    } catch (error) {
        console.error('获取娃娃列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
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

// 批量发放积分
app.post('/api/admin/grant-points', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userIds, points, reason } = req.body;
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: '请选择用户' });
        }
        
        if (!points || isNaN(points)) {
            return res.status(400).json({ message: '请输入有效的积分数量' });
        }
        
        const results = [];
        
        for (const userId of userIds) {
            try {
                // 更新用户积分
                await User.findByIdAndUpdate(userId, {
                    $inc: { points: parseFloat(points) }
                });
                
                // 记录交易
                await Transaction.create({
                    userId,
                    type: 'admin_grant',
                    amount: parseFloat(points),
                    description: reason || `管理员发放积分`
                });
                
                results.push({ userId, success: true });
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
            }
        }
        
        res.json({
            message: '批量发放完成',
            results
        });
    } catch (error) {
        console.error('批量发放积分错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员获取所有交易记录
app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, type } = req.query;
        
        let query = {};
        if (userId) query.userId = userId;
        if (type) query.type = type;
        
        const transactions = await Transaction.find(query)
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await Transaction.countDocuments(query);
        
        res.json({
            transactions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('获取交易记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 导出数据
app.get('/api/admin/export/:type', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { type } = req.params;
        
        let data = [];
        let filename = '';
        let headers = [];
        
        switch (type) {
            case 'users':
                const users = await User.find({}, { password: 0 });
                data = users.map(user => ({
                    ID: user._id,
                    用户名: user.username,
                    邮箱: user.email,
                    积分: user.points,
                    角色: user.role,
                    状态: user.active ? '活跃' : '禁用',
                    注册时间: user.createdAt
                }));
                filename = 'users.csv';
                headers = ['ID', '用户名', '邮箱', '积分', '角色', '状态', '注册时间'];
                break;
                
            case 'dolls':
                const dolls = await Doll.find().populate('userId', 'username');
                data = dolls.map(doll => ({
                    ID: doll._id,
                    拥有者: doll.userId.username,
                    等级: doll.level,
                    购买价格: doll.price,
                    购买时间: doll.purchaseDate,
                    剩余天数: doll.remainingDays,
                    每日收益: doll.dailyIncome,
                    状态: doll.active ? '活跃' : '非活跃'
                }));
                filename = 'dolls.csv';
                headers = ['ID', '拥有者', '等级', '购买价格', '购买时间', '剩余天数', '每日收益', '状态'];
                break;
                
            case 'transactions':
                const transactions = await Transaction.find()
                    .populate('userId', 'username')
                    .sort({ createdAt: -1 });
                data = transactions.map(tx => ({
                    ID: tx._id,
                    用户: tx.userId.username,
                    类型: tx.type,
                    金额: tx.amount,
                    描述: tx.description,
                    时间: tx.createdAt
                }));
                filename = 'transactions.csv';
                headers = ['ID', '用户', '类型', '金额', '描述', '时间'];
                break;
                
            default:
                return res.status(400).json({ message: '无效的导出类型' });
        }
        
        // 生成CSV内容
        let csvContent = headers.join(',') + '\n';
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value}"`;
            });
            csvContent += values.join(',') + '\n';
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
        
    } catch (error) {
        console.error('导出数据错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新系统配置（娃娃价格等）
app.post('/api/admin/update-system-config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { dollPrices } = req.body;
        
        if (!dollPrices || typeof dollPrices !== 'object') {
            return res.status(400).json({ message: '无效的配置数据' });
        }
        
        // 更新系统配置
        systemConfig.dollPrices = { ...systemConfig.dollPrices, ...dollPrices };
        
        res.json({ 
            message: '系统配置更新成功',
            config: systemConfig
        });
    } catch (error) {
        console.error('更新系统配置错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 切换用户状态（禁用/启用）
app.post('/api/admin/toggle-user-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 切换用户状态
        user.active = !user.active;
        await user.save();
        
        // 记录操作
        await Transaction.create({
            userId: userId,
            type: 'admin_adjust',
            amount: 0,
            description: `管理员${user.active ? '启用' : '禁用'}了账户`
        });
        
        res.json({ 
            message: `用户${user.active ? '启用' : '禁用'}成功`,
            active: user.active
        });
    } catch (error) {
        console.error('切换用户状态错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 编辑用户信息
app.post('/api/admin/edit-user', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, username, email } = req.body;
        
        if (!userId || !username || !email) {
            return res.status(400).json({ message: '用户ID、用户名和邮箱不能为空' });
        }
        
        // 检查用户名和邮箱是否已被其他用户使用
        const existingUser = await User.findOne({ 
            _id: { $ne: userId },
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已被其他用户使用' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 更新用户信息
        user.username = username;
        user.email = email;
        await user.save();
        
        // 记录操作
        await Transaction.create({
            userId: userId,
            type: 'admin_adjust',
            amount: 0,
            description: `管理员修改了用户信息`
        });
        
        res.json({ 
            message: '用户信息更新成功',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                points: user.points,
                role: user.role,
                active: user.active
            }
        });
    } catch (error) {
        console.error('编辑用户信息错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除娃娃
app.delete('/api/admin/delete-doll', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { dollId } = req.body;
        
        if (!dollId) {
            return res.status(400).json({ message: '娃娃ID不能为空' });
        }
        
        const doll = await Doll.findById(dollId);
        if (!doll) {
            return res.status(404).json({ message: '娃娃不存在' });
        }
        
        // 删除娃娃
        await Doll.findByIdAndDelete(dollId);
        
        // 记录操作
        await Transaction.create({
            userId: doll.userId,
            type: 'admin_adjust',
            amount: 0,
            description: `管理员删除了${doll.level}级娃娃`
        });
        
        res.json({ 
            message: '娃娃删除成功'
        });
    } catch (error) {
        console.error('删除娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取系统配置
app.get('/api/admin/system-config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        res.json({ 
            config: systemConfig
        });
    } catch (error) {
        console.error('获取系统配置错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 提供前端页面
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 启动服务器
app.listen(PORT, async () => {
    console.log('🚀 正在启动天创娃娃收藏服务器...');
    
    // 创建默认管理员
    await createDefaultAdmin();
    
    // 启动定时任务
    scheduleDailyPayout();
    
    console.log('========================================');
    console.log(`🎮 天创娃娃收藏服务器运行在端口 ${PORT}`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`📊 数据库: ${mongoose.connection.readyState === 1 ? '✅ 已连接' : '❌ 未连接'}`);
    console.log(`🔧 CORS 已配置，允许来自 https://tianchuang.onrender.com 的请求`);
    console.log('⏰ 每日收益发放系统已启动');
    console.log('========================================');
});
