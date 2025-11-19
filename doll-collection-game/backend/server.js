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

// 🔧 云端部署：使用MongoDB Atlas连接字符串
const MONGODB_URI = 'mongodb+srv://j66357791_db_user:wBabbcX2m6HZtbdJ@cluster0.oiwbvje.mongodb.net/doll-collection-game?retryWrites=true&w=majority';

// 🔧 云端CORS配置 - 允许你的域名
app.use(cors({
    origin: ['https://tianchuang.onrender.com', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 连接MongoDB Atlas - 增强版
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
})
.then(() => {
    console.log('✅ MongoDB Atlas连接成功');
    console.log('🗄️ 数据库: doll-collection-game');
})
.catch(err => {
    console.error('❌ MongoDB Atlas连接失败:', err.message);
    process.exit(1);
});

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔧 关键修复：静态文件路径指向 ../frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// 系统配置
const systemConfig = {
    dollPrices: { 1: 50, 2: 200, 3: 500 },
    dollLifespans: { 1: 60, 2: 70, 3: 90 },
    dollIncomeRanges: {
        1: { min: 0.84, max: 0.92 },
        2: { min: 3.05, max: 3.25 },
        3: { min: 6.0, max: 6.3 }
    },
    transferConfig: {
        userFeeRate: 0.05, // 普通用户5%手续费
        merchantFeeRate: 0, // 商人0手续费
        merchantBonusRate: 0.01 // 商人1%奖励
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
                active: true,
                merchantData: {
                    appointedAt: new Date(),
                    appointedBy: 'system',
                    totalEarned: 0,
                    totalTransfers: 0
                }
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
            active: true,
            merchantData: {
                appointedAt: null,
                appointedBy: null,
                totalEarned: 0,
                totalTransfers: 0
            }
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

// 合成娃娃 - 删除原娃娃而不是设为非活跃
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
            description: `娃娃合成消耗 ${doll1.level}级+${doll2.level}级`,
            transferData: {
                doll1Level: doll1.level,
                doll2Level: doll2.level,
                pointsUsed: pointsNum,
                successRate: successRate,
                success: isSuccess,
                newDollLevel: isSuccess ? doll1.level + 1 : null
            }
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
            
            // 关键修复：删除原娃娃而不是设为非活跃
            await Doll.deleteMany({ _id: { $in: [doll1Id, doll2Id] } });
            
            // 记录合成成功
            await Transaction.create({
                userId: req.user._id,
                type: 'synthesis',
                amount: 0,
                description: `合成成功：获得${newLevel}级娃娃 (ID: ${newDoll._id.substring(0, 8)}...)`,
                transferData: {
                    doll1Level: doll1.level,
                    doll2Level: doll2.level,
                    pointsUsed: pointsNum,
                    successRate: successRate,
                    success: true,
                    newDollLevel: newLevel,
                    newDollId: newDoll._id
                }
            });
        } else {
            // 合成失败，娃娃保持不变
            await Transaction.create({
                userId: req.user._id,
                type: 'synthesis',
                amount: 0,
                description: `合成失败：${doll1.level}级+${doll2.level}级娃娃`,
                transferData: {
                    doll1Level: doll1.level,
                    doll2Level: doll2.level,
                    pointsUsed: pointsNum,
                    successRate: successRate,
                    success: false
                }
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

// 激活娃娃接口
app.post('/api/dolls/activate', authenticateToken, async (req, res) => {
    try {
        const { dollId } = req.body;
        
        if (!dollId) {
            return res.status(400).json({ message: '娃娃ID不能为空' });
        }
        
        const doll = await Doll.findById(dollId);
        if (!doll) {
            return res.status(404).json({ message: '娃娃不存在' });
        }
        
        if (doll.active) {
            return res.status(400).json({ message: '娃娃已经是活跃状态' });
        }
        
        if (doll.remainingDays <= 0) {
            return res.status(400).json({ message: '娃娃已过期，无法激活' });
        }
        
        // 激活娃娃
        doll.active = true;
        await doll.save();
        
        res.json({ message: '娃娃激活成功' });
        
    } catch (error) {
        console.error('激活娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 出售娃娃接口
app.post('/api/dolls/sell', authenticateToken, async (req, res) => {
    try {
        const { dollId } = req.body;
        
        if (!dollId) {
            return res.status(400).json({ message: '娃娃ID不能为空' });
        }
        
        const doll = await Doll.findById(dollId);
        if (!doll) {
            return res.status(404).json({ message: '娃娃不存在' });
        }
        
        // 计算出售价格（原价的50%）
        const sellPrice = doll.level === 1 ? 25 : doll.level === 2 ? 100 : 250;
        
        // 删除娃娃
        await Doll.findByIdAndDelete(dollId);
        
        // 给用户增加积分
        await User.findByIdAndUpdate(doll.userId, {
            $inc: { points: sellPrice }
        });
        
        // 记录交易
        await Transaction.create({
            userId: doll.userId,
            type: 'sell',
            amount: sellPrice,
            description: `出售${doll.level}级娃娃，获得 ${sellPrice} 积分`
        });
        
        res.json({ 
            message: '娃娃出售成功',
            amount: sellPrice
        });
        
    } catch (error) {
        console.error('出售娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 积分转增接口
app.post('/api/transactions/transfer', authenticateToken, async (req, res) => {
    try {
        const { recipientId, amount, description } = req.body;
        
        if (!recipientId || !amount || amount <= 0) {
            return res.status(400).json({ message: '接收者ID和转账金额不能为空' });
        }
        
        if (req.user.points < amount) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 查找接收者（支持用户ID或用户名）
        let recipient = await User.findById(recipientId);
        if (!recipient) {
            recipient = await User.findOne({ username: recipientId });
        }
        
        if (!recipient) {
            return res.status(404).json({ message: '接收者不存在' });
        }
        
        if (recipient._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: '不能给自己转账' });
        }
        
        // 计算手续费和奖励
        let fee = 0;
        let bonus = 0;
        
        // 发送者手续费
        if (req.user.role === 'user') {
            fee = Math.floor(amount * systemConfig.transferConfig.userFeeRate);
        } else if (req.user.role === 'merchant') {
            fee = 0; // 商人0手续费
        }
        
        // 接收者奖励（只有商人收到1%奖励）
        if (recipient.role === 'merchant') {
            bonus = Math.floor(amount * systemConfig.transferConfig.merchantBonusRate);
        }
        
        const actualAmount = amount - fee;
        const totalDeduction = amount;
        
        // 扣除发送者积分
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { points: -totalDeduction }
        });
        
        // 增加接收者积分
        await User.findByIdAndUpdate(recipient._id, {
            $inc: { points: actualAmount + bonus }
        });
        
        // 更新商人统计
        if (recipient.role === 'merchant') {
            await User.findByIdAndUpdate(recipient._id, {
                $inc: { 
                    'merchantData.totalEarned': bonus,
                    'merchantData.totalTransfers': 1
                }
            });
        }
        
        // 记录发送者交易
        await Transaction.create({
            userId: req.user._id,
            type: 'transfer',
            amount: -totalDeduction,
            description: description || `转账给 ${recipient.username}`,
            transferData: {
                senderId: req.user._id,
                recipientId: recipient._id,
                senderRole: req.user.role,
                recipientRole: recipient.role,
                originalAmount: amount,
                fee: fee,
                bonus: 0,
                actualAmount: actualAmount
            }
        });
        
        // 记录接收者交易
        await Transaction.create({
            userId: recipient._id,
            type: 'transfer',
            amount: actualAmount + bonus,
            description: `收到来自 ${req.user.username} 的转账`,
            transferData: {
                senderId: req.user._id,
                recipientId: recipient._id,
                senderRole: req.user.role,
                recipientRole: recipient.role,
                originalAmount: amount,
                fee: 0,
                bonus: bonus,
                actualAmount: actualAmount + bonus
            }
        });
        
        // 获取更新后的用户信息
        const updatedSender = await User.findById(req.user._id);
        const updatedRecipient = await User.findById(recipient._id);
        
        res.json({
            message: '转账成功',
            transfer: {
                senderId: req.user._id,
                recipientId: recipient._id,
                recipientUsername: recipient.username,
                originalAmount: amount,
                fee: fee,
                bonus: bonus,
                actualAmount: actualAmount,
                totalDeduction: totalDeduction,
                senderNewBalance: updatedSender.points,
                recipientNewBalance: updatedRecipient.points
            }
        });
        
    } catch (error) {
        console.error('转账错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 搜索用户接口
app.get('/api/users/search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ message: '搜索关键词至少需要2个字符' });
        }
        
        const users = await User.find({
            $and: [
                { active: true },
                {
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        })
        .select('username email role points merchantData')
        .limit(10);
        
        res.json({ users });
        
    } catch (error) {
        console.error('搜索用户错误:', error);
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

// 任命商人接口
app.post('/api/admin/appoint-merchant', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        if (user.role === 'admin') {
            return res.status(400).json({ message: '不能将管理员设为商人' });
        }
        
        if (user.role === 'merchant') {
            return res.status(400).json({ message: '用户已经是商人' });
        }
        
        // 任命为商人
        user.role = 'merchant';
        user.merchantData = {
            appointedAt: new Date(),
            appointedBy: req.user._id,
            totalEarned: 0,
            totalTransfers: 0
        };
        await user.save();
        
        // 记录操作
        await Transaction.create({
            userId: userId,
            type: 'admin_grant',
            amount: 0,
            description: `管理员 ${req.user.username} 任命您为商人`
        });
        
        res.json({ 
            message: '商人任命成功',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                merchantData: user.merchantData
            }
        });
        
    } catch (error) {
        console.error('任命商人错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 撤销商人接口
app.post('/api/admin/revoke-merchant', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        if (user.role !== 'merchant') {
            return res.status(400).json({ message: '用户不是商人' });
        }
        
        // 撤销商人身份
        user.role = 'user';
        const oldMerchantData = user.merchantData;
        user.merchantData = {
            appointedAt: null,
            appointedBy: null,
            totalEarned: oldMerchantData.totalEarned,
            totalTransfers: oldMerchantData.totalTransfers
        };
        await user.save();
        
        // 记录操作
        await Transaction.create({
            userId: userId,
            type: 'admin_grant',
            amount: 0,
            description: `管理员 ${req.user.username} 撤销了您的商人身份`
        });
        
        res.json({ 
            message: '商人身份撤销成功',
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('撤销商人错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取交易记录
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

// 获取合成记录
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

// 获取转增记录
app.get('/api/transactions/transfer-records', authenticateToken, async (req, res) => {
    try {
        // 获取用户的所有转增记录
        const records = await Transaction.find({
            userId: req.user._id,
            type: 'transfer'
        })
        .sort({ createdAt: -1 })
        .limit(50);
        
        res.json({ records });
    } catch (error) {
        console.error('获取转增记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 自动发放收益接口
app.post('/api/admin/distribute-income', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, amount } = req.body;
        
        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ message: '无效的参数' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 给用户增加积分
        await User.findByIdAndUpdate(userId, {
            $inc: { points: amount }
        });
        
        // 获取用户所有活跃娃娃并减少剩余天数
        const activeDolls = await Doll.find({ userId: userId, active: true });
        
        for (const doll of activeDolls) {
            if (doll.remainingDays > 0) {
                await Doll.findByIdAndUpdate(doll._id, {
                    $inc: { remainingDays: -1 }
                });
                
                // 如果剩余天数变为0，设为非活跃
                if (doll.remainingDays === 1) {
                    await Doll.findByIdAndUpdate(doll._id, {
                        active: false
                    });
                }
            }
        }
        
        // 记录收益发放
        await Transaction.create({
            userId: userId,
            type: 'income',
            amount: amount,
            description: `自动发放收益 ${amount} 积分`
        });
        
        // 获取更新后的用户和娃娃数据
        const updatedUser = await User.findById(userId);
        const updatedDolls = await Doll.find({ userId: userId });
        
        res.json({
            message: '收益发放成功',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                points: updatedUser.points,
                role: updatedUser.role
            },
            dolls: updatedDolls
        });
        
    } catch (error) {
        console.error('发放收益错误:', error);
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

// 获取转增设置
app.get('/api/admin/transfer-settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        res.json({ 
            settings: {
                userFeeRate: systemConfig.transferConfig.userFeeRate * 100,
                merchantBonusRate: systemConfig.transferConfig.merchantBonusRate * 100,
                baseBonusRate: 0.01 // 基础奖励率1%
            }
        });
    } catch (error) {
        console.error('获取转增设置错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新转增设置
app.post('/api/admin/update-transfer-settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userFeeRate, merchantBonusRate, baseBonusRate } = req.body;
        
        if (userFeeRate !== undefined) {
            systemConfig.transferConfig.userFeeRate = userFeeRate / 100;
        }
        if (merchantBonusRate !== undefined) {
            systemConfig.transferConfig.merchantBonusRate = merchantBonusRate / 100;
        }
        
        res.json({ 
            message: '转增设置更新成功',
            settings: {
                userFeeRate: systemConfig.transferConfig.userFeeRate * 100,
                merchantBonusRate: systemConfig.transferConfig.merchantBonusRate * 100,
                baseBonusRate: baseBonusRate || 0.01
            }
        });
    } catch (error) {
        console.error('更新转增设置错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取商人列表
app.get('/api/admin/merchants', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const merchants = await User.find({ role: 'merchant' })
            .select('username email points merchantData createdAt')
            .sort({ 'merchantData.appointedAt': -1 });
        
        // 计算统计信息
        const stats = {
            totalMerchants: merchants.length,
            todayTransfers: 0,
            totalMerchantEarnings: merchants.reduce((sum, merchant) => 
                sum + (merchant.merchantData?.totalEarned || 0), 0)
        };
        
        res.json({ merchants, stats });
    } catch (error) {
        console.error('获取商人列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 🔧 关键修复：前端页面路由 - 指向 ../frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('*', (req, res) => {
    // 如果是API请求，返回404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'API接口不存在' });
    }
    
    // 其他请求返回前端页面
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 🔧 云端部署：错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ message: '服务器内部错误' });
});

// 🔧 云端部署：404处理
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ message: 'API接口不存在' });
    } else {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

// 启动服务器
app.listen(PORT, async () => {
    console.log('🚀 正在启动天创娃娃收藏服务器...');
    
    // 创建默认管理员
    await createDefaultAdmin();
    
    console.log('========================================');
    console.log(`🎮 天创娃娃收藏服务器运行在端口 ${PORT}`);
    console.log(`🌐 访问地址: https://tianchuang.onrender.com`);
    console.log(`📊 数据库: ${mongoose.connection.readyState === 1 ? '✅ 已连接' : '❌ 未连接'}`);
    console.log(`🗄️ MongoDB Atlas: 已连接`);
    console.log('========================================');
});
