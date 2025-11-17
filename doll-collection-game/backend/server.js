const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 内存数据库（临时解决方案）
let users = [];
let dolls = [];
let transactions = [];
let nextUserId = 1;
let nextDollId = 1;
let nextTransactionId = 1;

// 创建默认管理员
const createDefaultAdmin = async () => {
    const adminExists = users.find(u => u.username === 'admin');
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        users.push({
            id: nextUserId++,
            username: 'admin',
            password: hashedPassword,
            email: 'admin@tianchuang.com',
            points: 10000,
            role: 'admin',
            active: true,
            createdAt: new Date()
        });
        console.log('默认管理员账户已创建: admin / admin123');
    }
};

// 立即创建管理员
createDefaultAdmin();

// 中间件：验证JWT令牌
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '访问令牌缺失' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.id);
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
    res.json({ 
        status: 'OK', 
        timestamp: new Date(), 
        database: 'memory',
        users: users.length,
        dolls: dolls.length
    });
});

// 路由：用户注册
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // 检查用户是否已存在
        const existingUser = users.find(u => u.username === username || u.email === email);
        
        if (existingUser) {
            return res.status(400).json({ message: '用户名或邮箱已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const user = {
            id: nextUserId++,
            username,
            password: hashedPassword,
            email,
            points: 1000,
            role: 'user',
            active: true,
            createdAt: new Date()
        };

        users.push(user);

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
        const user = users.find(u => u.username === username);
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
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
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
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            points: req.user.points,
            role: req.user.role
        }
    });
});

// 路由：获取用户娃娃
app.get('/api/dolls/my-dolls', authenticateToken, (req, res) => {
    try {
        const userDolls = dolls.filter(doll => doll.userId === req.user.id);
        res.json({ dolls: userDolls });
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
        const doll = {
            id: nextDollId++,
            userId: req.user.id,
            level,
            price,
            purchaseDate: new Date(),
            lifespan: dollLifespans[level],
            remainingDays: dollLifespans[level],
            dailyIncome: parseFloat(dailyIncome),
            active: true
        };
        
        dolls.push(doll);
        
        // 扣除用户积分
        req.user.points -= price;
        
        // 记录交易
        const transaction = {
            id: nextTransactionId++,
            userId: req.user.id,
            type: 'purchase',
            amount: -price,
            description: `购买${level}级娃娃`,
            createdAt: new Date()
        };
        
        transactions.push(transaction);
        
        res.json({
            doll,
            user: {
                id: req.user.id,
                username: req.user.username,
                points: req.user.points
            }
        });
    } catch (error) {
        console.error('购买娃娃错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 其他API路由保持不变...
// [这里应该包含合成娃娃、管理员功能等其他路由]
// 为了简洁，我暂时省略，但实际部署时需要完整版本

// 提供前端静态文件
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`天创娃娃收藏服务器运行在端口 ${PORT}`);
    console.log(`数据库模式: 内存数据库（临时）`);
    console.log(`管理员账户: admin / admin123`);
});