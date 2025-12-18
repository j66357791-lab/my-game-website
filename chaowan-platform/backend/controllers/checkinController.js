// backend/controllers/checkinController.js
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { CHECKIN_CONFIG } = require('../config/constants');

// 获取签到状态
exports.getCheckinStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查今天是否已签到
    const today = new Date().toDateString();
    const lastCheckinDate = user.lastCheckinDate?.toDateString();
    const hasCheckedInToday = lastCheckinDate === today;
    
    // 计算连续签到天数
    let checkinStreak = user.checkinStreak;
    if (!hasCheckedInToday && lastCheckinDate) {
      // 检查是否断签
      const lastCheckin = new Date(user.lastCheckinDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastCheckin.toDateString() !== yesterday.toDateString()) {
        checkinStreak = 0; // 断签了
      }
    }

    // 计算今日可获得的积分
    const levelBonus = user.getCheckinBonus();
    const dayIndex = Math.min(checkinStreak, CHECKIN_CONFIG.maxStreak - 1);
    const baseReward = CHECKIN_CONFIG.baseRewards[dayIndex];
    
    res.json({
      success: true,
      data: {
        hasCheckedInToday,
        checkinStreak,
        todayReward: levelBonus,
        baseReward,
        totalCheckins: user.totalCheckins,
        lastCheckinDate: user.lastCheckinDate
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取签到状态失败',
      error: error.message
    });
  }
};

// 执行签到
exports.performCheckin = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查今天是否已签到
    const today = new Date().toDateString();
    const lastCheckinDate = user.lastCheckinDate?.toDateString();
    
    if (lastCheckinDate === today) {
      return res.status(400).json({
        success: false,
        message: '今天已经签到过了'
      });
    }

    // 计算连续签到天数
    let checkinStreak = user.checkinStreak;
    if (lastCheckinDate) {
      const lastCheckin = new Date(user.lastCheckinDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastCheckin.toDateString() === yesterday.toDateString()) {
        checkinStreak += 1; // 连续签到
      } else {
        checkinStreak = 1; // 断签后重新开始
      }
    } else {
      checkinStreak = 1; // 首次签到
    }

    // 限制最大连续签到天数
    checkinStreak = Math.min(checkinStreak, CHECKIN_CONFIG.maxStreak);

    // 计算签到奖励
    const dayIndex = Math.min(checkinStreak - 1, CHECKIN_CONFIG.maxStreak - 1);
    const baseReward = CHECKIN_CONFIG.baseRewards[dayIndex];
    const totalReward = user.getCheckinBonus();
    
    // 更新用户信息（使用 integral 替代 points）
    user.integral += totalReward;
    user.lastCheckinDate = new Date();
    user.checkinStreak = checkinStreak;
    user.totalCheckins += 1;
    
    // 添加签到经验
    const expResult = user.addExperience(5); // 签到获得5经验
    await user.save();

    // 记录交易
    await new Transaction({
      userId,
      type: 'checkin',
      amount: totalReward,
      balance: user.integral, // 使用 integral
      description: `第${checkinStreak}天签到奖励`,
      metadata: {
        streak: checkinStreak,
        baseReward,
        levelBonus: totalReward - baseReward
      }
    }).save();

    // 如果升级了，记录升级奖励
    let levelUpReward = 0;
    if (expResult.levelUp) {
      const { LEVEL_CONFIG } = require('../config/constants');
      levelUpReward = LEVEL_CONFIG.levelUpRewards[expResult.newLevel] || 0;
      
      if (levelUpReward > 0) {
        user.integral += levelUpReward; // 使用 integral
        await user.save();
        
        await new Transaction({
          userId,
          type: 'level_up',
          amount: levelUpReward,
          balance: user.integral, // 使用 integral
          description: `升级到 Lv.${expResult.newLevel} 奖励`,
          metadata: {
            oldLevel: expResult.newLevel - 1,
            newLevel: expResult.newLevel
          }
        }).save();
      }
    }

    res.json({
      success: true,
      message: '签到成功！',
      data: {
        reward: totalReward,
        checkinStreak,
        userIntegral: user.integral, // 返回 integral
        userLevel: user.level,
        userExperience: user.experience,
        levelUp: expResult.levelUp,
        levelUpReward
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '签到失败',
      error: error.message
    });
  }
};
