require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 启动服务器...');
console.log('🔧 PORT:', PORT);

// 🔥 CORS 配置 - 允许所有来源（一个服务器方案）
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 环境变量配置
const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/doll-collection-game';

// 数据库连接
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB连接成功');
})
.catch(err => {
    console.error('❌ MongoDB连接失败:', err.message);
});

// 🔥 API 路由 - 所有 API 都以 /api 开头
app.get('/api/cors-test', (req, res) => {
    res.json({ 
        message: 'CORS 测试成功',
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码均为必填项' });
        }

        // 硬编码测试账号
        if (username === 'admin' && password === 'admin123') {
            const token = jwt.sign(
                { id: 'admin_id', username: 'admin', role: 'admin' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                token,
                user: {
                    id: 'admin_id',
                    username: 'admin',
                    email: 'admin@tianchuang.com',
                    points: 10000,
                    role: 'admin'
                }
            });
        }

        if (username === 'test' && password === 'test123') {
            const token = jwt.sign(
                { id: 'test_id', username: 'test', role: 'user' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                token,
                user: {
                    id: 'test_id',
                    username: 'test',
                    email: 'test@tianchuang.com',
                    points: 1000,
                    role: 'user'
                }
            });
        }

        res.status(400).json({ message: '用户名或密码错误' });
        
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ message: '用户名、密码和邮箱均为必填项' });
        }

        res.status(201).json({ message: '用户注册成功（演示模式）' });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

app.get('/api/auth/validate', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: '访问令牌缺失' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({
            user: {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            }
        });
    } catch (error) {
        res.status(403).json({ message: '无效的访问令牌' });
    }
});

// 🔥 前端静态文件服务 - 在 API 路由之后
app.use(express.static(path.join(__dirname, '../frontend')));

// 🔥 SPA 路由支持 - 所有非 API 请求都返回前端页面
app.get('*', (req, res) => {
    // 如果是 API 请求但路由不存在，返回 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            message: 'API 路由不存在',
            path: req.path,
            availableRoutes: [
                'GET /api/cors-test',
                'GET /api/health',
                'POST /api/auth/login',
                'POST /api/auth/register',
                'GET /api/auth/validate'
            ]
        });
    }
    
    // 否则返回前端页面
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 天创娃娃收藏服务器启动成功！');
    console.log(`🌐 服务器运行在端口: ${PORT}`);
    console.log(`🌍 访问地址: https://tianchuang.onrender.com`);
    console.log('🎮 这是一个同时处理前后端的单一服务器');
    console.log('🔑 测试账号: admin/admin123 或 test/test123');
    console.log('========================================');
});
