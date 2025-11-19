require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

console.log('🔧 开始加载模块...');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 环境变量:');
console.log('- PORT:', PORT);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '已设置' : '未设置');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '已设置' : '使用默认值');

// 🔥 最关键的 CORS 配置 - 必须在所有路由之前
console.log('🔧 配置 CORS...');
app.use(cors({
    origin: ['https://tianchuang.onrender.com', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 🔥 明确处理预检请求
app.options('*', cors());

// 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log(`📝 Origin: ${req.headers.origin || 'No Origin'}`);
    console.log(`📝 User-Agent: ${req.headers['user-agent'] || 'No User-Agent'}`);
    next();
});

// 环境变量配置
const JWT_SECRET = process.env.JWT_SECRET || 'tianchuang_jwt_secret_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/doll-collection-game';

// 🔥 简化的数据库连接
let dbConnected = false;
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        dbConnected = true;
        console.log('✅ MongoDB连接成功');
    } catch (err) {
        console.error('❌ MongoDB连接失败:', err.message);
        dbConnected = false;
        // 不退出进程，继续运行但数据库功能受限
    }
};

connectDB();

// 🔥 根路由 - 测试服务器是否运行
app.get('/', (req, res) => {
    console.log('🏠 根路由被访问');
    res.json({
        message: '🎮 天创娃娃收藏服务器运行中',
        timestamp: new Date().toISOString(),
        database: dbConnected ? '已连接' : '未连接',
        origin: req.headers.origin,
        port: PORT
    });
});

// 🔥 CORS 测试端点
app.get('/api/cors-test', (req, res) => {
    console.log('🧪 CORS 测试端点被访问');
    res.json({ 
        message: 'CORS 测试成功',
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        server: '天创娃娃收藏服务器',
        database: dbConnected ? '已连接' : '未连接'
    });
});

// 🔥 健康检查端点
app.get('/api/health', (req, res) => {
    console.log('🏥 健康检查端点被访问');
    res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        database: dbConnected ? 'connected' : 'disconnected',
        cors: '已配置',
        origin: req.headers.origin
    });
});

// 🔥 简化的登录端点 - 不依赖数据库
app.post('/api/auth/login', (req, res) => {
    console.log('🔑 登录端点被访问');
    console.log('🔑 请求体:', req.body);
    
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码均为必填项' });
        }

        // 🔥 临时：硬编码管理员账号用于测试
        if (username === 'admin' && password === 'admin123') {
            const token = jwt.sign(
                { id: 'admin_id', username: 'admin', role: 'admin' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            console.log('✅ 管理员登录成功');
            
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

        // 🔥 临时：硬编码测试用户
        if (username === 'test' && password === 'test123') {
            const token = jwt.sign(
                { id: 'test_id', username: 'test', role: 'user' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            console.log('✅ 测试用户登录成功');
            
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

        console.log('❌ 登录失败：用户名或密码错误');
        return res.status(400).json({ message: '用户名或密码错误' });
        
    } catch (error) {
        console.error('❌ 登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 🔥 简化的注册端点
app.post('/api/auth/register', (req, res) => {
    console.log('📝 注册端点被访问');
    
    try {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ message: '用户名、密码和邮箱均为必填项' });
        }

        console.log('✅ 模拟注册成功');
        res.status(201).json({ message: '用户注册成功（演示模式）' });
    } catch (error) {
        console.error('❌ 注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 🔥 验证令牌端点
app.get('/api/auth/validate', (req, res) => {
    console.log('🔍 验证令牌端点被访问');
    
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: '访问令牌缺失' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ 令牌验证成功:', decoded);
        
        res.json({
            user: {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            }
        });
    } catch (error) {
        console.error('❌ 令牌验证失败:', error);
        res.status(403).json({ message: '无效的访问令牌' });
    }
});

// 🔥 404 处理
app.use('*', (req, res) => {
    console.log(`❌ 404 - 路径不存在: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        message: '请求的资源不存在',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableRoutes: [
            'GET /',
            'GET /api/cors-test',
            'GET /api/health',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET /api/auth/validate'
        ]
    });
});

// 🔥 错误处理
app.use((error, req, res, next) => {
    console.error('❌ 服务器错误:', error);
    res.status(500).json({
        message: '服务器内部错误',
        error: error.message,
        timestamp: new Date().toISOString()
    });
});

// 🔥 启动服务器
app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 天创娃娃收藏服务器启动成功！');
    console.log(`🌐 服务器运行在端口: ${PORT}`);
    console.log(`🌍 外部访问地址: https://my-game-website-5uz0.onrender.com`);
    console.log(`🔧 CORS 已配置，允许来自 https://tianchuang.onrender.com 的请求`);
    console.log('🧪 测试端点:');
    console.log(`   - 根路由: https://my-game-website-5uz0.onrender.com/`);
    console.log(`   - CORS测试: https://my-game-website-5uz0.onrender.com/api/cors-test`);
    console.log(`   - 健康检查: https://my-game-website-5uz0.onrender.com/api/health`);
    console.log('🔑 测试账号:');
    console.log(`   - 管理员: admin / admin123`);
    console.log(`   - 测试用户: test / test123`);
    console.log('========================================');
});

// 🔥 优雅关闭
process.on('SIGTERM', () => {
    console.log('🛑 收到 SIGTERM 信号，正在关闭服务器...');
    mongoose.connection.close(() => {
        console.log('📊 数据库连接已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 收到 SIGINT 信号，正在关闭服务器...');
    mongoose.connection.close(() => {
        console.log('📊 数据库连接已关闭');
        process.exit(0);
    });
});
