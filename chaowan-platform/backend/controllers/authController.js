// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose'); // ✅ 必须引入 mongoose
const Mail = require('../models/Mail');
const Transaction = require('../models/Transaction');

// 生成JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// 用户注册
const registerUser = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: '请填写所有必填字段' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: '两次输入的密码不一致' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6位' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: existingUser.email === email ? '该邮箱已被注册' : '该用户名已被使用' });
    }

    const newUser = new User({
      username,
      email,
      password,
      level: 1,
      points: 50,
      experience: 0,
      starcoin: 0, // ✅ 初始化星源币
      cashBalance: 0, // ✅ 初始化现金余额
      role: email === 'admin@example.com' ? 'admin' : 'user'
    });

    await newUser.save();
    const token = generateToken(newUser._id);

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
          starcoin: newUser.starcoin, // ✅ 返回星源币
          cashBalance: newUser.cashBalance, // ✅ 返回现金余额
          experience: newUser.experience,
          role: newUser.role
        },
        token
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 用户登录
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: '请填写邮箱和密码' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: '用户不存在' });
    }

    if (user.password !== password) {
      return res.status(400).json({ success: false, message: '密码错误' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          level: user.level,
          points: user.points,
          starcoin: user.starcoin, // ✅ 返回星源币
          cashBalance: user.cashBalance, // ✅ 返回现金余额
          experience: user.experience,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取当前用户信息
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password'); // ✅ 假设中间件挂载的是 req.user

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          level: user.level,
          points: user.points,
          starcoin: user.starcoin, // ✅ 确保返回星源币
          cashBalance: user.cashBalance, // ✅ 确保返回现金余额
          experience: user.experience,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 🔥 积分转增
const transferPoints = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { targetUserId, amount } = req.body;
    const senderId = req.user._id; 

    if (amount <= 0) throw new Error('转增金额必须大于0');

    const sender = await User.findById(senderId).session(session);
    const receiver = await User.findById(targetUserId).session(session);

    if (!receiver) throw new Error('目标用户不存在');
    if (sender._id.toString() === receiver._id.toString()) throw new Error('不能转增给自己');
    if (sender.points < amount) throw new Error('积分余额不足');

    const fee = Math.ceil(amount * 0.02); 
    const totalDeduct = amount + fee;

    sender.points -= totalDeduct;
    await sender.save({ session });

    const mail = new Mail({
      userId: targetUserId,
      title: '收到积分转增',
      type: 'transfer',
      content: `用户 ${sender.username || sender.email} 向您转赠了 ${amount} 积分。`,
      rewards: { points: amount },
      senderId: senderId
    });
    await mail.save({ session });

    const transaction = new Transaction({
      userId: senderId,
      type: 'transfer_out',
      amount: -totalDeduct,
      balance: sender.points,
      description: `转赠积分给用户 ${targetUserId} (含手续费 ${fee})`,
      currency: 'points'
    });
    await transaction.save({ session });

    await session.commitTransaction();
    res.json({ success: true, message: `转赠成功，扣除手续费 ${fee} 积分` });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// 🔥 修改密码
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId).select('+password');
    
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: '原密码错误' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: '密码修改成功，请重新登录' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔥 获取游戏统计数据
const getGameStats = async (req, res) => {
  try {
    const { gameType, period } = req.query; 
    const userId = req.user._id;

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day': startDate.setHours(0, 0, 0, 0); break;
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setHours(0, 0, 0, 0);
    }

    const betTypes = gameType === 'race' ? ['race_bet'] : ['mystery_bet'];
    const winTypes = gameType === 'race' ? ['race_win'] : ['mystery_win'];

    const betStats = await Transaction.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          type: { $in: betTypes },
          currency: 'points',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalBet: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 }
        }
      }
    ]);

    const winStats = await Transaction.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          type: { $in: winTypes },
          currency: 'points',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalWin: { $sum: '$amount' }
        }
      }
    ]);

    const totalBet = betStats[0]?.totalBet || 0;
    const totalWin = winStats[0]?.totalWin || 0;
    const profit = totalWin - totalBet;

    const details = await Transaction.find({
      userId,
      type: { $in: [...betTypes, ...winTypes] },
      currency: 'points',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      data: {
        totalBet,
        totalWin,
        profit,
        details
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔥 获取邮件列表
const getUserMails = async (req, res) => {
  try {
    const userId = req.user._id;
    const mails = await Mail.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: mails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔥 领取邮件奖励
const claimMail = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { mailId } = req.params;
    const userId = req.user._id;

    const mail = await Mail.findOne({ _id: mailId, userId }).session(session);
    if (!mail) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }

    if (mail.isClaimed) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: '奖励已领取' });
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('用户不存在');

    if (mail.rewards.points > 0) user.points += mail.rewards.points;
    if (mail.rewards.starcoin > 0) user.starcoin += mail.rewards.starcoin;
    if (mail.rewards.cash > 0) user.cashBalance += mail.rewards.cash;

    await user.save({ session });

    mail.isClaimed = true;
    mail.isRead = true;
    await mail.save({ session });

    const transaction = new Transaction({
      userId,
      type: 'mail_claim',
      amount: mail.rewards.points,
      balance: user.points,
      description: `邮件领取: ${mail.title}`,
      currency: 'points',
      metadata: {
        starcoin: mail.rewards.starcoin,
        cash: mail.rewards.cash
      }
    });
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({ 
      success: true, 
      message: '领取成功',
      data: {
        points: user.points,
        starcoin: user.starcoin,
        cashBalance: user.cashBalance
      }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ✅ 统一导出，避免 exports 混乱
module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  transferPoints,
  changePassword,
  getGameStats,
  getUserMails,
  claimMail
};
