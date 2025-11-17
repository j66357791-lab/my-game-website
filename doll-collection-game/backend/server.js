const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/doll-collection-game', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// 用户模型
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    points: { type: Number, default: 1000 },
    role: { type: String, default: 'user' },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// 娃娃模型
const DollSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    level: { type: Number, required: true },
    price: { type: Number, required: true },
    purchaseDate: { type: Date, default: Date.now },
    lifespan: { type: Number, required: true },
    remainingDays: { type: Number, required: true },
    dailyIncome: { type: Number, required: true },
    active: { type: Boolean, default: true }
});

const Doll = mongoose.model('Doll', DollSchema);

// 交易记录模型
const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // 'purchase', 'income', 'synthesis'
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

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

// 路由：健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// 路由：用户注册
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // 检查用户是否已存在
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const user = new User({
            username,
            password: hashedPassword,
            email,
            points: 1000 // 初始积分
        });

        await user.save();

        res.status(201).json({ message: '用户注册成功' });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 路由：用户登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 检查密码
        const validPassword = await bcrypt.compare(password, user.password);
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

// 路由：验证令牌
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

// 路由：获取用户娃娃
app.get('/api/dolls/my-dolls', authenticateToken, async (req, res) => {
    try {
        const dolls = await Doll.find({ userId: req.user._id });
        res.json({ dolls });
    } catch (error) {
        console.error('获取娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 路由：购买娃娃
app.post('/api/dolls/buy', authenticateToken, async (req, res) => {
    try {
        const { level } = req.body;
        
        // 娃娃价格配置
        const dollPrices = { 1: 50, 2: 200, 3: 500 };
        const dollLifespans = { 1: 60, 2: 70, 3: 90 };
        const dollIncomeRanges = {
            1: { min: 0.84, max: 0.92 },
            2: { min: 3.05, max: 3.25 },
            3: { min: 6.0, max: 6.3 }
        };
        
        const price = dollPrices[level];
        
        // 检查用户积分
        if (req.user.points < price) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 计算每日收益
        const range = dollIncomeRanges[level];
        const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
        
        // 创建娃娃
        const doll = new Doll({
            userId: req.user._id,
            level,
            price,
            lifespan: dollLifespans[level],
            remainingDays: dollLifespans[level],
            dailyIncome: parseFloat(dailyIncome)
        });
        
        await doll.save();
        
        // 扣除用户积分
        req.user.points -= price;
        await req.user.save();
        
        // 记录交易
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'purchase',
            amount: -price,
            description: `购买${level}级娃娃`
        });
        
        await transaction.save();
        
        res.json({
            doll,
            user: {
                id: req.user._id,
                username: req.user.username,
                points: req.user.points
            }
        });
    } catch (error) {
        console.error('购买娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 路由：合成娃娃
app.post('/api/dolls/synthesize', authenticateToken, async (req, res) => {
    try {
        const { doll1Id, doll2Id, points } = req.body;
        
        // 检查积分
        if (req.user.points < points) {
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
        const successRate = points * 0.9;
        const isSuccess = Math.random() * 100 < successRate;
        
        // 扣除积分
        req.user.points -= points;
        await req.user.save();
        
        // 记录交易
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'synthesis',
            amount: -points,
            description: `娃娃合成消耗`
        });
        
        await transaction.save();
        
        let newDoll = null;
        
        if (isSuccess) {
            // 合成成功
            const newLevel = doll1.level + 1;
            const newLifespans = { 2: 70, 3: 90 };
            const newIncomeRanges = {
                2: { min: 3.05, max: 3.25 },
                3: { min: 6.0, max: 6.3 }
            };
            
            // 计算剩余天数（取较小值）
            const remainingDays = Math.min(doll1.remainingDays, doll2.remainingDays);
            
            // 计算每日收益
            const range = newIncomeRanges[newLevel];
            const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
            
            // 创建新娃娃
            newDoll = new Doll({
                userId: req.user._id,
                level: newLevel,
                price: 0, // 合成获得的娃娃价格为0
                lifespan: newLifespans[newLevel],
                remainingDays,
                dailyIncome: parseFloat(dailyIncome)
            });
            
            await newDoll.save();
            
            // 停用原来的娃娃
            doll1.active = false;
            doll2.active = false;
            
            await doll1.save();
            await doll2.save();
            
            // 记录交易
            const successTransaction = new Transaction({
                userId: req.user._id,
                type: 'synthesis',
                amount: 0,
                description: `成功合成${newLevel}级娃娃`
            });
            
            await successTransaction.save();
        }
        
        // 获取更新后的娃娃列表
        const dolls = await Doll.find({ userId: req.user._id });
        
        res.json({
            success: isSuccess,
            newDoll,
            dolls,
            user: {
                id: req.user._id,
                username: req.user.username,
                points: req.user.points
            }
        });
    } catch (error) {
        console.error('合成娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：获取所有用户
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        
        // 获取每个用户的娃娃数量
        const usersWithDollCount = await Promise.all(
            users.map(async (user) => {
                const dollCount = await Doll.countDocuments({ userId: user._id });
                return {
                    ...user.toObject(),
                    dollCount
                };
            })
        );
        
        res.json({ users: usersWithDollCount });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：获取所有娃娃
app.get('/api/admin/dolls', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dolls = await Doll.find().populate('userId', 'username');
        res.json({ dolls });
    } catch (error) {
        console.error('获取娃娃列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：获取交易记录
app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('userId', 'username').sort({ createdAt: -1 });
        res.json({ transactions });
    } catch (error) {
        console.error('获取交易记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：调整用户积分
app.post('/api/admin/adjust-points', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: '用户不存在' });
        }
        
        user.points = points;
        await user.save();
        
        // 记录交易
        const transaction = new Transaction({
            userId,
            type: 'admin_adjust',
            amount: points - user.points,
            description: `管理员调整积分`
        });
        
        await transaction.save();
        
        res.json({ message: '积分调整成功' });
    } catch (error) {
        console.error('调整积分错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：切换用户状态
app.post('/api/admin/toggle-user-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: '用户不存在' });
        }
        
        user.active = !user.active;
        await user.save();
        
        res.json({ message: `用户已${user.active ? '启用' : '禁用'}` });
    } catch (error) {
        console.error('切换用户状态错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：创建用户
app.post('/api/admin/create-user', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // 检查用户是否已存在
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const user = new User({
            username,
            password: hashedPassword,
            email,
            points: 1000
        });

        await user.save();

        res.json({ message: '用户创建成功' });
    } catch (error) {
        console.error('创建用户错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：删除娃娃
app.post('/api/admin/delete-doll', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { dollId } = req.body;
        
        await Doll.findByIdAndDelete(dollId);
        
        res.json({ message: '娃娃已删除' });
    } catch (error) {
        console.error('删除娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：批量发放积分
app.post('/api/admin/add-points-to-all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { points } = req.body;
        
        await User.updateMany({}, { $inc: { points } });
        
        // 记录交易（为每个用户）
        const users = await User.find({});
        const transactions = users.map(user => ({
            userId: user._id,
            type: 'admin_grant',
            amount: points,
            description: `管理员发放积分`
        }));
        
        await Transaction.insertMany(transactions);
        
        res.json({ message: `已为所有用户发放 ${points} 积分` });
    } catch (error) {
        console.error('批量发放积分错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：更新娃娃价格
app.post('/api/admin/update-doll-prices', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // 在实际应用中，这里应该更新数据库中的价格配置
        // 这里我们只是返回成功消息
        res.json({ message: '娃娃价格已更新' });
    } catch (error) {
        console.error('更新娃娃价格错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：计算每日收益
app.post('/api/admin/calculate-daily-income', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // 获取所有活跃娃娃
        const activeDolls = await Doll.find({ active: true });
        
        let totalPayout = 0;
        
        // 为每个娃娃计算收益并发放给用户
        for (const doll of activeDolls) {
            const income = doll.dailyIncome;
            
            // 更新用户积分
            await User.findByIdAndUpdate(doll.userId, { $inc: { points: income } });
            
            // 记录交易
            const transaction = new Transaction({
                userId: doll.userId,
                type: 'income',
                amount: income,
                description: `娃娃每日收益`
            });
            
            await transaction.save();
            
            totalPayout += income;
            
            // 更新娃娃剩余天数
            doll.remainingDays -= 1;
            if (doll.remainingDays <= 0) {
                doll.active = false;
            }
            
            await doll.save();
        }
        
        res.json({ message: '每日收益计算完成', totalPayout });
    } catch (error) {
        console.error('计算每日收益错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：重置系统
app.post('/api/admin/reset-system', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // 删除所有数据（除了管理员账户）
        await Doll.deleteMany({});
        await Transaction.deleteMany({});
        await User.deleteMany({ role: { $ne: 'admin' } });
        
        res.json({ message: '系统已重置' });
    } catch (error) {
        console.error('重置系统错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 提供前端静态文件
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

// 创建默认管理员账户（如果不存在）
const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                username: 'admin',
                password: hashedPassword,
                email: 'admin@tianchuang.com',
                points: 10000,
                role: 'admin'
            });
            await admin.save();
            console.log('默认管理员账户已创建: admin / admin123');
        }
    } catch (error) {
        console.error('创建管理员账户错误:', error);
    }
};

// 初始化数据库
mongoose.connection.once('open', () => {
    console.log('已连接到数据库');
    createDefaultAdmin();
});