// backend/controllers/adminController.js
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const MysteryCardGame = require('../models/MysteryCardGame');
const MysteryCardBet = require('../models/MysteryCardBet');
const SystemConfig = require('../models/SystemConfig');

// ==================== 用户管理 ====================

// 获取所有用户
exports.getAllUsers = async (req, res) => {
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
};

// 更新用户信息
exports.updateUser = async (req, res) => {
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
};

// 修改用户密码
exports.updateUserPassword = async (req, res) => {
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
};

// 切换用户状态
exports.toggleUserStatus = async (req, res) => {
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
};

// 删除用户
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 这里可以添加级联删除其他关联数据的逻辑
    // await Transaction.deleteMany({ userId });
    
    console.log(`🗑️ 管理员删除用户: ${user.username}`);
    
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('❌ 删除用户失败:', error);
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
};

// ==================== 积分与资金 ====================

// 调整用户积分
exports.adjustUserPoints = async (req, res) => {
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
};

// 调整用户余额
exports.adjustUserCash = async (req, res) => {
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
    res.status(500).json({ success: false, message: '调整余额失败' });
  }
};

// ==================== 提现管理 ====================

// 获取所有提现申请
exports.getAllWithdrawals = async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 处理提现申请
exports.processWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remark } = req.body; // action: 'approve' or 'reject'
    const adminId = req.adminUser._id;

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
};

// 批量处理提现申请
exports.batchProcessWithdrawals = async (req, res) => {
  try {
    const { withdrawalIds, action, remark } = req.body;
    const adminId = req.adminUser._id;

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
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// ==================== 神秘卡牌管控 ====================

// 获取游戏控制配置
exports.getMysteryCardConfig = async (req, res) => {
  try {
    let config = await SystemConfig.findOne({ key: 'mystery_card_config' });
    
    const defaultConfig = {
      mode: 'RANDOM',
      fixedLordValue: 5,
      autoControl: {
        enabled: false,
        threshold: 2000
      }
    };

    if (config) {
      return res.json({ success: true, data: config.value });
    }
    
    return res.json({ success: true, data: defaultConfig });

  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
};

// 更新游戏控制配置
exports.updateMysteryCardConfig = async (req, res) => {
  try {
    const { mode, fixedLordValue, autoControl } = req.body;
    
    const configData = {
      mode,
      fixedLordValue,
      autoControl: autoControl || { enabled: false, threshold: 2000 }
    };

    // 更新游戏配置
    await SystemConfig.findOneAndUpdate(
      { key: 'mystery_card_config' },
      { value: configData, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    // 同时更新自动控制的阈值配置
    await SystemConfig.findOneAndUpdate(
      { key: 'mystery_card_auto_control' },
      { value: { enabled: autoControl?.enabled || false, threshold: autoControl?.threshold || 2000 }, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    console.log(`🔧 管理员更新游戏配置:`, configData);

    res.json({ success: true, message: '配置已更新', data: configData });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
};

// 获取真实的游戏统计数据
exports.getMysteryCardStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    let startDate = new Date();
    
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    }

    const games = await MysteryCardGame.find({
      createdAt: { $gte: startDate }
    }).sort({ roundNumber: -1 });

    let totalFlow = 0;
    let totalPayout = 0;
    let netProfit = 0;

    games.forEach(game => {
      totalFlow += game.totalBets || 0;
      totalPayout += game.totalWins || 0;
    });

    netProfit = totalFlow - totalPayout;

    const history = games.map(game => ({
      roundNumber: game.roundNumber,
      lordCard: game.lordCard,
      generalsCards: game.generalsCards,
      results: game.results,
      totalBets: game.totalBets,
      totalWins: game.totalWins
    }));

    const roundDetails = games.map(game => ({
      roundNumber: game.roundNumber,
      createdAt: game.createdAt,
      lordCard: game.lordCard,
      totalBets: game.totalBets,
      totalWins: game.totalWins,
      income: (game.totalBets || 0) - (game.totalWins || 0)
    }));

    res.json({
      success: true,
      data: {
        period,
        stats: {
          totalFlow,
          totalPayout,
          netProfit,
          totalRounds: games.length
        },
        history: history.reverse().slice(0, 30),
        roundDetails: roundDetails.slice(0, 20)
      }
    });

  } catch (error) {
    console.error('获取游戏统计失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
};

// 智能防亏检查逻辑
exports.checkAutoBalanceControl = async () => {
  try {
    let config = await SystemConfig.findOne({ key: 'mystery_card_auto_control' });
    
    let threshold = 2000;
    let enabled = false;

    if (config && config.value) {
      threshold = config.value.threshold || 2000;
      enabled = config.value.enabled || false;
    }

    if (!enabled) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayGames = await MysteryCardGame.find({ createdAt: { $gte: today } });
    let todayFlow = 0;
    let todayPayout = 0;

    todayGames.forEach(game => {
      todayFlow += game.totalBets || 0;
      todayPayout += game.totalWins || 0;
    });

    const todayNetProfit = todayFlow - todayPayout;

    console.log(`🤖 智能防亏检查: 今日流水=${todayFlow}, 派发=${todayPayout}, 净赚=${todayNetProfit}, 阈值=${threshold}`);

    if (todayNetProfit < -threshold) {
      const highCards = [8, 9, 10];
      const randomHighCard = highCards[Math.floor(Math.random() * highCards.length)];
      
      console.log(`⚠️ 触发智能防亏模式！强制领主点数为 ${randomHighCard}`);
      
      return {
        mode: 'FIXED',
        fixedLordValue: randomHighCard,
        reason: 'Auto-Balance: Loss exceeded threshold'
      };
    }

    return null;

  } catch (error) {
    console.error('智能防亏检查失败:', error);
    return null;
  }
};

// ==================== 仪表盘 ====================

exports.getDashboardData = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const todayTransactions = await Transaction.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    const totalWithdrawals = await Withdrawal.countDocuments();
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    
    const totalPointsInSystem = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$points" } } }
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
          totalWithdrawals,
          pendingWithdrawals
        },
        recentTransactions
      }
    });
  } catch (error) {
    console.error('❌ 获取仪表板数据失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
};
