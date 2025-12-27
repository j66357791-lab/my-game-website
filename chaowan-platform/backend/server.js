// backend/server.js - 完整修复版
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const mailRoutes = require('./routes/mail');

// 🔧 引入中间件 - 修正版
const { protect, admin } = require('./middleware/auth');

// 🔧 引入控制器
const { loginUser, registerUser, getCurrentUser } = require('./controllers/authController');

// 导入模型
const Doll = require('./models/Doll');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Withdrawal = require('./models/Withdrawal');
const VipCard = require('./models/VipCard');
const Boss = require('./models/Boss');
const BlindBoxActivity = require('./models/BlindBoxActivity');
const BlindBoxReward = require('./models/BlindBoxReward');
const MysteryCardGame = require('./models/MysteryCardGame');

// 导入路由
const dollRoutes = require('./routes/dolls');
const authRoutes = require('./routes/auth');
const blindBoxRoutes = require('./routes/blindBox');
const mysteryCardRoutes = require('./routes/mysteryCard');
const vipCardRoutes = require('./routes/vipCard');
const bossRoutes = require('./routes/boss');
const raceRoutes = require('./routes/race');
const adminRoutes = require('./routes/admin');
const refiningFactoryRoutes = require('./routes/refiningFactory');

// 导入WebSocket
const GameWebSocket = require('./websocket/gameWebSocket');

// 导入管理员控制器
const { 
  getMysteryCardConfig, 
  updateMysteryCardConfig, 
  getMysteryCardStats 
} = require('./controllers/adminController');

const app = express();
const server = http.createServer(app);

// 初始化WebSocket
const gameWebSocket = new GameWebSocket();
gameWebSocket.initialize(server);
gameWebSocket.startHeartbeat();

// 🔥 CORS配置 - 彻底解决跨域问题
app.use(cors({
  origin: [
    'https://chaowan-frontend.onrender.com', // 旧的前端域名
    'https://my-game-website-brown.vercel.app', // ✅ 新增：你的 Vercel 域名
    'https://tianchuang.onrender.com',        // 你的后端域名
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

// 挂载路由
app.use('/api/dolls', dollRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/blindBox', blindBoxRoutes);
app.use('/api/refining-factory', refiningFactoryRoutes);
app.use('/api/mystery-card', mysteryCardRoutes);
app.use('/api/vip-cards', vipCardRoutes);
app.use('/api/boss', bossRoutes);
app.use('/api/race', raceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mail', mailRoutes);

// ==================== 基础端点 ====================

app.get('/api/test-cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS测试成功',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API服务正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dollModel: Doll ? 'loaded' : 'not loaded',
    websocketConnections: gameWebSocket.clients.size,
    currentGamePhase: gameWebSocket.gameState.currentPhase,
    currentRound: gameWebSocket.gameState.roundNumber
  });
});

app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    version: '2.5.0',
    name: '潮玩虚拟生态平台API',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dollModel: Doll ? 'loaded' : 'not loaded',
    timestamp: new Date().toISOString(),
    websocketConnections: gameWebSocket.clients.size,
    gameStatus: {
      currentPhase: gameWebSocket.gameState.currentPhase,
      timeRemaining: gameWebSocket.gameState.timeRemaining,
      roundNumber: gameWebSocket.gameState.roundNumber,
      totalBets: gameWebSocket.getTotalBets()
    }
  });
});

// ==================== 数据库连接 ====================

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI 环境变量未定义');
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 云端数据库连接成功');
    console.log(`📊 连接到数据库: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

connectDB();

// ==================== 初始化函数 ====================

const CheckinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastCheckinDate: Date,
  streak: { type: Number, default: 0 },
  totalCheckins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Checkin = mongoose.model('Checkin', CheckinSchema);

const initializeTestUser = async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      const testUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: '123456',
        level: 1,
        points: 30,
        role: 'admin',
        cashBalance: 1000
      });
      await testUser.save();
      console.log('✅ 测试管理员创建成功 - 积分:30, 角色:admin, 余额:1000');
    } else if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('🔧 修复管理员角色成功');
    }
  } catch (error) {
    console.error('❌ 创建/修复测试用户失败:', error);
  }
};

const initializeBoss = async () => {
  try {
    const existingBoss = await Boss.findOne({ isActive: true });
    if (!existingBoss) {
      const boss = new Boss({
        name: '千羽',
        maxHp: 100000,
        currentHp: 100000,
        attack: 1000,
        defense: 50,
        rewardMin: 88.8,
        rewardMax: 188.8,
        isActive: true
      });
      await boss.save();
      console.log('✅ 初始Boss创建成功');
    } else {
      console.log('✅ 已存在活跃Boss:', existingBoss.name);
    }
  } catch (error) {
    console.error('❌ Boss初始化失败:', error);
  }
};

const initializeMysteryCard = async () => {
  try {
    const existingGame = await MysteryCardGame.findOne().sort({ roundNumber: -1 });
    if (!existingGame) {
      const initialGame = new MysteryCardGame({
        roundNumber: 1,
        lordCard: 5,
        generalsCards: { east: 3, south: 7, west: 2, north: 6 },
        results: { east: 'lose', south: 'win', west: 'lose', north: 'win' }
      });
      await initialGame.save();
      console.log('✅ 初始神秘卡牌游戏记录创建成功');
    } else {
      console.log('✅ 已存在神秘卡牌游戏记录，最新轮次:', existingGame.roundNumber);
      if (gameWebSocket && gameWebSocket.gameState) {
        gameWebSocket.gameState.roundNumber = existingGame.roundNumber + 1;
        console.log(`🔧 游戏轮次更新为: ${gameWebSocket.gameState.roundNumber}`);
      }
    }
  } catch (error) {
    if (error.code !== 11000) console.error('❌ 神秘卡牌初始化失败:', error);
    else {
      console.log('⚠️ 游戏记录已存在，跳过初始化');
      try {
        const latestGame = await MysteryCardGame.findOne().sort({ roundNumber: -1 });
        if (latestGame && gameWebSocket && gameWebSocket.gameState) {
          gameWebSocket.gameState.roundNumber = latestGame.roundNumber + 1;
          console.log(`🔧 重复键修复后轮次更新为: ${gameWebSocket.gameState.roundNumber}`);
        }
      } catch (syncError) {
        console.error('❌ 轮次同步失败:', syncError);
      }
    }
  }
};

mongoose.connection.once('open', () => {
  initializeTestUser();
  initializeBoss();
  initializeMysteryCard();
});

// ==================== 🔧 修复版：强制批量加密老用户密码 ====================
app.post('/api/auth/migrate-passwords-force', admin, async (req, res) => {
  try {
    console.log('🔧 [强制模式] 开始批量迁移用户密码...');
    
    // 引入 bcrypt（强制手动加密）
    const bcrypt = require('bcryptjs');
    
    // 获取所有用户（包含密码字段）
    const users = await User.find().select('+password');
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      // 检查密码是否已经是加密的
      if (user.password && !user.password.startsWith('$2')) {
        console.log(`🔄 强制加密用户: ${user.username} (${user.email})`);
        
        // 1. 手动生成盐值和哈希
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        // 2. 使用 updateOne 直接更新数据库（绕过 Model 的 save 钩子，防止二次加密）
        await User.updateOne(
          { _id: user._id }, 
          { password: hashedPassword }
        );
        
        migratedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`✅ [强制模式] 密码迁移完成！已加密: ${migratedCount} 个，已跳过: ${skippedCount} 个`);
    
    res.json({
      success: true,
      message: '密码迁移完成（强制模式）',
      data: {
        totalUsers: users.length,
        migratedCount,
        skippedCount
      }
    });
  } catch (error) {
    console.error('❌ [强制模式] 密码迁移失败:', error);
    res.status(500).json({
      success: false,
      message: '迁移失败',
      error: error.message
    });
  }
});


// ==================== 认证相关 ====================

app.post('/api/auth/register', registerUser);
app.post('/api/auth/login', loginUser);
app.get('/api/auth/user', protect, getCurrentUser);

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

// ==================== 神秘卡牌后台管控 ====================

app.get('/api/admin/mystery-card/config', admin, getMysteryCardConfig);
app.post('/api/admin/mystery-card/config', admin, updateMysteryCardConfig);
app.get('/api/admin/mystery-card/stats', admin, getMysteryCardStats);

// ==================== 签到系统 ====================

app.get('/api/checkin/status', protect, async (req, res) => {
  try {
    let checkin = await Checkin.findOne({ userId: req.user._id });
    if (!checkin) {
      checkin = new Checkin({ userId: req.user._id });
      await checkin.save();
    }
    
    const today = new Date().toDateString();
    const hasCheckedInToday = checkin.lastCheckinDate ? checkin.lastCheckinDate.toDateString() === today : false;
    const baseReward = 1;
    const levelBonus = Math.floor(req.user.level / 5);
    
    res.json({ 
      success: true, 
      data: {
        hasCheckedInToday,
        checkinStreak: checkin.streak,
        todayReward: baseReward + levelBonus,
        totalCheckins: checkin.totalCheckins,
        lastCheckinDate: checkin.lastCheckinDate
      }
    });
  } catch (error) {
    console.error('❌ 获取签到状态失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/checkin', protect, async (req, res) => {
  try {
    let checkin = await Checkin.findOne({ userId: req.user._id });
    if (!checkin) checkin = new Checkin({ userId: req.user._id });
    
    const today = new Date();
    const todayString = today.toDateString();
    
    if (checkin.lastCheckinDate && checkin.lastCheckinDate.toDateString() === todayString) {
      return res.status(400).json({ success: false, message: '今日已签到，请明天再来' });
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (checkin.lastCheckinDate && checkin.lastCheckinDate.toDateString() === yesterday.toDateString()) {
      checkin.streak += 1;
    } else {
      checkin.streak = 1;
    }
    
    const baseReward = 1;
    const levelBonus = Math.floor(req.user.level / 5);
    const totalReward = baseReward + levelBonus;
    
    checkin.lastCheckinDate = today;
    checkin.totalCheckins += 1;
    await checkin.save();
    
    const user = await User.findById(req.user._id);
    const oldPoints = user.points;
    const oldLevel = user.level;
    
    user.points += totalReward;
    user.experience += 5;
    
    const expNeeded = user.level * 50;
    if (user.experience >= expNeeded) {
      user.level += 1;
      user.experience -= expNeeded;
      
      const levelUpTransaction = new Transaction({
        userId: user._id,
        type: 'level_up',
        amount: 10,
        balance: user.points,
        description: `升级到Lv.${user.level}奖励`,
        metadata: { oldLevel, newLevel: user.level }
      });
      await levelUpTransaction.save();
    }
    
    await user.save();
    
    const checkinTransaction = new Transaction({
      userId: user._id,
      type: 'checkin',
      amount: totalReward,
      balance: user.points,
      description: `每日签到奖励 (连续${checkin.streak}天)`,
      metadata: { streak: checkin.streak }
    });
    await checkinTransaction.save();
    
    res.json({ 
      success: true, 
      message: '签到成功！',
      data: {
        reward: totalReward,
        checkinStreak: checkin.streak,
        userPoints: user.points,
        userLevel: user.level,
        userExperience: user.experience,
        levelUp: user.level > oldLevel
      }
    });
  } catch (error) {
    console.error('❌ 签到失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 积分历史 ====================

app.get('/api/points/history', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
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

// ==================== 现金交易 ====================

app.get('/api/transactions/cash', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ 
      userId: req.user._id,
      type: { $in: ['admin_cash_add', 'admin_cash_deduct'] }
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: { transactions }
    });
  } catch (error) {
    console.error('❌ 获取现金交易记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 提现系统 ====================

app.post('/api/withdrawal/create', protect, async (req, res) => {
  try {
    const { amount, alipayAccount, realName } = req.body;
    const user = await User.findById(req.user._id);

    if (amount < 1) {
      return res.status(400).json({ success: false, message: '提现金额不能小于1元' });
    }

    if (user.cashBalance < amount) {
      return res.status(400).json({ success: false, message: '余额不足' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayWithdrawals = await Withdrawal.find({
      userId: user._id,
      status: { $in: ['pending', 'approved'] },
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todayTotal = todayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const dailyLimit = user.withdrawalLimit?.daily || 500;

    if (todayTotal + amount > dailyLimit) {
      return res.status(400).json({ success: false, message: `超出每日提现限制 ¥${dailyLimit}` });
    }

    const withdrawal = new Withdrawal({
      userId: user._id,
      amount,
      alipayAccount,
      realName,
      frozenAmount: amount
    });

    await withdrawal.save();
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
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/withdrawal/my', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const withdrawals = await Withdrawal.find({ userId: req.user._id })
      .populate('userId', 'username email')
      .populate('processedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Withdrawal.countDocuments({ userId: req.user._id });

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
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ==================== 管理员接口 ====================

app.get('/api/admin/dashboard', admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const todayTransactions = await Transaction.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    const totalWithdrawals = await Withdrawal.countDocuments();
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const todayWithdrawals = await Withdrawal.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const totalMysteryCardGames = await MysteryCardGame.countDocuments();
    const todayMysteryCardGames = await MysteryCardGame.countDocuments({
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
      { $group: { _id: null, total: {$sum: { $abs: "$amount" } } } }
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
          todayWithdrawals,
          totalMysteryCardGames,
          todayMysteryCardGames,
          websocketConnections: gameWebSocket.clients.size
        },
        recentTransactions
      }
    });
  } catch (error) {
    console.error('❌ 获取仪表板数据失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

app.get('/api/admin/users', admin, async (req, res) => {
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

app.put('/api/admin/users/:userId', admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, level, points, cashBalance, role, disabled, starcoin } = req.body;
    
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
    if (starcoin !== undefined) updateData.starcoin = starcoin;
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

app.put('/api/admin/users/:userId/password', admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度不能少于6位' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 直接赋值，模型的 pre('save') 钩子会自动加密
    user.password = newPassword;
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

app.put('/api/admin/users/:userId/toggle-status', admin, async (req, res) => {
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

app.delete('/api/admin/users/:userId', admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    await Checkin.deleteMany({ userId });
    await Transaction.deleteMany({ userId });
    await Withdrawal.deleteMany({ userId });
    await Doll.deleteMany({ userId });
    await BlindBoxActivity.deleteMany({ userId });
    await BlindBoxReward.deleteMany({ userId });
    
    console.log(`🗑️ 管理员删除用户: ${user.username}`);
    
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('❌ 删除用户失败:', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

app.post('/api/admin/points/adjust', admin, async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const oldPoints = user.points;
    user.points = Math.max(0, user.points + amount);
    await user.save();

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
    res.status(500).json({ success: false, message: '调整积分失败' });
  }
});

app.post('/api/admin/cash/adjust', admin, async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const oldCash = user.cashBalance;
    user.cashBalance = Math.max(0, user.cashBalance + amount);
    await user.save();

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
    res.status(500).json({ success: false, message: '调整余额失败' });
  }
});

app.get('/api/admin/withdrawals', admin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const withdrawals = await Withdrawal.find(filter)
      .populate('userId', 'username email')
      .populate('processedBy', 'username')
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
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.put('/api/admin/withdrawals/:id/process', admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remark } = req.body;
    const adminId = req.adminUser._id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: '无效的操作' });
    }

    const withdrawal = await Withdrawal.findById(id).populate('userId');
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: '提现申请不存在' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该申请已被处理' });
    }

    withdrawal.status = action === 'approve' ? 'approved' : 'rejected';
    withdrawal.remark = remark || '';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = adminId;

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
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

app.post('/api/admin/withdrawals/batch-process', admin, async (req, res) => {
  try {
    const { withdrawalIds, action, remark } = req.body;
    const adminId = req.adminUser._id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: '无效的操作' });
    }

    if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要处理的申请' });
    }

    const withdrawals = await Withdrawal.find({
      _id: { $in: withdrawalIds },
      status: 'pending'
    }).populate('userId');

    if (withdrawals.length === 0) {
      return res.status(400).json({ success: false, message: '没有可处理的申请' });
    }

    const processedWithdrawals = [];
    
    for (const withdrawal of withdrawals) {
      withdrawal.status = action === 'approve' ? 'approved' : 'rejected';
      withdrawal.remark = remark || '';
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = adminId;

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
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

app.get('/api/admin/transactions', admin, async (req, res) => {
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

app.get('/api/admin/analytics', admin, async (req, res) => {
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
    
    const levelDistribution = await User.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
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

    const mysteryCardStats = await MysteryCardGame.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          totalBets: { $sum: '$totalBets' },
          totalWins: { $sum: '$totalWins' },
          totalLosses: { $sum: '$totalLosses' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        userRegistrationTrend,
        transactionTrend,
        levelDistribution,
        pointsDistribution,
        transactionTypeStats,
        mysteryCardStats: mysteryCardStats[0] || {
          totalGames: 0,
          totalBets: 0,
          totalWins: 0,
          totalLosses: 0
        },
        period
      }
    });
  } catch (error) {
    console.error('❌ 获取分析数据失败:', error);
    res.status(500).json({ success: false, message: '获取分析数据失败' });
  }
});

// ==================== 根路径 ====================

app.get('/', (req, res) => {
  res.json({ 
    message: '🎮 潮玩虚拟生态平台API服务正在运行',
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Atlas (云端)',
    version: '2.5.0 - 新增神秘卡牌实时对战 + 管理员游戏管控',
    admin_accounts: [
      'admin@example.com / 123456',
      'admin@18679012034.com / hjh628727'
    ],
    features: [
      '✅ 完整的娃娃购买系统',
      '✅ 娃娃回收功能',
      '✅ 用户余额管理',
      '✅ 批量提现处理',
      '✅ 移动端优化',
      '✅ 管理员权限控制',
      '✅ CORS测试端点',
      '🎁 盲盒天天乐活动',
      '💎 VIP卡系统',
      '⚔️ Boss挑战系统',
      '🐢🐰 龟兔赛跑游戏',
      '🎴 神秘卡牌实时对战',
      '🎛️ 管理员游戏管控'
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
      'POST /api/dolls/purchase - 购买娃娃',
      'GET /api/dolls/my - 我的娃娃',
      'POST /api/dolls/:dollId/recycle - 回收娃娃',
      'GET /api/transactions/cash - 现金交易',
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
      'GET /api/admin/analytics - 数据分析',
      'GET /api/blindBox/activity - 盲盒活动数据',
      'POST /api/blindBox/single-draw - 盲盒单抽',
      'POST /api/blindBox/ten-draw - 盲盒十连抽',
      'POST /api/blindBox/exchange - 兑换奖励',
      'GET /api/blindBox/exchange-history - 兑换记录',
      'GET /api/refining-factory - 炼化工厂数据',
      'POST /api/refining-factory/input - 投入汉字',
      'POST /api/refining-factory/withdraw - 取出汉字',
      'POST /api/refining-factory/claim - 领取积分',
      'GET /api/refining-factory/history - 炼化历史',
      'GET /api/vip-cards/status - VIP状态',
      'POST /api/vip-cards/purchase - 购买VIP卡',
      'POST /api/vip-cards/claim-daily-starcoin - 领取每日星源币',
      'GET /api/boss/status - Boss状态',
      'POST /api/boss/challenge - 挑战Boss',
      'POST /api/boss/attack - 攻击Boss',
      'GET /api/race/recent - 获取最近赛跑结果',
      'POST /api/race/start - 开始赛跑游戏',
      'GET /api/race/history - 获取用户赛跑历史',
      'GET /api/mystery-card/history - 获取游戏历史',
      'GET /api/mystery-card/user-history - 获取用户游戏历史',
      'GET /api/admin/mystery-card/config - 获取游戏控制配置',
      'POST /api/admin/mystery-card/config - 更新游戏控制配置',
      'GET /api/admin/mystery-card/stats - 获取财务统计数据',
      '🔌 WebSocket连接: wss://tianchuang.onrender.com/?token=your_jwt_token'
    ]
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API端点不存在',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 API服务器运行在端口 ${PORT}`);
  console.log(`🔐 默认管理员: admin@example.com / 123456`);
  console.log(`🔐 私密管理员: admin@18679012034.com / hjh628727`);
  console.log(`🔧 权限修复API: POST /api/fix-admin`);
  console.log(`🔧 CORS测试API: GET /api/test-cors`);
  console.log(`💾 连接到云端数据库`);
  console.log(`🌐 管理员API已启用`);
  console.log(`💰 提现审批系统已启用`);
  console.log(`🧸 娃娃购买系统已启用`);
  console.log(`🎁 盲盒天天乐活动已启用`);
  console.log(`💎 VIP卡系统已启用`);
  console.log(`⚔️ Boss挑战系统已启用`);
  console.log(`🐢🐰 龟兔赛跑游戏已启用`);
  console.log(`🎴 神秘卡牌实时对战已启用`);
  console.log(`🎛️ 管理员游戏管控已启用`);
  console.log(`🔌 WebSocket服务器已启动`);
  console.log(`🔍 Doll模型状态:`, Doll ? '已加载' : '未加载');
  console.log(`🎮 当前游戏状态: ${gameWebSocket.gameState.currentPhase}`);
  console.log(`🔢 当前轮次: ${gameWebSocket.gameState.roundNumber}`);
});

module.exports = { app, server };
