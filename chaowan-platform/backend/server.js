// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// 🔧 CORS配置必须在最前面 - 修复中间件顺序
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Vary', 'Origin');
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    console.log('🔧 处理OPTIONS预检请求:', req.url, 'from', origin);
    return res.status(200).json({
      message: 'CORS preflight successful',
      method: req.method,
      url: req.url,
      origin: origin
    });
  }
  
  console.log('📡 收到请求:', req.method, req.url, 'from', origin);
  next();
});

// 然后才是cors中间件
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400
}));

// 处理所有OPTIONS预检请求
app.options('*', cors());

// 最后才是其他中间件
app.use(express.json());

// 🔧 云端数据库连接
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb+srv://j66357791_db_user:hjh628727@cluster0.oiwbvje.mongodb.net/chaowan-db?retryWrites=true&w=majority'
    );
    console.log('✅ 云端数据库连接成功');
    console.log(`📊 连接到数据库: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

connectDB();

// 🔧 用户数据模型（云端数据库）
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  level: { type: Number, default: 1 },
  points: { type: Number, default: 0 },
  experience: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// 🔧 签到记录模型（云端数据库）
const CheckinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastCheckinDate: Date,
  streak: { type: Number, default: 0 },
  totalCheckins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Checkin = mongoose.model('Checkin', CheckinSchema);

// 🔧 初始化测试用户（云端数据库）
const initializeTestUser = async () => {
  try {
    const existingUser = await User.findOne({ email: 'admin@example.com' });
    if (!existingUser) {
      const testUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: '123456',
        level: 1,
        points: 30,
        experience: 0,
        role: 'admin'
      });
      await testUser.save();
      console.log('✅ 测试用户创建成功（云端数据库）- 积分:30');
    }
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error);
  }
};

// 等待数据库连接后初始化
mongoose.connection.once('open', () => {
  initializeTestUser();
});

// 🆕 注册API（云端数据库）
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '请填写所有必填字段' });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '该邮箱已被注册' });
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: '该用户名已被使用' });
    }

    // 创建新用户
    const newUser = new User({
      username,
      email,
      password,
      level: 1,
      points: 50, // 新用户赠送50积分
      experience: 0,
      role: email === 'admin@example.com' ? 'admin' : 'user'
    });

    await newUser.save();
    
    const token = jwt.sign({ userId: newUser._id, email: newUser.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    
    console.log(`🆕 新用户注册: ${username} (${email}), 积分: ${newUser.points}`);
    
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          level: newUser.level,
          points: newUser.points,
          experience: newUser.experience,
          role: newUser.role
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ 注册失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 登录API（云端数据库）
app.post('/api/auth/login', async (req, res) => {
  console.log('🔧 收到登录请求:', req.method, req.url);
  console.log('🔧 请求头:', req.headers);
  console.log('🔧 请求体:', req.body);
  
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email, password });
    
    if (user) {
      const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
      
      console.log(`🔐 用户登录: ${user.username}, 积分: ${user.points}, 等级: ${user.level}`);
      
      // 🔧 确保CORS头部被正确设置
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      res.json({ 
        success: true, 
        message: '登录成功',
        data: { 
          user: { 
            id: user._id,
            username: user.username, 
            email: user.email,
            level: user.level,
            points: user.points,
            experience: user.experience,
            role: user.role
          }, 
          token 
        } 
      });
    } else {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
  } catch (error) {
    console.error('❌ 登录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取用户信息API（云端数据库）
app.get('/api/auth/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      
      console.log(`📋 获取用户信息: ${user.username}, 积分: ${user.points}, 等级: ${user.level}`);
      
      res.json({ 
        success: true, 
        data: { 
          user: { 
            id: user._id,
            username: user.username, 
            email: user.email,
            level: user.level,
            points: user.points,
            experience: user.experience,
            role: user.role
          } 
        } 
      });
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: '无效的token' });
    }
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 签到状态API（云端数据库）
app.get('/api/checkin/status', async (req, res) => {
  console.log('📡 收到签到状态请求（云端数据库）');
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 从云端数据库获取签到记录
    let checkin = await Checkin.findOne({ userId: user._id });
    
    if (!checkin) {
      checkin = new Checkin({ userId: user._id });
      await checkin.save();
    }
    
    // 检查今天是否已签到
    const today = new Date().toDateString();
    const hasCheckedInToday = checkin.lastCheckinDate ? 
      checkin.lastCheckinDate.toDateString() === today : false;
    
    // 计算今日奖励
    const baseReward = 1;
    const levelBonus = Math.floor(user.level / 5);
    const todayReward = baseReward + levelBonus;
    
    console.log(`📊 用户 ${user.username} 签到状态: 今日已签到=${hasCheckedInToday}, 连续=${checkin.streak}天`);
    console.log(`💰 当前积分: ${user.points}, 等级: ${user.level}`);
    
    res.json({ 
      success: true, 
      data: {
        hasCheckedInToday,
        checkinStreak: checkin.streak,
        todayReward,
        baseReward,
        totalCheckins: checkin.totalCheckins,
        lastCheckinDate: checkin.lastCheckinDate
      }
    });
  } catch (error) {
    console.error('❌ 获取签到状态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 签到API（云端数据库）
app.post('/api/checkin', async (req, res) => {
  console.log('📡 ===== 开始签到请求 =====');
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    console.log(`👤 签到用户: ${user.username}, 当前积分: ${user.points}`);
    
    // 从云端数据库获取签到记录
    let checkin = await Checkin.findOne({ userId: user._id });
    
    if (!checkin) {
      checkin = new Checkin({ userId: user._id });
    }
    
    // 检查今天是否已签到
    const today = new Date();
    const todayString = today.toDateString();
    
    if (checkin.lastCheckinDate && checkin.lastCheckinDate.toDateString() === todayString) {
      console.log('❌ 今日已签到，拒绝重复签到');
      return res.status(400).json({ 
        success: false, 
        message: '今日已签到，请明天再来' 
      });
    }
    
    // 计算连续签到天数
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (checkin.lastCheckinDate && checkin.lastCheckinDate.toDateString() === yesterday.toDateString()) {
      checkin.streak += 1;
    } else {
      checkin.streak = 1;
    }
    
    // 计算奖励
    const baseReward = 1;
    const levelBonus = Math.floor(user.level / 5);
    const totalReward = baseReward + levelBonus;
    
    console.log(`🎁 计算奖励: 基础${baseReward} + 等级加成${levelBonus} = ${totalReward}`);
    
    // 更新签到记录（保存到云端数据库）
    checkin.lastCheckinDate = today;
    checkin.totalCheckins += 1;
    await checkin.save();
    
    // 更新用户积分和经验（保存到云端数据库）
    const oldPoints = user.points;
    const oldLevel = user.level;
    
    user.points += totalReward;
    user.experience += 5;
    
    // 检查升级
    const expNeeded = user.level * 50;
    if (user.experience >= expNeeded) {
      user.level += 1;
      user.experience -= expNeeded;
      console.log(`⭐ 恭喜升级！等级: ${oldLevel} → ${user.level}`);
    }
    
    await user.save();
    
    const levelUp = user.level > oldLevel;
    
    console.log(`✅ 签到成功！积分: ${oldPoints} → ${user.points} (+${totalReward})`);
    console.log(`📡 ===== 签到请求完成 =====`);
    
    res.json({ 
      success: true, 
      message: '签到成功！',
      data: {
        reward: totalReward,
        checkinStreak: checkin.streak,
        userPoints: user.points,
        userLevel: user.level,
        userExperience: user.experience,
        levelUp
      }
    });
  } catch (error) {
    console.error('❌ 签到失败:', error);
    console.log('📡 ===== 签到请求失败 =====');
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 🔍 检查用户实际数据API
app.get('/api/check-user-data', async (req, res) => {
  try {
    console.log('🔍 ===== 检查用户实际数据 =====');
    
    // 查找测试用户
    const user = await User.findOne({ email: 'admin@example.com' });
    console.log('👤 数据库中的用户:', user);
    
    // 查找签到记录
    const checkin = await Checkin.findOne({ userId: user._id });
    console.log('📅 数据库中的签到记录:', checkin);
    
    // 检查是否有重复用户
    const allUsers = await User.find({ email: 'admin@example.com' });
    console.log('🔢 同邮箱用户数量:', allUsers.length);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          points: user.points,
          level: user.level,
          experience: user.experience
        },
        checkin: checkin,
        duplicateUsers: allUsers.length
      }
    });
  } catch (error) {
    console.error('❌ 检查数据失败:', error);
    res.status(500).json({ success: false, message: '检查失败' });
  }
});

// 🔄 强制同步数据API
app.post('/api/sync-data', async (req, res) => {
  try {
    console.log('🔄 ===== 强制数据同步 =====');
    
    // 删除重复用户（如果存在）
    const duplicateUsers = await User.find({ email: 'admin@example.com' });
    
    if (duplicateUsers.length > 1) {
      console.log(`🗑️ 发现 ${duplicateUsers.length} 个重复用户，保留第一个，删除其他`);
      
      for (let i = 1; i < duplicateUsers.length; i++) {
        await Checkin.deleteMany({ userId: duplicateUsers[i]._id });
        await User.findByIdAndDelete(duplicateUsers[i]._id);
        console.log(`🗑️ 删除重复用户: ${duplicateUsers[i]._id}`);
      }
    }
    
    // 获取唯一用户
    const user = await User.findOne({ email: 'admin@example.com' });
    
    // 重置为正确数据
    user.points = 30;
    user.level = 1;
    user.experience = 0;
    await user.save();
    
    // 删除所有签到记录
    await Checkin.deleteMany({ userId: user._id });
    
    console.log('✅ 数据同步完成');
    console.log(`💰 积分设置为: ${user.points}`);
    console.log(`⭐ 等级设置为: ${user.level}`);
    
    res.json({
      success: true,
      message: '数据同步成功',
      data: {
        points: user.points,
        level: user.level,
        experience: user.experience
      }
    });
  } catch (error) {
    console.error('❌ 数据同步失败:', error);
    res.status(500).json({ success: false, message: '同步失败' });
  }
});

// 🔄 简单重置API
app.post('/api/simple-reset', async (req, res) => {
  try {
    console.log('🔄 ===== 简单重置开始 =====');
    
    // 删除所有admin用户
    await User.deleteMany({ email: 'admin@example.com' });
    await Checkin.deleteMany({}); // 删除所有签到记录
    
    // 重新创建干净的测试用户
    const newUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: '123456',
      level: 1,
      points: 30,
      experience: 0,
      role: 'admin'
    });
    await newUser.save();
    
    console.log('✅ 简单重置完成，积分设置为30');
    console.log('🔄 ===== 简单重置完成 =====');
    
    res.json({ 
      success: true, 
      message: '重置成功，积分设置为30',
      data: { points: 30, level: 1 }
    });
  } catch (error) {
    console.error('❌ 简单重置失败:', error);
    res.status(500).json({ success: false, message: '重置失败' });
  }
});

// 获取积分历史API（云端数据库）
app.get('/api/points/history', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);
    const checkin = await Checkin.findOne({ userId: user._id });
    
    // 模拟积分历史记录（实际应用中应该有专门的积分记录表）
    const history = [];
    for (let i = 0; i < Math.min(checkin.totalCheckins || 0, 10); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      history.push({
        id: i + 1,
        type: 'checkin',
        amount: 1,
        description: '每日签到奖励',
        createdAt: date.toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      data: { 
        history,
        total: checkin.totalCheckins || 0
      }
    });
  } catch (error) {
    console.error('❌ 获取积分历史失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 🔧 根路径 - 增强版，包含CORS头部
app.get('/', (req, res) => {
  // 确保CORS头部
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({ 
    message: '🎮 潮玩虚拟生态平台API服务正在运行',
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas (云端)',
    cors_config: '超级宽松模式 - 允许所有域名',
    cors_origins: ['*'],
    apis: [
      'POST /api/auth/register - 注册',
      'POST /api/auth/login - 登录',
      'GET /api/auth/user - 获取用户信息',
      'GET /api/checkin/status - 签到状态',
      'POST /api/checkin - 签到',
      'GET /api/check-user-data - 检查数据',
      'POST /api/sync-data - 同步数据',
      'POST /api/simple-reset - 简单重置',
      'GET /api/points/history - 积分历史'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 API服务器运行在端口 ${PORT}`);
  console.log(`🔐 测试账号: admin@example.com / 123456`);
  console.log(`💾 连接到云端数据库`);
  console.log(`🌐 CORS配置: 超级宽松模式 - 允许所有域名`);
});
