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

// 内存数据库
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
        
        const price = systemConfig.dollPrices[level];
        
        // 检查用户积分
        if (req.user.points < price) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 计算每日收益
        const range = systemConfig.dollIncomeRanges[level];
        const dailyIncome = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
        
        // 创建娃娃
        const doll = {
            id: nextDollId++,
            userId: req.user.id,
            level,
            price,
            purchaseDate: new Date(),
            lifespan: systemConfig.dollLifespans[level],
            remainingDays: systemConfig.dollLifespans[level],
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

// 路由：合成娃娃
app.post('/api/dolls/synthesize', authenticateToken, async (req, res) => {
    try {
        const { doll1Id, doll2Id, points } = req.body;
        
        // 检查积分
        if (req.user.points < points) {
            return res.status(400).json({ message: '积分不足' });
        }
        
        // 获取娃娃
        const doll1 = dolls.find(d => d.id === doll1Id && d.userId === req.user.id);
        const doll2 = dolls.find(d => d.id === doll2Id && d.userId === req.user.id);
        
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
        
        // 记录交易
        const transaction = {
            id: nextTransactionId++,
            userId: req.user.id,
            type: 'synthesis',
            amount: -points,
            description: `娃娃合成消耗`,
            createdAt: new Date()
        };
        
        transactions.push(transaction);
        
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
            newDoll = {
                id: nextDollId++,
                userId: req.user.id,
                level: newLevel,
                price: 0, // 合成获得的娃娃价格为0
                purchaseDate: new Date(),
                lifespan: systemConfig.dollLifespans[newLevel],
                remainingDays,
                dailyIncome: parseFloat(dailyIncome),
                active: true
            };
            
            dolls.push(newDoll);
            
            // 停用原来的娃娃
            doll1.active = false;
            doll2.active = false;
            
            // 记录交易
            const successTransaction = {
                id: nextTransactionId++,
                userId: req.user.id,
                type: 'synthesis',
                amount: 0,
                description: `成功合成${newLevel}级娃娃`,
                createdAt: new Date()
            };
            
            transactions.push(successTransaction);
        }
        
        // 获取更新后的娃娃列表
        const userDolls = dolls.filter(doll => doll.userId === req.user.id);
        
        res.json({
            success: isSuccess,
            newDoll,
            dolls: userDolls,
            user: {
                id: req.user.id,
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
        const usersWithDollCount = users.map(user => {
            const dollCount = dolls.filter(doll => doll.userId === user.id).length;
            return {
                ...user,
                dollCount,
                // 不返回密码
                password: undefined
            };
        });
        
        res.json({ users: usersWithDollCount });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：获取所有娃娃
app.get('/api/admin/dolls', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dollsWithUser = dolls.map(doll => {
            const user = users.find(u => u.id === doll.userId);
            return {
                ...doll,
                username: user ? user.username : '未知用户'
            };
        });
        res.json({ dolls: dollsWithUser });
    } catch (error) {
        console.error('获取娃娃列表错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：获取交易记录
app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const transactionsWithUser = transactions.map(transaction => {
            const user = users.find(u => u.id === transaction.userId);
            return {
                ...transaction,
                username: user ? user.username : '未知用户'
            };
        });
        res.json({ transactions: transactionsWithUser });
    } catch (error) {
        console.error('获取交易记录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：调整用户积分
app.post('/api/admin/adjust-points', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(400).json({ message: '用户不存在' });
        }
        
        const oldPoints = user.points;
        user.points = parseFloat(points);
        
        // 记录交易
        const transaction = {
            id: nextTransactionId++,
            userId,
            type: 'admin_adjust',
            amount: user.points - oldPoints,
            description: `管理员调整积分`,
            createdAt: new Date()
        };
        
        transactions.push(transaction);
        
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
        
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(400).json({ message: '用户不存在' });
        }
        
        user.active = !user.active;
        
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
        
        const dollIndex = dolls.findIndex(d => d.id === dollId);
        if (dollIndex === -1) {
            return res.status(400).json({ message: '娃娃不存在' });
        }
        
        dolls.splice(dollIndex, 1);
        
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
        const pointsNum = parseFloat(points);
        
        users.forEach(user => {
            if (user.active) {
                user.points += pointsNum;
                
                // 记录交易
                const transaction = {
                    id: nextTransactionId++,
                    userId: user.id,
                    type: 'admin_grant',
                    amount: pointsNum,
                    description: `管理员发放积分`,
                    createdAt: new Date()
                };
                
                transactions.push(transaction);
            }
        });
        
        res.json({ message: `已为所有用户发放 ${points} 积分` });
    } catch (error) {
        console.error('批量发放积分错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：更新娃娃价格
app.post('/api/admin/update-doll-prices', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { level1, level2, level3 } = req.body;
        
        systemConfig.dollPrices[1] = parseFloat(level1);
        systemConfig.dollPrices[2] = parseFloat(level2);
        systemConfig.dollPrices[3] = parseFloat(level3);
        
        res.json({ message: '娃娃价格已更新' });
    } catch (error) {
        console.error('更新娃娃价格错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：计算每日收益
app.post('/api/admin/calculate-daily-income', authenticateToken, requireAdmin, async (req, res) => {
    try {
        let totalPayout = 0;
        
        // 为每个活跃娃娃计算收益并发放给用户
        dolls.forEach(doll => {
            if (doll.active) {
                const income = doll.dailyIncome;
                const user = users.find(u => u.id === doll.userId);
                
                if (user) {
                    // 更新用户积分
                    user.points += income;
                    
                    // 记录交易
                    const transaction = {
                        id: nextTransactionId++,
                        userId: doll.userId,
                        type: 'income',
                        amount: income,
                        description: `娃娃每日收益`,
                        createdAt: new Date()
                    };
                    
                    transactions.push(transaction);
                    
                    totalPayout += income;
                    
                    // 更新娃娃剩余天数
                    doll.remainingDays -= 1;
                    if (doll.remainingDays <= 0) {
                        doll.active = false;
                    }
                }
            }
        });
        
        res.json({ message: '每日收益计算完成', totalPayout });
    } catch (error) {
        console.error('计算每日收益错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：重置系统
app.post('/api/admin/reset-system', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // 保留管理员账户
        const adminUsers = users.filter(u => u.role === 'admin');
        
        // 重置所有数据
        users = adminUsers;
        dolls = [];
        transactions = [];
        nextUserId = adminUsers.length + 1;
        nextDollId = 1;
        nextTransactionId = 1;
        
        // 重置系统配置
        systemConfig.dollPrices = { 1: 50, 2: 200, 3: 500 };
        systemConfig.dollLifespans = { 1: 60, 2: 70, 3: 90 };
        systemConfig.dollIncomeRanges = {
            1: { min: 0.84, max: 0.92 },
            2: { min: 3.05, max: 3.25 },
            3: { min: 6.0, max: 6.3 }
        };
        
        res.json({ message: '系统已重置' });
    } catch (error) {
        console.error('重置系统错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 管理员路由：获取系统配置
app.get('/api/admin/system-config', authenticateToken, requireAdmin, async (req, res) => {
    try {
        res.json({ config: systemConfig });
    } catch (error) {
        console.error('获取系统配置错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 提供前端静态文件
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`天创娃娃收藏服务器运行在端口 ${PORT}`);
    console.log(`数据库模式: 内存数据库`);
    console.log(`管理员账户: admin / admin123`);
    console.log(`系统配置:`, systemConfig);
});