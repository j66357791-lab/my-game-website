// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? '该邮箱已被注册' : '该用户名已被使用'
      });
    }

    const isAdminEmail = [
      'admin@example.com',
      'admin@18679012034.com'
    ].includes(email);

    // 密码会在 model 的 pre('save') 中自动加密
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
          experience: newUser.experience,
          role: newUser.role
        },
        token
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写邮箱和密码'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 🔒 使用加密比对
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: '密码错误'
      });
    }

    user.lastLogin = new Date();
    await user.save();

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
          experience: user.experience,
          role: user.role,
          cashBalance: user.cashBalance,
          starcoin: user.starcoin
        },
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 🔥 修复：添加 starcoin 字段
    res.status(200).json({
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
          starcoin: user.starcoin // 🔥 添加这一行
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};
