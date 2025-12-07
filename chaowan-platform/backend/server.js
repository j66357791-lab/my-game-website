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

// 🔧 修复CORS配置 - 支持多个域名
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // 允许的域名列表
  const allowedOrigins = [
    'https://chaowan-frontend.onrender.com',
    'https://tianchuang.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001'
  ];
  
  // 检查是否在允许列表中
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
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
  origin: function (origin, callback) {
    // 允许的域名列表
    const allowedOrigins = [
      'https://chaowan-frontend.onrender.com',
      'https://tianchuang.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ];
    
    // 允许没有origin的请求（如移动应用）
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.log('🚫 CORS拒绝的origin:', origin);
      return callback(new Error('CORS策略不允许此来源'));
    }
  },
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

// 🔧 初始化和修复用户数据
const initializeAndFixUsers = async () => {
  try {
    // 确保默认管理员账号存在
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
    } else {
      // 修复管理员数据
      let needsUpdate = false;
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        needsUpdate = true;
      }
      if (existingAdmin.cashBalance === undefined) {
        existingAdmin.cashBalance = 1000;
        needsUpdate = true;
      }
      if (needsUpdate) {
        await existingAdmin.save();
        console.log('🔧 管理员数据修复成功');
      }
    }

    // 修复所有普通用户的现金余额
    const usersWithoutCash = await User.find({ 
      $or: [
        { cashBalance: { $exists: false } },
        { cashBalance: null }
      ]
    });

    for (const user of usersWithoutCash) {
      user.cashBalance = user.role === 'admin' ? 1000 : 100;
      await user.save();
      console.log(`🔧 修复用户 ${user.username} 的现金余额: ¥${user.cashBalance}`);
    }

    console.log('✅ 用户数据初始化和修复完成');
  } catch (error) {
    console.error('❌ 初始化用户数据失败:', error);
  }
};

mongoose.connection.once('open', () => {
  initializeAndFixUsers();
});

// 🔧 认证中间件 - 修复版本
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供Authorization头' 
      });
    }

    // 支持 "Bearer token" 和直接 "token" 两种格式
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供token' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // 验证token格式
    if (!decoded.userId || !decoded.email) {
      return res.status(401).json({ 
        success: false, 
        message: 'token格式无效' 
      });
    }

    // 查找用户验证token有效性
    User.findById(decoded.userId).then(user => {
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: '用户不存在' 
        });
      }

      if (user.email !== decoded.email) {
        return res.status(401).json({ 
          success: false, 
          message: 'token信息不匹配' 
        });
      }

      // 设置用户信息到请求对象
      req.user = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        cashBalance: user.cashBalance || 0
      };
      
      console.log(`✅ Token验证成功: ${user.username} (${user.email}) - 余额: ¥${user.cashBalance}`);
      next();
    }).catch(error => {
      console.error('❌ Token验证失败:', error.message);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'token无效或已过期' 
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'token已过期，请重新登录' 
        });
      }
      res.status(500).json({ 
        success: false, 
        message: 'token验证失败' 
      });
    });
  } catch (error) {
    console.error('❌ 认证中间件错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误' 
    });
  }
};

// 🔧 管理员权限验证中间件
const adminAuth = (req, res, next) => {
  // 先通过普通认证
  authMiddleware(req, res, () => {
    // 然后检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '需要管理员权限' 
      });
    }
    next();
  });
};

// 🔧 CORS测试API
app.get('/api/test-cors', (req, res) => {
  const origin = req.headers.origin;
  console.log('🔍 CORS测试请求来自:', origin);
  
  res.json({
    success: true,
    message: 'CORS测试成功',
    origin: origin,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

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
    if (user.cashBalance === undefined) {
      user.cashBalance = 1000;
    }
    await user.save();
    
    console.log(`🔧 修复管理员权限: ${email} ${oldRole} -> admin, 余额: ¥${user.cashBalance}`);
    
    res.json({
      success: true,
      message: '管理员权限修复成功',
      data: {
        email: user.email,
        username: user.username,
        oldRole,
        newRole: user.role,
        cashBalance: user.cashBalance
      }
    });
  } catch (error) {
    console.error('❌ 修复管理员权限失败:', error);
    res.status(500).json({ success: false, message: '修复失败' });
  }
});

// 🔧 修复所有用户余额API
app.post('/api/fix-all-users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({});
    let fixedCount = 0;
    
    for (const user of users) {
      if (user.cashBalance === undefined || user.cashBalance === null) {
        user.cashBalance = user.role === 'admin' ? 1000 : 100;
        await user.save();
        fixedCount++;
        console.log(`🔧 修复用户 ${user.username} 余额: ¥${user.cashBalance}`);
      }
    }
    
    res.json({
      success: true,
      message: `修复了 ${fixedCount} 个用户的余额`,
      data: { fixedCount, totalUsers: users.length }
    });
  } catch (error) {
    console.error('❌ 修复用户余额失败:', error);
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

    // 支持多个管理员邮箱
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
      cashBalance: isAdminEmail ? 1000 : 100 // 确保有初始余额
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
    
    console.log(`🆕 新用户注册: ${username} (${email}), 积分: ${newUser.points}, 角色: ${newUser.role}, 余额: ¥${newUser.cashBalance}`);
    
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
          cashBalance: newUser.cashBalance // 确保返回余额
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ 注册失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 登录API - 修复版本
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    console.log(`🔐 尝试登录: ${email}`);
    
    const user = await User.findOne({ email, password });
    
    if (user) {
      // 确保用户有余额
      if (user.cashBalance === undefined || user.cashBalance === null) {
        user.cashBalance = user.role === 'admin' ? 1000 : 100;
        await user.save();
        console.log(`🔧 修复用户 ${user.username} 余额: ¥${user.cashBalance}`);
      }
      
      // 更新最后登录时间
      user.lastLogin = new Date();
      await user.save();
      
      const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
      
      console.log(`🔐 用户登录成功: ${user.username}, 积分: ${user.points}, 等级: ${user.level}, 角色: ${user.role}, 余额: ¥${user.cashBalance}`);
      
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
            cashBalance: user.cashBalance // 确保返回余额
          }, 
          token 
        } 
      });
    } else {
      console.log(`❌ 登录失败: ${email} - 用户名或密码错误`);
      res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
  } catch (error) {
    console.error('❌ 登录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取用户信息API - 修复版本
app.get('/api/auth/user', authMiddleware, async (req, res) => {
  try {
    // 从中间件获取用户信息，避免重复查询
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 确保用户有余额
    if (user.cashBalance === undefined || user.cashBalance === null) {
      user.cashBalance = user.role === 'admin' ? 1000 : 100;
      await user.save();
      console.log(`🔧 修复用户 ${user.username} 余额: ¥${user.cashBalance}`);
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
          cashBalance: user.cashBalance // 确保返回余额
        } 
      } 
    });
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 签到状态API
app.get('/api/checkin/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
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
app.post('/api/checkin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
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
app.get('/api/points/history', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
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

// 修复：提现申请API - 所有用户都可以使用
app.post('/api/withdrawal/create', authMiddleware, async (req, res) => {
  try {
    const { amount, alipayAccount, realName } = req.body;
    const userId = req.user.id;

    console.log(`💰 收到提现申请: 用户ID=${userId}, 金额=${amount}`);

    // 验证提现金额
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: '提现金额不能小于1元'
      });
    }

    if (!alipayAccount || alipayAccount.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '请提供支付宝账号'
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

    // 确保用户有余额字段
    if (user.cashBalance === undefined || user.cashBalance === null) {
      user.cashBalance = user.role === 'admin' ? 1000 : 100;
      await user.save();
      console.log(`🔧 修复用户 ${user.username} 余额: ¥${user.cashBalance}`);
    }

    console.log(`用户当前余额: ¥${user.cashBalance}`);

    if (user.cashBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `余额不足。当前余额: ¥${user.cashBalance}，申请金额: ¥${amount}`
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
        message: `超出每日提现限制。今日已申请: ¥${todayTotal}，限制: ¥${dailyLimit}`
      });
    }

    // 创建提现申请
    const withdrawal = new Withdrawal({
      userId,
      amount,
      alipayAccount: alipayAccount.trim(),
      realName: realName || user.username,
      frozenAmount: amount
    });

    await withdrawal.save();

    // 冻结用户余额
    user.cashBalance -= amount;
    await user.save();

    console.log(`✅ 提现申请创建成功: 用户=${user.username}, 金额=¥${amount}, 申请ID=${withdrawal._id}`);

    res.status(201).json({
      success: true,
      message: '提现申请已提交，等待审核',
      data: { 
        withdrawal: {
          id: withdrawal._id,
          amount: withdrawal.amount,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt
        }
      }
    });

  } catch (error) {
    console.error('❌ 创建提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
});

// 修复：获取用户提现记录API
app.get('/api/withdrawal/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    console.log(`📋 获取用户提现记录: 用户ID=${userId}, 页码=${page}`);
    
    const withdrawals = await Withdrawal.find({ userId })
      .populate('userId', 'username email')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Withdrawal.countDocuments({ userId });

    console.log(`✅ 找到 ${withdrawals.length} 条提现记录`);

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
      message: '服务器错误: ' + error.message
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
    
    // 新增：提现相关统计
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
    const { username, email, level, points, experience, role, cashBalance, disabled } = req.body;
    
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
    if (cashBalance !== undefined) updateData.cashBalance = cashBalance;
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

// 新增：修改用户密码
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

// 新增：切换用户状态
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

// 新增：调整用户余额
app.post('/api/admin/cash/adjust', adminAuth, async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const oldCash = user.cashBalance || 0;
    user.cashBalance = Math.max(0, (user.cashBalance || 0) + amount);
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

// 新增：获取所有提现申请
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

// 新增：处理提现申请
app.put('/api/admin/withdrawals/:id/process', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remark } = req.body; // action: 'approve' or 'reject'
    const adminId = req.user.id;

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
      user.cashBalance = (user.cashBalance || 0) + withdrawal.frozenAmount;
      await user.save();
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
      message: '服务器错误'
    });
  }
});

// 新增：批量处理提现申请
app.post('/api/admin/withdrawals/batch-process', adminAuth, async (req, res) => {
  try {
    const { withdrawalIds, action, remark } = req.body;
    const adminId = req.user.id;

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
    for (const withdrawal of withdrawals) {
      withdrawal.status = action === 'approve' ? 'approved' : 'rejected';
      withdrawal.remark = remark || '';
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = adminId;

      // 如果拒绝，退还余额
      if (action === 'reject') {
        const user = await User.findById(withdrawal.userId._id);
        user.cashBalance = (user.cashBalance || 0) + withdrawal.frozenAmount;
        await user.save();
      }

      await withdrawal.save();
    }

    console.log(`💸 管理员批量处理提现: ${action === 'approve' ? '批准' : '拒绝'} ${withdrawals.length} 个申请`);

    res.json({
      success: true,
      message: `已批量${action === 'approve' ? '批准' : '拒绝'} ${withdrawals.length} 个申请`,
      data: { processedCount: withdrawals.length }
    });

  } catch (error) {
    console.error('❌ 批量处理提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
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

// Token调试API
app.post('/api/debug/token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '请提供token'
      });
    }

    console.log('🔍 调试token:', token.substring(0, 20) + '...');

    // 尝试验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    console.log('🔍 Token解码结果:', decoded);

    // 查找用户
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: 'Token有效',
      data: {
        token: decoded,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          cashBalance: user.cashBalance || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Token调试失败:', error);
    res.status(401).json({
      success: false,
      message: 'Token无效: ' + error.message
    });
  }
});

// 根路径
app.get('/', (req, res) => {
  const origin = req.headers.origin;
  res.json({ 
    message: '🎮 潮玩虚拟生态平台API服务正在运行',
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas (云端)',
    version: '2.5.0 - CORS修复版',
    origin: origin,
    cors_enabled: true,
    admin_accounts: [
      'admin@example.com / 123456 (默认)',
      'admin@18679012034.com / hjh628727 (私密)'
    ],
    features: [
      '✅ 完整的提现审批系统',
      '✅ 所有用户都可以申请提现',
      '✅ 自动修复用户余额',
      '✅ CORS跨域支持',
      '✅ 移动端优化',
      '✅ 管理员权限控制'
    ],
    apis: [
      'GET /api/test-cors - CORS测试',
      'POST /api/auth/login - 登录',
      'POST /api/auth/register - 注册',
      'GET /api/auth/user - 获取用户信息',
      'GET /api/checkin/status - 签到状态',
      'POST /api/checkin - 签到',
      'GET /api/points/history - 积分历史',
      'POST /api/withdrawal/create - 提现申请',
      'GET /api/withdrawal/my - 我的提现记录',
      'POST /api/fix-admin - 修复管理员权限',
      'POST /api/fix-all-users - 修复所有用户余额',
      'POST /api/debug/token - Token调试',
      'GET /api/admin/dashboard - 仪表板',
      'GET /api/admin/users - 用户管理',
      'PUT /api/admin/users/:userId - 编辑用户',
      'PUT /api/admin/users/:userId/password - 修改密码',
      'PUT /api/admin/users/:userId/toggle-status - 切换状态',
      'DELETE /api/admin/users/:userId - 删除用户',
      'GET /api/admin/points - 积分管理',
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
  console.log(`🔧 用户余额修复API: POST /api/fix-all-users`);
  console.log(`💾 连接到云端数据库`);
  console.log(`🌐 管理员API已启用`);
  console.log(`💰 提现系统已启用 - 所有用户都可以使用`);
});
