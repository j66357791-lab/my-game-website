// backend/controllers/dollController.js
const Doll = require('../models/Doll');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { DOLL_CONFIGS } = require('../config/constants');

// 获取商店娃娃列表
exports.getShopDolls = async (req, res) => {
  try {
    const shopDolls = Object.keys(DOLL_CONFIGS).map(level => ({
      level: parseInt(level),
      ...DOLL_CONFIGS[level],
      isAvailable: !DOLL_CONFIGS[level].isLocked
    }));

    res.json({
      success: true,
      data: shopDolls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取商店数据失败',
      error: error.message
    });
  }
};

// 购买娃娃
exports.purchaseDoll = async (req, res) => {
  try {
    const { dollLevel } = req.body;
    const userId = req.user.id;

    // 验证娃娃等级
    const dollConfig = DOLL_CONFIGS[dollLevel];
    if (!dollConfig || dollConfig.isLocked) {
      return res.status(400).json({
        success: false,
        message: '该娃娃暂未开放'
      });
    }

    // 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查积分
    if (user.points < dollConfig.purchasePrice) {
      return res.status(400).json({
        success: false,
        message: '积分不足'
      });
    }

    // 检查娃娃数量限制
    const dollCount = await Doll.countDocuments({ 
      userId, 
      isRecycled: false 
    });
    if (dollCount >= 100) { // 从SYSTEM_CONFIG读取
      return res.status(400).json({
        success: false,
        message: '娃娃数量已达上限'
      });
    }

    // 扣除积分
    user.points -= dollConfig.purchasePrice;
    user.totalDollsPurchased += 1;
    await user.save();

    // 创建娃娃
    const doll = new Doll({
      userId,
      level: dollLevel,
      ...dollConfig
    });
    await doll.save();

    // 记录交易
    await new Transaction({
      userId,
      type: 'purchase',
      amount: -dollConfig.purchasePrice,
      balance: user.points,
      description: `购买 ${dollConfig.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel,
        dollName: dollConfig.name
      }
    }).save();

    res.json({
      success: true,
      message: '购买成功！',
      data: {
        doll,
        userPoints: user.points
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '购买失败',
      error: error.message
    });
  }
};

// 获取用户娃娃列表
exports.getUserDolls = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter = 'all' } = req.query;

    let query = { userId, isRecycled: false };
    
    if (filter === 'producing') {
      query.isExpired = false;
    } else if (filter === 'expired') {
      query.isExpired = true;
    }

    const dolls = await Doll.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // 检查过期状态
    dolls.forEach(doll => {
      const dollInstance = new Doll(doll);
      dollInstance.checkExpiration();
    });

    res.json({
      success: true,
      data: dolls
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取娃娃列表失败',
      error: error.message
    });
  }
};

// 回收娃娃
exports.recycleDoll = async (req, res) => {
  try {
    const { dollId } = req.params;
    const userId = req.user.id;

    // 获取娃娃信息
    const doll = await Doll.findOne({ _id: dollId, userId });
    if (!doll) {
      return res.status(404).json({
        success: false,
        message: '娃娃不存在'
      });
    }

    if (doll.isRecycled) {
      return res.status(400).json({
        success: false,
        message: '娃娃已回收'
      });
    }

    // 执行回收
    const recycleResult = doll.recycle();
    await doll.save();

    // 更新用户
    const user = await User.findById(userId);
    user.points += recycleResult.reward;
    user.totalDollsRecycled += 1;
    
    // 添加经验
    const expResult = user.addExperience(recycleResult.experience);
    await user.save();

    // 记录交易
    await new Transaction({
      userId,
      type: 'recycle',
      amount: recycleResult.reward,
      balance: user.points,
      description: `回收 ${doll.name}，获得 ${recycleResult.reward} 积分`,
      relatedId: doll._id,
      metadata: {
        dollLevel: doll.level,
        dollName: doll.name
      }
    }).save();

    // 如果升级了，记录升级奖励
    if (expResult.levelUp) {
      const { LEVEL_CONFIG } = require('../config/constants');
      const levelUpReward = LEVEL_CONFIG.levelUpRewards[expResult.newLevel] || 0;
      
      if (levelUpReward > 0) {
        user.points += levelUpReward;
        await user.save();
        
        await new Transaction({
          userId,
          type: 'level_up',
          amount: levelUpReward,
          balance: user.points,
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
      message: '回收成功！',
      data: {
        reward: recycleResult.reward,
        experience: recycleResult.experience,
        userPoints: user.points,
        userLevel: user.level,
        levelUp: expResult.levelUp
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '回收失败',
      error: error.message
    });
  }
};
