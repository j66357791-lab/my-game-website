// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 导入模型
const User = require('./models/User');
const Transaction = require('./models/Transaction');

dotenv.config();

const app = express();

// 🔧 CORS配置必须在最前面
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Vary', 'Origin');
  
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

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400
}));

app.options('*', cors());
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
        role: 'admin'
      });
      await testUser.save();
      console.log('✅ 测试管理员创建成功 - 积分:30, 角色:admin');
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

// 🔧 管理员权限验证中间件
const adminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    User.findById(decoded.userId).then(user => {
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: '需要管理员权限' });
      }
      req.adminId = decoded.userId;
      next();
    }).catch(error => {
      res.status(401).json({ success: false, message: '无效的token' });
    });
  } catch (error) {
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
      role: isAdminEmail ? 'admin' : 'user'
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
    
    console.log(`🆕 新用户注册: ${username} (${email}), 积分: ${newUser.points}, 角色: ${newUser.role}`);
    
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
      
      console.log(`🔐 用户登录: ${user.username}, 积分: ${user.points}, 等级: ${user.level}, 角色: ${user.role}`);
      
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
          role: user.role
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

// ==================== 管理员API ====================

// 📊 管理员仪表板数据
app.get('/api/admin/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const todayTransactions = await Transaction.countDocuments({
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
          todayRevenue: todayRevenue[0]?.total || 0
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
    const { username, email, level, points, experience, role } = req.body;
    
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
    if (experience !== undefined) updateData.experience = experience;
    if (role) updateData.role = role;
    
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

// 🗑️ 用户管理 - 删除用户
app.delete('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    await User.findByIdAndDelete(userId);
    await Checkin.deleteMany({ userId });
    await Transaction.deleteMany({ userId });
    
    console.log(`🗑️ 管理员删除用户: ${user.username}`);
    
    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('❌ 删除用户失败:', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

// 💰 积分管理 - 获取积分记录
app.get('/api/admin/points', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, type } = req.query;
    
    let query = {};
    if (userId) query.userId = userId;
    if (type) query.type = type;
    
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
    console.error('❌ 获取积分记录失败:', error);
    res.status(500).json({ success: false, message: '获取积分记录失败' });
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
    user.points += amount;
    await user.save();
    
    // 记录交易
    const transaction = new Transaction({
      userId,
      type: amount > 0 ? 'admin_add' : 'admin_deduct',
      amount,
      description: description || (amount > 0 ? '管理员奖励' : '管理员扣除'),
      balance: user.points
    });
    await transaction.save();
    
    console.log(`💰 管理员调整用户积分: ${user.username}, ${oldPoints} → ${user.points} (${amount > 0 ? '+' : ''}${amount})`);
    
    res.json({
      success: true,
      message: '积分调整成功',
      data: {
        oldPoints,
        newPoints: user.points,
        adjustment: amount
      }
    });
  } catch (error) {
    console.error('❌ 调整积分失败:', error);
    res.status(500).json({ success: false, message: '调整积分失败' });
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

// 根路径
app.get('/', (req, res) => {
  res.json({ 
    message: '🎮 潮玩虚拟生态平台API服务正在运行',
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas (云端)',
    version: '2.2.0 - 管理员权限修复版',
    admin_accounts: [
      'admin@example.com / 123456 (默认)',
      'admin@18679012034.com / hjh628727 (私密)'
    ],
    features: [
      '✅ 自动修复管理员权限',
      '✅ 支持多个管理员账号',
      '✅ 完整的管理员功能',
      '🔧 /api/fix-admin - 权限修复API'
    ],
    apis: [
      'POST /api/auth/login - 登录',
      'POST /api/auth/register - 注册',
      'GET /api/auth/user - 获取用户信息',
      'GET /api/checkin/status - 签到状态',
      'POST /api/checkin - 签到',
      'GET /api/points/history - 积分历史',
      'POST /api/fix-admin - 修复管理员权限',
      'GET /api/admin/dashboard - 仪表板',
      'GET /api/admin/users - 用户管理',
      'PUT /api/admin/users/:userId - 编辑用户',
      'DELETE /api/admin/users/:userId - 删除用户',
      'GET /api/admin/points - 积分管理',
      'POST /api/admin/points/adjust - 调整积分',
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
  console.log(`💾 连接到云端数据库`);
  console.log(`🌐 管理员API已启用`);
});
