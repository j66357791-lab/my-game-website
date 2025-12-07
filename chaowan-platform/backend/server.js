const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 导入模型
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Withdrawal = require('./models/Withdrawal');

dotenv.config();

const app = express();

// 🔧 简化CORS配置 - 移除重复配置
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://chaowan-frontend.onrender.com',
    'https://tianchuang.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  res.header('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
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

app.use(express.json());

// 🔧 新增：基础测试端点
app.get('/api/test-cors', (req, res) => {
  console.log('🔧 CORS测试请求:', req.headers.origin);
  res.json({
    success: true,
    message: 'CORS测试成功',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    headers: {
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin,
      'referer': req.headers.referer
    }
  });
});

// 🔧 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 🔧 API版本信息
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    version: '2.3.2',
    name: '潮玩虚拟生态平台API',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    features: [
      '用户认证',
      '积分系统',
      '签到功能',
      '提现审批',
      '管理员面板'
    ]
  });
});

// 🔧 简化的状态检查
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

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

// 🔧 签到记录模型（内联定义，避免重复）
const CheckinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastCheckinDate: Date,
  streak: { type: Number, default: 0 },
  totalCheckins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Checkin = mongoose.model('Checkin', CheckinSchema);

// 🔧 初始化测试用户
const initializeTestUser = async () => {
  try {
    // 确保默认管理员账号存在且角色正确
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      const testUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: '123456',
        level: 1,
        points: 30,
        experience: 0,
        role: 'admin',
        cashBalance: 1000
      });
      await testUser.save();
      console.log('✅ 测试管理员创建成功 - 积分:30, 角色:admin, 余额:1000');
    } else if (existingAdmin.role !== 'admin') {
      // 修复现有管理员的角色
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('🔧 修复管理员角色成功');
    }
  } catch (error) {
    console.error('❌ 创建/修复测试用户失败:', error);
  }
};

mongoose.connection.once('open', () => {
  initializeTestUser();
});

// 🔧 认证中间件
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: '无效的token' });
  }
};

// 🔧 管理员权限验证中间件 - 修复版本
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    
    req.adminId = decoded.userId;
    req.adminUser = user;
    next();
  } catch (error) {
    console.error('❌ adminAuth错误:', error);
    res.status(401).json({ success: false, message: '无效的token' });
  }
};

// 🔧 临时修复管理员权限API
app.post('/api/fix-admin', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: '请提供邮箱' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const oldRole = user.role;
    user.role = 'admin';
    await user.save();
    
    console.log(`🔧 修复管理员权限: ${email} ${oldRole} -> admin`);
    
    res.json({
      success: true,
      message: '管理员权限修复成功',
      data: {
        email: user.email,
        username: user.username,
        oldRole,
        newRole: user.role
      }
    });
  } catch (error) {
    console.error('❌ 修复管理员权限失败:', error);
    res.status(500).json({ success: false, message: '修复失败' });
  }
});

// 🆕 注册API - 支持新管理员账号
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '请填写所有必填字段' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '该邮箱已被注册' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: '该用户名已被使用' });
    }

    // 🔥 支持多个管理员邮箱
    const isAdminEmail = [
      'admin@example.com',
      'admin@18679012034.com'
    ].includes(email);

    const newUser = new User({
      username,
      email,
      password,
      level: 1,
      points: 50,
      experience: 0,
      role: isAdminEmail ? 'admin' : 'user',
      cashBalance: isAdminEmail ? 1000 : 0
    });

    await newUser.save();
    
    // 记录注册奖励
    const transaction = new Transaction({
      userId: newUser._id,
      type: 'register',
      amount: 50,
      balance: newUser.points,
      description: '注册奖励'
    });
    await transaction.save();
    
    const token = jwt.sign({ userId: newUser._id, email: newUser.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    
    console.log(`🆕 新用户注册: ${username} (${email}), 积分: ${newUser.points}, 角色: ${newUser.role}, 余额: ${newUser.cashBalance}`);
    
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
          role: newUser.role,
          cashBalance: newUser.cashBalance
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ 注册失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 登录API
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email, password });
    
    if (user) {
      // 更新最后登录时间
      user.lastLogin = new Date();
      await user.save();
      
      const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
      
      console.log(`🔐 用户登录: ${user.username}, 积分: ${user.points}, 等级: ${user.level}, 角色: ${user.role}, 余额: ${user.cashBalance}`);
      
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
            role: user.role,
            cashBalance: user.cashBalance
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

// 获取用户信息API
app.get('/api/auth/user', async (req, res) => {
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
          role: user.role,
          cashBalance: user.cashBalance
        } 
      } 
    });
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 签到状态API
app.get('/api/checkin/status', async (req, res) => {
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
    
    let checkin = await Checkin.findOne({ userId: user._id });
    
    if (!checkin) {
      checkin = new Checkin({ userId: user._id });
      await checkin.save();
    }
    
    const today = new Date().toDateString();
    const hasCheckedInToday = checkin.lastCheckinDate ? 
      checkin.lastCheckinDate.toDateString() === today : false;
    
    const baseReward = 1;
    const levelBonus = Math.floor(user.level / 5);
    const todayReward = baseReward + levelBonus;
    
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

// 签到API
app.post('/api/checkin', async (req, res) => {
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
    
    let checkin = await Checkin.findOne({ userId: user._id });
    
    if (!checkin) {
      checkin = new Checkin({ userId: user._id });
    }
    
    const today = new Date();
    const todayString = today.toDateString();
    
    if (checkin.lastCheckinDate && checkin.lastCheckinDate.toDateString() === todayString) {
      return res.status(400).json({ 
        success: false, 
        message: '今日已签到，请明天再来' 
      });
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (checkin.lastCheckinDate && checkin.lastCheckinDate.toDateString() === yesterday.toDateString()) {
      checkin.streak += 1;
    } else {
      checkin.streak = 1;
    }
    
    const baseReward = 1;
    const levelBonus = Math.floor(user.level / 5);
    const totalReward = baseReward + levelBonus;
    
    checkin.lastCheckinDate = today;
    checkin.totalCheckins += 1;
    await checkin.save();
    
    const oldPoints = user.points;
    const oldLevel = user.level;
    
    user.points += totalReward;
    user.experience += 5;
    
    const expNeeded = user.level * 50;
    if (user.experience >= expNeeded) {
      user.level += 1;
      user.experience -= expNeeded;
      
      // 记录升级奖励
      const levelUpTransaction = new Transaction({
        userId: user._id,
        type: 'level_up',
        amount: 10,
        balance: user.points,
        description: `升级到Lv.${user.level}奖励`,
        metadata: {
          oldLevel,
          newLevel: user.level
        }
      });
      await levelUpTransaction.save();
    }
    
    await user.save();
    
    // 记录签到奖励
    const checkinTransaction = new Transaction({
      userId: user._id,
      type: 'checkin',
      amount: totalReward,
      balance: user.points,
      description: `每日签到奖励 (连续${checkin.streak}天)`,
      metadata: {
        streak: checkin.streak
      }
    });
    await checkinTransaction.save();
    
    const levelUp = user.level > oldLevel;
    
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
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取积分历史API
app.get('/api/points/history', async (req, res) => {
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
    
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({ 
      success: true, 
      data: { 
        history: transactions,
        total: transactions.length
      }
    });
  } catch (error) {
    console.error('❌ 获取积分历史失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 🔧 新增：提现申请API
app.post('/api/withdrawal/create', authMiddleware, async (req, res) => {
  try {
    const { amount, alipayAccount, realName } = req.body;
    const userId = req.user.id;

    // 验证提现金额
    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: '提现金额不能小于1元'
      });
    }

    // 检查用户余额
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.cashBalance < amount) {
      return res.status(400).json({
        success: false,
        message: '余额不足'
      });
    }

    // 检查今日提现限制
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayWithdrawals = await Withdrawal.find({
      userId,
      status: { $in: ['pending', 'approved'] },
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todayTotal = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const dailyLimit = user.withdrawalLimit?.daily || 500; // 默认每日500元限制

    if (todayTotal + amount > dailyLimit) {
      return res.status(400).json({
        success: false,
        message: `超出每日提现限制 ¥${dailyLimit}`
      });
    }

    // 创建提现申请
    const withdrawal = new Withdrawal({
      userId,
      amount,
      alipayAccount,
      realName,
      frozenAmount: amount
    });

    await withdrawal.save();

    // 冻结用户余额
    user.cashBalance -= amount;
    await user.save();

    console.log(`💰 用户提现申请: ${user.username}, 金额: ¥${amount}, 支付宝: ${alipayAccount}`);

    res.status(201).json({
      success: true,
      message: '提现申请已提交，等待审核',
      data: { withdrawal }
    });

  } catch (error) {
    console.error('❌ 创建提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 🔧 新增：获取用户提现记录API
app.get('/api/withdrawal/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const withdrawals = await Withdrawal.find({ userId })
      .populate('userId', 'username email')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Withdrawal.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('❌ 获取提现记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// ==================== 管理员API ====================

// 📊 管理员仪表板数据
app.get('/api/admin/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const todayTransactions = await Transaction.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    // 🔧 新增：提现相关统计
    const totalWithdrawals = await Withdrawal.countDocuments();
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const todayWithdrawals = await Withdrawal.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const totalPointsInSystem = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$points" } } }
    ]);
    
    const todayRevenue = await Transaction.aggregate([
      {
        $match: {
          type: 'purchase',
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      },
      { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }
    ]);

    const recentTransactions = await Transaction.find()
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalTransactions,
          todayTransactions,
          totalPointsInSystem: totalPointsInSystem[0]?.total || 0,
          todayRevenue: todayRevenue[0]?.total || 0,
          totalWithdrawals,
          pendingWithdrawals,
          todayWithdrawals
        },
        recentTransactions
      }
    });
  } catch (error) {
    console.error('❌ 获取仪表板数据失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

// 👥 用户管理 - 获取所有用户
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'createdAt' } = req.query;
    
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const users = await User.find(searchQuery)
      .sort({ [sortBy]: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');
    
    const total = await User.countDocuments(searchQuery);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ 获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// ✏️ 用户管理 - 编辑用户
app.put('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, level, points, cashBalance, role, disabled } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: '该邮箱已被使用' });
      }
    }
    
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (level !== undefined) updateData.level = level;
    if (points !== undefined) updateData.points = points;
    if (cashBalance !== undefined) updateData.cashBalance = cashBalance;
    if (role) updateData.role = role;
    if (disabled !== undefined) updateData.disabled = disabled;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');
    
    console.log(`📝 管理员编辑用户: ${updatedUser.username}`);
    
    res.json({
      success: true,
      message: '用户信息更新成功',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('❌ 编辑用户失败:', error);
    res.status(500).json({ success: false, message: '编辑用户失败' });
  }
});

// 🔧 新增：修改用户密码
app.put('/api/admin/users/:userId/password', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: '密码长度不能少于6位' 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 这里应该加密密码，简化处理
    user.password = newPassword; // 实际应该使用 bcrypt
    await user.save();

    console.log(`🔑 管理员修改密码: ${user.username}`);

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('❌ 修改密码失败:', error);
    res.status(500).json({ success: false, message: '修改密码失败' });
  }
});

// 🔧 新增：切换用户状态
app.put('/api/admin/users/:userId/toggle-status', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    user.disabled = !user.disabled;
    await user.save();

    console.log(`🔄 管理员切换用户状态: ${user.username} -> ${user.disabled ? '禁用' : '启用'}`);

    res.json({
      success: true,
      message: `用户已${user.disabled ? '禁用' : '启用'}`,
      data: { disabled: user.disabled }
    });
  } catch (error) {
    console.error('❌ 切换用户状态失败:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// 🗑️ 用户管理 - 删除用户
app.delete('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    await Checkin.deleteMany({ userId });
    await Transaction.deleteMany({ userId });
    await Withdrawal.deleteMany({ userId });
    
    console.log(`🗑️ 管理员删除用户: ${user.username}`);
    
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('❌ 删除用户失败:', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

// 💰 积分管理 - 调整用户积分
app.post('/api/admin/points/adjust', adminAuth, async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const oldPoints = user.points;
    user.points = Math.max(0, user.points + amount);
    await user.save();

    // 记录交易
    await Transaction.create({
      userId,
      type: amount > 0 ? 'admin_add' : 'admin_deduct',
      amount: Math.abs(amount),
      description: description || `管理员${amount > 0 ? '增加' : '扣除'}积分`,
      balance: user.points
    });

    console.log(`💰 管理员调整积分: ${user.username}, ${oldPoints} → ${user.points} (${amount > 0 ? '+' : ''}${amount})`);

    res.json({
      success: true,
      message: '积分调整成功',
      data: { oldPoints, newPoints: user.points }
    });
  } catch (error) {
    console.error('❌ 调整积分失败:', error);
    res.status(500).json({ success: false, message: '积分调整失败' });
  }
});

// 🔧 新增：调整用户余额
app.post('/api/admin/cash/adjust', adminAuth, async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const oldCash = user.cashBalance;
    user.cashBalance = Math.max(0, user.cashBalance + amount);
    await user.save();

    // 记录交易
    await Transaction.create({
      userId,
      type: amount > 0 ? 'admin_cash_add' : 'admin_cash_deduct',
      amount: Math.abs(amount),
      description: description || `管理员${amount > 0 ? '增加' : '扣除'}现金`,
      balance: user.cashBalance
    });

    console.log(`💰 管理员调整余额: ${user.username}, ¥${oldCash} → ¥${user.cashBalance} (${amount > 0 ? '+' : ''}¥${amount})`);

    res.json({
      success: true,
      message: '余额调整成功',
      data: { oldCash, newCash: user.cashBalance }
    });
  } catch (error) {
    console.error('❌ 调整余额失败:', error);
    res.status(500).json({ success: false, message: '余额调整失败' });
  }
});

// 🔧 新增：获取所有提现申请
app.get('/api/admin/withdrawals', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const withdrawals = await Withdrawal.find(filter)
      .populate('userId', 'username email')
      .populate('processedBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Withdrawal.countDocuments(filter);

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('❌ 获取提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 🔧 修复：处理提现申请
app.put('/api/admin/withdrawals/:id/process', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remark } = req.body; // action: 'approve' or 'reject'
    const adminId = req.adminId;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作'
      });
    }

    const withdrawal = await Withdrawal.findById(id).populate('userId');
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: '提现申请不存在'
      });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该申请已被处理'
      });
    }

    withdrawal.status = action === 'approve' ? 'approved' : 'rejected';
    withdrawal.remark = remark || '';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = adminId;

    // 如果拒绝，退还余额
    if (action === 'reject') {
      const user = await User.findById(withdrawal.userId._id);
      if (user) {
        user.cashBalance += withdrawal.frozenAmount;
        await user.save();
      }
    }

    await withdrawal.save();

    console.log(`💸 管理员处理提现: ${withdrawal.userId.username}, ${action === 'approve' ? '批准' : '拒绝'} ¥${withdrawal.amount}`);

    res.json({
      success: true,
      message: `提现申请已${action === 'approve' ? '批准' : '拒绝'}`,
      data: { withdrawal }
    });

  } catch (error) {
    console.error('❌ 处理提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 🔧 修复：批量处理提现申请
app.post('/api/admin/withdrawals/batch-process', adminAuth, async (req, res) => {
  try {
    const { withdrawalIds, action, remark } = req.body;
    const adminId = req.adminId;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作'
      });
    }

    if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要处理的申请'
      });
    }

    const withdrawals = await Withdrawal.find({
      _id: { $in: withdrawalIds },
      status: 'pending'
    }).populate('userId');

    if (withdrawals.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可处理的申请'
      });
    }

    // 批量处理
    const processedWithdrawals = [];
    
    for (const withdrawal of withdrawals) {
      withdrawal.status = action === 'approve' ? 'approved' : 'rejected';
      withdrawal.remark = remark || '';
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = adminId;

      // 如果拒绝，退还余额
      if (action === 'reject') {
        const user = await User.findById(withdrawal.userId._id);
        if (user) {
          user.cashBalance += withdrawal.frozenAmount;
          await user.save();
        }
      }

      await withdrawal.save();
      processedWithdrawals.push(withdrawal);
    }

    console.log(`💸 管理员批量处理提现: ${action === 'approve' ? '批准' : '拒绝'} ${processedWithdrawals.length} 个申请`);

    res.json({
      success: true,
      message: `已批量${action === 'approve' ? '批准' : '拒绝'} ${processedWithdrawals.length} 个申请`,
      data: { 
        processedCount: processedWithdrawals.length,
        withdrawals: processedWithdrawals
      }
    });

  } catch (error) {
    console.error('❌ 批量处理提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 💳 交易管理 - 获取交易记录
app.get('/api/admin/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, type, startDate, endDate } = req.query;
    
    let query = {};
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ 获取交易记录失败:', error);
    res.status(500).json({ success: false, message: '获取交易记录失败' });
  }
});

// 📊 数据分析 - 获取统计数据
app.get('/api/admin/analytics', adminAuth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate;
    switch (period) {
      case '1d':
        startDate = new Date(new Date().setHours(0, 0, 0, 0));
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // 用户注册趋势
    const userRegistrationTrend = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 交易趋势
    const transactionTrend = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 用户等级分布
    const levelDistribution = await User.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 积分分布统计
    const pointsDistribution = await User.aggregate([
      {
        $bucket: {
          groupBy: '$points',
          boundaries: [0, 50, 100, 200, 500, 1000, Infinity],
          default: '1000+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // 交易类型统计
    const transactionTypeStats = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: { $abs: '$amount' } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        userRegistrationTrend,
        transactionTrend,
        levelDistribution,
        pointsDistribution,
        transactionTypeStats,
        period
      }
    });
  } catch (error) {
    console.error('❌ 获取分析数据失败:', error);
    res.status(500).json({ success: false, message: '获取分析数据失败' });
  }
});

// 🔧 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API端点不存在',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /api/test-cors',
      'GET /api/health',
      'GET /api/version',
      'GET /api/status',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/user',
      'GET /api/checkin/status',
      'POST /api/checkin',
      'GET /api/points/history',
      'POST /api/withdrawal/create',
      'GET /api/withdrawal/my',
      'POST /api/fix-admin',
      'GET /api/admin/dashboard',
      'GET /api/admin/users',
      'PUT /api/admin/users/:userId',
      'PUT /api/admin/users/:userId/password',
      'PUT /api/admin/users/:userId/toggle-status',
      'DELETE /api/admin/users/:userId',
      'POST /api/admin/points/adjust',
      'POST /api/admin/cash/adjust',
      'GET /api/admin/withdrawals',
      'PUT /api/admin/withdrawals/:id/process',
      'POST /api/admin/withdrawals/batch-process',
      'GET /api/admin/transactions',
      'GET /api/admin/analytics'
    ]
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({ 
    message: '🎮 潮玩虚拟生态平台API服务正在运行',
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas (云端)',
    version: '2.3.2 - 修复提现审批系统',
    admin_accounts: [
      'admin@example.com / 123456 (默认)',
      'admin@18679012034.com / hjh628727 (私密)'
    ],
    features: [
      '✅ 完整的提现审批系统',
      '✅ 用户余额管理',
      '✅ 批量提现处理',
      '✅ 移动端优化',
      '✅ 管理员权限控制',
      '✅ CORS测试端点'
    ],
    apis: [
      'GET /api/test-cors - CORS测试',
      'GET /api/health - 健康检查',
      'GET /api/version - 版本信息',
      'GET /api/status - 状态检查',
      'POST /api/auth/login - 登录',
      'POST /api/auth/register - 注册',
      'GET /api/auth/user - 获取用户信息',
      'GET /api/checkin/status - 签到状态',
      'POST /api/checkin - 签到',
      'GET /api/points/history - 积分历史',
      'POST /api/withdrawal/create - 提现申请',
      'GET /api/withdrawal/my - 我的提现记录',
      'POST /api/fix-admin - 修复管理员权限',
      'GET /api/admin/dashboard - 仪表板',
      'GET /api/admin/users - 用户管理',
      'PUT /api/admin/users/:userId - 编辑用户',
      'PUT /api/admin/users/:userId/password - 修改密码',
      'PUT /api/admin/users/:userId/toggle-status - 切换状态',
      'DELETE /api/admin/users/:userId - 删除用户',
      'POST /api/admin/points/adjust - 调整积分',
      'POST /api/admin/cash/adjust - 调整余额',
      'GET /api/admin/withdrawals - 提现管理',
      'PUT /api/admin/withdrawals/:id/process - 处理提现',
      'POST /api/admin/withdrawals/batch-process - 批量处理',
      'GET /api/admin/transactions - 交易记录',
      'GET /api/admin/analytics - 数据分析'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 API服务器运行在端口 ${PORT}`);
  console.log(`🔐 默认管理员: admin@example.com / 123456`);
  console.log(`🔐 私密管理员: admin@18679012034.com / hjh628727`);
  console.log(`🔧 权限修复API: POST /api/fix-admin`);
  console.log(`🔧 CORS测试API: GET /api/test-cors`);
  console.log(`💾 连接到云端数据库`);
  console.log(`🌐 管理员API已启用`);
  console.log(`💰 提现审批系统已启用`);
});
