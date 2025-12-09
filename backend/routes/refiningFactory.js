// backend/routes/refiningFactory.js - 修复炼化速度计算
const express = require('express');
const jwt = require('jsonwebtoken');
const RefiningFactory = require('../models/RefiningFactory');
const User = require('../models/User');
const BlindBoxActivity = require('../models/BlindBoxActivity');

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

// 🔧 修复：计算炼化速度（返回秒数）
const calculateRefiningSpeedInSeconds = (totalChars) => {
  if (!totalChars || totalChars === 0) {
    return 24 * 60 * 60; // 24小时 = 86400秒
  }
  
  let speedHours = 24;
  
  // 每500个字符，炼化速度减半
  const speedReductions = Math.floor(totalChars / 500);
  for (let i = 0; i < speedReductions; i++) {
    speedHours = speedHours / 2;
  }
  
  // 转换为秒数
  let speedSeconds = speedHours * 60 * 60;
  
  // 🔧 关键修复：最少1秒
  if (speedSeconds < 1) {
    speedSeconds = 1;
  }
  
  return Math.round(speedSeconds);
};

// 🔧 新增：格式化时间显示
const formatTime = (seconds) => {
  if (seconds >= 60 * 60) {
    // 小时显示
    const hours = seconds / (60 * 60);
    return {
      value: hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10,
      unit: '小时'
    };
  } else if (seconds >= 60) {
    // 分钟显示
    const minutes = seconds / 60;
    return {
      value: minutes >= 10 ? Math.round(minutes) : Math.round(minutes * 10) / 10,
      unit: '分钟'
    };
  } else {
    // 秒显示
    return {
      value: seconds,
      unit: '秒'
    };
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

    // 🔧 修复：计算剩余时间（使用动态炼化速度）
    let remainingTime = 0;
    if (factory.status === 'active' && factory.refiningStartTime) {
      const speedSeconds = calculateRefiningSpeedInSeconds(factory.totalChars);
      const elapsed = Date.now() - factory.refiningStartTime.getTime();
      const totalTime = factory.inputChars.length * speedSeconds * 1000;
      remainingTime = Math.max(0, (totalTime - elapsed) / 1000);
      
      if (remainingTime === 0) {
        factory.status = 'completed';
        factory.refinedChars = factory.inputChars.length;
        factory.refinedPoints = factory.inputChars.length * 10; // 每个汉字10积分
        await factory.save();
        console.log('✅ 炼化完成，可领取积分');
      }
    }

    // 🔧 修复：格式化炼化速度显示
    const speedSeconds = calculateRefiningSpeedInSeconds(factory.totalChars);
    const speedDisplay = formatTime(speedSeconds);

    res.json({
      success: true,
      data: {
        ...factory.toObject(),
        remainingTime,
        refiningSpeed: speedSeconds, // 原始秒数
        speedDisplay // 格式化显示对象 {value, unit}
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

    // 🔧 修复：检查用户背包是否有足够的字符
    const blindBoxActivity = await BlindBoxActivity.findOne({ userId: req.user._id });
    if (!blindBoxActivity) {
      return res.status(400).json({ success: false, message: '未找到字符背包数据' });
    }

    // 检查背包中的字符数量
    const backpackCharCounts = {};
    blindBoxActivity.collectedChars.forEach(char => {
      backpackCharCounts[char] = (backpackCharCounts[char] || 0) + 1;
    });

    // 检查要投入的字符是否足够
    const inputCharCounts = {};
    chars.forEach(char => {
      inputCharCounts[char] = (inputCharCounts[char] || 0) + 1;
    });

    for (const [char, count] of Object.entries(inputCharCounts)) {
      if ((backpackCharCounts[char] || 0) < count) {
        return res.status(400).json({ 
          success: false, 
          message: `字符"${char}"不足，需要${count}个，但只有${backpackCharCounts[char] || 0}个` 
        });
      }
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

    // 🔧 修复：从背包中移除投入的字符
    chars.forEach(char => {
      const index = blindBoxActivity.collectedChars.indexOf(char);
      if (index > -1) {
        blindBoxActivity.collectedChars.splice(index, 1);
      }
    });
    await blindBoxActivity.save();

    // 添加汉字到炼化工厂
    factory.inputChars.push(...chars);
    factory.totalChars += chars.length;
    
    // 如果当前是空闲状态，开始炼化
    if (factory.status === 'idle' && factory.inputChars.length > 0) {
      factory.status = 'active';
      factory.refiningStartTime = new Date();
    }

    await factory.save();

    // 🔧 修复：格式化炼化速度显示
    const speedSeconds = calculateRefiningSpeedInSeconds(factory.totalChars);
    const speedDisplay = formatTime(speedSeconds);

    console.log(`✅ 用户投入汉字成功: ${req.user.username}, 汉字: ${chars.join(', ')}`);

    res.json({
      success: true,
      message: '投入成功',
      data: {
        inputChars: factory.inputChars,
        totalChars: factory.totalChars,
        status: factory.status,
        refiningSpeed: speedSeconds, // 原始秒数
        speedDisplay // 格式化显示对象
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

    // 🔧 修复：将取出的字符添加回背包
    let blindBoxActivity = await BlindBoxActivity.findOne({ userId: req.user._id });
    if (!blindBoxActivity) {
      blindBoxActivity = new BlindBoxActivity({ userId: req.user._id });
    }
    
    blindBoxActivity.collectedChars.push(...withdrawnChars);
    await blindBoxActivity.save();

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
