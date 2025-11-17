
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'API服务运行正常',
        timestamp: new Date().toISOString()
    });
});

// 版本信息
app.get('/api/version', (req, res) => {
    res.json({
        version: '1.0.0',
        name: '天创时代后端API',
        timestamp: new Date().toISOString()
    });
});

// 用户API
app.post('/api/user/login', (req, res) => {
    const { username, password } = req.body;
    
    // 简单的本地验证
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const user = allUsers.find(u => 
        (u.username === username || u.phone === username) && 
        u.password === password && 
        u.isActive
    );
    
    if (user) {
        res.json({
            success: true,
            message: '登录成功',
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                phone: user.phone,
                role: user.role,
                points: user.points
            },
            token: 'temp-token-' + Date.now()
        });
    } else {
        res.status(401).json({
            success: false,
            error: '用户名或密码错误'
        });
    }
});

app.post('/api/user/register', (req, res) => {
    const { username, password, name, phone } = req.body;
    
    // 简单的本地注册
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const existingUser = allUsers.find(u => 
        u.username === username || u.phone === phone
    );
    
    if (existingUser) {
        return res.status(400).json({
            success: false,
            error: '用户名或手机号已存在'
        });
    }
    
    const newUser = {
        id: 'user_' + Date.now(),
        username: username,
        password: password,
        name: name,
        phone: phone,
        role: 'user',
        isActive: true,
        points: 0,
        createdAt: new Date().toISOString()
    };
    
    allUsers.push(newUser);
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
    
    res.status(201).json({
        success: true,
        message: '注册成功',
        user: {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            phone: newUser.phone,
            role: newUser.role,
            points: newUser.points
        }
    });
});

app.get('/api/user', (req, res) => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    res.json({
        success: true,
        data: { user }
    });
});

// 订单API
app.get('/api/orders/user', (req, res) => {
    const orders = JSON.parse(localStorage.getItem('userOrders') || '[]');
    res.json({
        success: true,
        data: { orders }
    });
});

// 积分API
app.get('/api/points/balance', (req, res) => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    res.json({
        success: true,
        data: { balance: user.points || 0 }
    });
});

app.post('/api/points/update', (req, res) => {
    const { amount, reason, metadata } = req.body;
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const oldPoints = user.points || 0;
    const newPoints = Math.max(0, oldPoints + amount);
    
    user.points = newPoints;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    res.json({
        success: true,
        data: { newPoints, oldPoints }
    });
});

// 背包API
app.get('/api/backpack/items', (req, res) => {
    res.json({
        success: true,
        data: {
            items: [],
            dollMaterials: [],
            orders: []
        }
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
    console.log(`📡 API地址: https://tianchuang.onrender.com/api`);
});
    