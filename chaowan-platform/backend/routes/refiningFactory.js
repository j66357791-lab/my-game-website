// backend/routes/refiningFactory.js - 修复版本
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefiningFactory = require('../models/RefiningFactory'); // 🔧 使用独立模型

const router = express.Router();

// 认证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(401).json({ success: false, message: '无效的token' });
  }
};

// 获取炼化工厂数据
router.get('/data', authMiddleware, async (req, res) => {
  try {
    console.log('🔥 获取炼化工厂数据 - 用户ID:', req.user._id);
    
    let factory = await RefiningFactory.findOne({ userId: req.user._id });
    
    if (!factory) {
      factory = new RefiningFactory({
        userId: req.user._id,
        inputChars: [],
        totalChars: 0,
        refinedPoints: 0,
        status: 'idle'
      });
      await factory.save();
      console.log('✅ 创建新炼化工厂记录');
    }

    // 计算剩余时间
    let remainingTime = 0;
    if (factory.status === 'active' && factory.refiningStartTime) {
      const elapsed = Date.now() - factory.refiningStartTime.getTime();
      const totalTime = factory.inputChars.length * factory.refiningDuration * 60 * 60 * 1000;
      remainingTime = Math.max(0, (totalTime - elapsed) / (60 * 60 * 1000));
      
      if (remainingTime === 0) {
        factory.status = 'completed';
        factory.refinedChars = factory.inputChars.length;
        factory.refinedPoints = factory.inputChars.length * 10; // 每个汉字10积分
        await factory.save();
        console.log('✅ 炼化完成，可领取积分');
      }
    }

    res.json({
      success: true,
      data: {
        ...factory.toObject(),
        remainingTime
      }
    });
  } catch (error) {
    console.error('获取炼化工厂数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 投入汉字
router.post('/input', authMiddleware, async (req, res) => {
  try {
    console.log('🔥 投入汉字请求 - 用户ID:', req.user._id, '请求数据:', req.body);
    
    const { chars } = req.body;
    
    if (!chars || !Array.isArray(chars) || chars.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要投入的汉字' });
    }

    let factory = await RefiningFactory.findOne({ userId: req.user._id });
    
    if (!factory) {
      factory = new RefiningFactory({
        userId: req.user._id,
        inputChars: [],
        totalChars: 0,
        refinedPoints: 0,
        status: 'idle'
      });
    }

    // 添加汉字到炼化工厂
    factory.inputChars.push(...chars);
    factory.totalChars += chars.length;
    
    // 如果当前是空闲状态，开始炼化
    if (factory.status === 'idle' && factory.inputChars.length > 0) {
      factory.status = 'active';
      factory.refiningStartTime = new Date();
    }

    await factory.save();

    console.log(`✅ 用户投入汉字成功: ${req.user.username}, 汉字: ${chars.join(', ')}`);

    res.json({
      success: true,
      message: '投入成功',
      data: {
        inputChars: factory.inputChars,
        totalChars: factory.totalChars,
        status: factory.status
      }
    });
  } catch (error) {
    console.error('投入汉字失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 取出汉字
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    console.log('🔥 取出汉字请求 - 用户ID:', req.user._id);
    
    let factory = await RefiningFactory.findOne({ userId: req.user._id });
    
    if (!factory || factory.inputChars.length === 0) {
      return res.status(400).json({ success: false, message: '没有可取出的汉字' });
    }

    // 计算手续费（5%）
    const fee = Math.ceil(factory.inputChars.length * 0.05);
    const withdrawCount = factory.inputChars.length - fee;
    const withdrawnChars = factory.inputChars.slice(0, withdrawCount);

    // 清空炼化工厂
    factory.inputChars = [];
    factory.status = 'idle';
    factory.refiningStartTime = null;
    await factory.save();

    console.log(`✅ 用户取出汉字成功: ${req.user.username}, 取出: ${withdrawnChars.length}个, 手续费: ${fee}个`);

    res.json({
      success: true,
      message: '取出成功',
      data: {
        withdrawnChars,
        fee,
        totalWithdrawn: withdrawCount
      }
    });
  } catch (error) {
    console.error('取出汉字失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 领取积分
router.post('/claim', authMiddleware, async (req, res) => {
  try {
    console.log('🔥 领取积分请求 - 用户ID:', req.user._id);
    
    let factory = await RefiningFactory.findOne({ userId: req.user._id });
    
    if (!factory || factory.status !== 'completed' || factory.refinedPoints === 0) {
      return res.status(400).json({ success: false, message: '没有可领取的积分' });
    }

    const points = factory.refinedPoints;
    
    // 更新用户积分
    req.user.points += points;
    await req.user.save();

    // 重置炼化工厂
    factory.refinedPoints = 0;
    factory.refinedChars = 0;
    factory.status = 'idle';
    factory.refiningStartTime = null;
    await factory.save();

    console.log(`✅ 用户领取积分成功: ${req.user.username}, 积分: ${points}`);

    res.json({
      success: true,
      message: '领取成功',
      data: {
        points,
        newPoints: req.user.points
      }
    });
  } catch (error) {
    console.error('领取积分失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 获取炼化历史
router.get('/history', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        history: []
      }
    });
  } catch (error) {
    console.error('获取炼化历史失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

module.exports = router;
