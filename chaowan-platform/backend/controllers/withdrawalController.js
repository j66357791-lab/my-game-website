const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// 用户申请提现
const createWithdrawal = async (req, res) => {
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

    res.status(201).json({
      success: true,
      message: '提现申请已提交，等待审核',
      data: { withdrawal }
    });

  } catch (error) {
    console.error('创建提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 获取用户提现记录
const getUserWithdrawals = async (req, res) => {
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
    console.error('获取提现记录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 管理员获取所有提现申请
const getAllWithdrawals = async (req, res) => {
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
    console.error('获取提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 管理员处理提现申请
const processWithdrawal = async (req, res) => {
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
      user.cashBalance += withdrawal.frozenAmount;
      await user.save();
    }

    await withdrawal.save();

    res.json({
      success: true,
      message: `提现申请已${action === 'approve' ? '批准' : '拒绝'}`,
      data: { withdrawal }
    });

  } catch (error) {
    console.error('处理提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

// 批量处理提现申请
const batchProcessWithdrawals = async (req, res) => {
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
        user.cashBalance += withdrawal.frozenAmount;
        await user.save();
      }

      await withdrawal.save();
    }

    res.json({
      success: true,
      message: `已批量${action === 'approve' ? '批准' : '拒绝'} ${withdrawals.length} 个申请`,
      data: { processedCount: withdrawals.length }
    });

  } catch (error) {
    console.error('批量处理提现申请失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

module.exports = {
  createWithdrawal,
  getUserWithdrawals,
  getAllWithdrawals,
  processWithdrawal,
  batchProcessWithdrawals
};
