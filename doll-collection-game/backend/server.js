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

// 中间件
app.use(cors());
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

// ✅ 修复：合成娃娃 - 删除原娃娃而不是设为非活跃
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
        
        // 记录合成消耗
        await Transaction.create({
            userId: req.user._id,
            type: 'synthesis',
            amount: -pointsNum,
            description: `娃娃合成消耗 ${doll1.level}级+${doll2.level}级`
        });
        
        let newDoll = null;
        
        if (isSuccess) {
            const newLevel = doll1.level + 1;
            const remainingDays = Math.min(doll1.remainingDays, doll2.remainingDays);
            const range = systemConfig.dollIncomeRanges[newLevel];
            const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
            
            // 创建新娃娃
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
            
            // ✅ 修复：删除原娃娃而不是设为非活跃
            await Doll.deleteMany({ _id: { $in: [doll1Id, doll2Id] } });
            
            // 记录合成成功
            await Transaction.create({
                userId: req.user._id,
                type: 'synthesis',
                amount: 0,
                description: `合成成功：获得${newLevel}级娃娃 (ID: ${newDoll._id.substring(0, 8)}...)`
            });
        } else {
            // 合成失败，娃娃保持不变
            await Transaction.create({
                userId: req.user._id,
                type: 'synthesis',
                amount: 0,
                description: `合成失败：${doll1.level}级+${doll2.level}级娃娃`
            });
        }
        
        // 获取用户最新的娃娃列表
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

// ✅ 新增：获取交易记录
app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('userId', 'username')
            .sort({ createdAt: -1 })
            .limit(100); // 限制最近100条记录
        
        res.json({ transactions });
    } catch (error) {
        console.error('获取交易记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// ✅ 新增：获取合成记录
app.get('/api/dolls/synthesis-records', authenticateToken, async (req, res) => {
    try {
        // 只返回当前用户的合成记录
        const records = await Transaction.find({
            userId: req.user._id,
            type: 'synthesis'
        })
        .sort({ createdAt: -1 })
        .limit(50);
        
        res.json({ records });
    } catch (error) {
        console.error('获取合成记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 新增管理员API接口

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
    
    console.log('========================================');
    console.log(`🎮 天创娃娃收藏服务器运行在端口 ${PORT}`);
    console.log(`🌐 访问地址: http://localhost:${PORT}`);
    console.log(`📊 数据库: ${mongoose.connection.readyState === 1 ? '✅ 已连接' : '❌ 未连接'}`);
    console.log('========================================');
});
