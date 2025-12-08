// backend/controllers/authController.js - 完全修复版
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 生成JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// 🔧 修复：用户注册 - 添加密码加密
const registerUser = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // 验证输入
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // 验证密码
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '两次输入的密码不一致'
      });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '请填写正确的邮箱格式'
      });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? '该邮箱已被注册' : '该用户名已被使用'
      });
    }

    // 🔧 修复：密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建新用户
    const newUser = new User({
      username,
      email,
      password: hashedPassword, // 🔧 使用加密密码
      level: 1,
      points: parseFloat(50).toFixed(2), // 🔧 确保精度
      experience: parseFloat(0).toFixed(2),
      cashBalance: parseFloat(0).toFixed(2),
      role: email === 'admin@example.com' ? 'admin' : 'user'
    });

    await newUser.save();

    // 生成token
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
          points: parseFloat(newUser.points).toFixed(2),
          experience: parseFloat(newUser.experience).toFixed(2),
          cashBalance: parseFloat(newUser.cashBalance).toFixed(2),
          role: newUser.role
        },
        token
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 🔧 修复：用户登录 - 改进密码验证
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔍 登录请求:', { email, hasPassword: !!password });

    // 验证输入
    if (!email || !password) {
      console.log('❌ 登录失败：缺少邮箱或密码');
      return res.status(400).json({
        success: false,
        message: '请填写邮箱和密码'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ 登录失败：邮箱格式不正确');
      return res.status(400).json({
        success: false,
        message: '请填写正确的邮箱格式'
      });
    }

    // 查找用户
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ 登录失败：用户不存在');
      return res.status(400).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 🔧 修复：使用bcrypt验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ 登录失败：密码错误');
      return res.status(400).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 生成token
    const token = generateToken(user._id);

    console.log('✅ 登录成功:', { email, userId: user._id });

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          level: user.level,
          points: parseFloat(user.points || 0).toFixed(2),
          experience: parseFloat(user.experience || 0).toFixed(2),
          cashBalance: parseFloat(user.cashBalance || 0).toFixed(2),
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 🔧 修复：获取当前用户信息 - 确保精度
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          level: user.level,
          points: parseFloat(user.points || 0).toFixed(2),
          experience: parseFloat(user.experience || 0).toFixed(2),
          cashBalance: parseFloat(user.cashBalance || 0).toFixed(2),
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};
