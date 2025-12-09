// backend/routes/refiningFactory.js - 修复速度计算逻辑
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

// 🔧 修复：基于当前熔炉中的字符数量计算速度 T = 12000 / (I + 500)
const calculateRefiningSpeedInSeconds = (currentChars) => {
  // I 是当前在熔炉中的字符数量，T 是每个字符的炼化时间（小时）
  const timeInHours = 12000 / (currentChars + 500);
  // 转换为秒数
  const timeInSeconds = timeInHours * 60 * 60;
  // 最少1秒
  return Math.max(1, Math.round(timeInSeconds));
};

// 🔧 新增：格式化时间显示
const formatTime = (seconds) => {
  if (seconds >= 60 * 60) {
    // 小时显示
    const hours = seconds / (60 * 60);
    return {
      value: hours >= 10 ? Math.round(hours) : Math.round(hours * 1000) / 1000,
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

// 🔧 新增：处理炼化进度和积分发放
const processRefiningProgress = async (factory, userId) => {
  if (factory.status !== 'active' || !factory.refiningStartTime) {
    return factory;
  }

  // 🔧 修复：基于当前熔炉中的字符数量计算速度
  const speedSeconds = calculateRefiningSpeedInSeconds(factory.currentChars);
  const elapsed = Date.now() - factory.refiningStartTime.getTime();
  
  let newlyRefinedChars = 0;
  let pointsToAward = 0;
  
  // 计算应该已经炼化完成的字符数量
  for (let i = factory.refinedChars; i < factory.inputChars.length; i++) {
    const charTime = (i + 1) * speedSeconds * 1000; // 第i+1个字符的完成时间
    if (elapsed >= charTime) {
      newlyRefinedChars++;
      pointsToAward += 10; // 每个字符10积分
    } else {
      break; // 后面的字符还没完成
    }
  }

  // 如果有新完成的字符，发放积分
  if (newlyRefinedChars > 0) {
    factory.refinedChars += newlyRefinedChars;
    factory.refinedPoints += pointsToAward;
    
    // 立即将积分发放给用户
    const user = await User.findById(userId);
    user.points += pointsToAward;
    await user.save();
    
    console.log(`🎯 用户 ${user.username} 炼化完成 ${newlyRefinedChars} 个字符，获得 ${pointsToAward} 积分`);
  }

  // 检查是否所有字符都炼化完成
  if (factory.refinedChars >= factory.inputChars.length) {
    factory.status = 'completed';
  }

  return factory;
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
        currentChars: 0,
        refinedChars: 0,
        refinedPoints: 0,
        status: 'idle'
      });
      await factory.save();
      console.log('✅ 创建新炼化工厂记录');
    }

    // 🔧 更新：处理炼化进度和积分发放
    if (factory.status === 'active') {
      factory = await processRefiningProgress(factory, req.user._id);
      await factory.save();
    }

    // 🔧 修复：计算剩余时间（显示下一个字符的剩余时间）
    let remainingTime = 0;
    if (factory.status === 'active' && factory.refiningStartTime) {
      // 🔧 修复：基于当前熔炉中的字符数量计算速度
      const speedSeconds = calculateRefiningSpeedInSeconds(factory.currentChars);
      const elapsed = Date.now() - factory.refiningStartTime.getTime();
      
      if (factory.refinedChars < factory.inputChars.length) {
        // 计算下一个字符的剩余时间
        const nextCharIndex = factory.refinedChars;
        const nextCharTime = (nextCharIndex + 1) * speedSeconds * 1000;
        remainingTime = Math.max(0, (nextCharTime - elapsed) / 1000);
      }
    }

    // 🔧 修复：格式化炼化速度显示
    const speedSeconds = calculateRefiningSpeedInSeconds(factory.currentChars);
    const speedDisplay = formatTime(speedSeconds);

    // 🔧 新增：计算待领取积分
    const pendingPoints = factory.refinedPoints;

    res.json({
      success: true,
      data: {
        ...factory.toObject(),
        remainingTime,
        refiningSpeed: speedSeconds, // 原始秒数
        speedDisplay, // 格式化显示对象 {value, unit}
        pendingPoints // 待领取积分
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
        currentChars: 0,
        refinedChars: 0,
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

    // 🔧 修复：记录当前速度变化
    const oldCurrentChars = factory.currentChars;
    const oldSpeed = calculateRefiningSpeedInSeconds(oldCurrentChars);

    // 添加汉字到炼化工厂
    factory.inputChars.push(...chars);
    factory.totalChars += chars.length;
    factory.currentChars += chars.length; // 🔧 新增：更新当前字符数量
    
    // 如果当前是空闲状态，开始炼化
    if (factory.status === 'idle' && factory.inputChars.length > 0) {
      factory.status = 'active';
      factory.refiningStartTime = new Date();
    } else if (factory.status === 'active') {
      // 🔧 更新：如果已经在炼化中，需要重新计算时间
      // 先处理当前进度
      factory = await processRefiningProgress(factory, req.user._id);
    }

    await factory.save();

    // 🔧 修复：格式化炼化速度显示
    const speedSeconds = calculateRefiningSpeedInSeconds(factory.currentChars);
    const speedDisplay = formatTime(speedSeconds);

    console.log(`✅ 用户投入汉字成功: ${req.user.username}, 汉字: ${chars.join(', ')}`);

    res.json({
      success: true,
      message: '投入成功',
      data: {
        inputChars: factory.inputChars,
        totalChars: factory.totalChars,
        currentChars: factory.currentChars, // 🔧 新增：返回当前字符数量
        status: factory.status,
        refiningSpeed: speedSeconds, // 原始秒数
        speedDisplay, // 格式化显示对象
        oldSpeed: oldCurrentChars > 0 ? oldSpeed : null,
        newSpeed: speedSeconds
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

    // 🔧 更新：先处理当前炼化进度
    if (factory.status === 'active') {
      factory = await processRefiningProgress(factory, req.user._id);
    }

    // 🔧 修复：记录当前速度变化
    const oldCurrentChars = factory.currentChars;
    const oldSpeed = calculateRefiningSpeedInSeconds(oldCurrentChars);

    // 计算可取出的字符（未炼化的）
    const unrefinedChars = factory.inputChars.length - factory.refinedChars;
    const fee = Math.ceil(unrefinedChars * 0.05);
    const withdrawCount = unrefinedChars - fee;
    
    // 只取出未炼化的字符
    const withdrawnChars = factory.inputChars.slice(factory.refinedChars, factory.refinedChars + withdrawCount);

    // 🔧 修复：将取出的字符添加回背包
    let blindBoxActivity = await BlindBoxActivity.findOne({ userId: req.user._id });
    if (!blindBoxActivity) {
      blindBoxActivity = new BlindBoxActivity({ userId: req.user._id });
    }
    
    blindBoxActivity.collectedChars.push(...withdrawnChars);
    await blindBoxActivity.save();

    // 🔧 修复：更新当前字符数量
    factory.currentChars -= withdrawCount;

    // 更新炼化工厂状态
    if (factory.refinedChars >= factory.inputChars.length) {
      // 所有字符都已炼化完成
      factory.inputChars = [];
      factory.currentChars = 0;
      factory.status = 'idle';
      factory.refiningStartTime = null;
    } else {
      // 只保留已炼化的字符
      factory.inputChars = factory.inputChars.slice(0, factory.refinedChars);
    }
    
    await factory.save();

    // 🔧 修复：计算新速度
    const newSpeed = calculateRefiningSpeedInSeconds(factory.currentChars);

    console.log(`✅ 用户取出汉字成功: ${req.user.username}, 取出: ${withdrawnChars.length}个, 手续费: ${fee}个`);

    res.json({
      success: true,
      message: '取出成功',
      data: {
        withdrawnChars,
        fee,
        totalWithdrawn: withdrawCount,
        refinedChars: factory.refinedChars,
        remainingChars: factory.inputChars.length,
        currentChars: factory.currentChars, // 🔧 新增：返回当前字符数量
        oldSpeed: oldSpeed,
        newSpeed: newSpeed
      }
    });
  } catch (error) {
    console.error('取出汉字失败:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 🔧 更新：领取积分（现在积分已经自动发放，这个接口用于确认领取）
router.post('/claim', authMiddleware, async (req, res) => {
  try {
    console.log('🔥 领取积分请求 - 用户ID:', req.user._id);
    
    let factory = await RefiningFactory.findOne({ userId: req.user._id });
    
    if (!factory || factory.refinedPoints === 0) {
      return res.status(400).json({ success: false, message: '没有可领取的积分' });
    }

    const points = factory.refinedPoints;
    
    // 🔧 更新：积分已经自动发放，这里只需要清空已领取的积分记录
    factory.refinedPoints = 0;
    
    // 如果所有字符都炼化完成，重置工厂
    if (factory.refinedChars >= factory.inputChars.length) {
      factory.refinedChars = 0;
      factory.inputChars = [];
      factory.currentChars = 0; // 🔧 修复：重置当前字符数量
      factory.status = 'idle';
      factory.refiningStartTime = null;
    }
    
    await factory.save();

    // 获取最新的用户积分
    const user = await User.findById(req.user._id);

    console.log(`✅ 用户确认领取积分: ${req.user.username}, 积分: ${points}`);

    res.json({
      success: true,
      message: '领取成功',
      data: {
        points,
        currentPoints: user.points
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
