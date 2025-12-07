// backend/controllers/dollController.js - 修复getUserDolls方法
const Doll = require('../models/Doll');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 🔧 修复：过滤已回收的娃娃
exports.getUserDolls = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔍 获取用户娃娃列表: userId=${userId}`);
    
    // 🔧 关键修复：只获取未回收的娃娃
    const dolls = await Doll.find({ 
      userId: userId,
      isRecycled: false  // 🔧 只显示未回收的娃娃
    })
      .sort({ createdAt: -1 });

    console.log(`✅ 找到 ${dolls.length} 个未回收的娃娃`);

    res.json({
      success: true,
      data: { dolls }
    });
  } catch (error) {
    console.error('❌ 获取娃娃列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取娃娃列表失败',
      error: error.message
    });
  }
};

// 其他方法保持不变...
exports.purchaseDoll = async (req, res) => {
  try {
    console.log('🧸 ========== 购买娃娃开始 ==========');
    console.log('📡 请求体:', req.body);
    console.log('📡 请求用户:', req.user);
    
    const { dollLevel } = req.body;
    const userId = req.user.id;

    console.log(`🔍 解析数据: dollLevel=${dollLevel}, userId=${userId}`);

    // 验证数据
    if (dollLevel === undefined || dollLevel === null) {
      console.error('❌ dollLevel 为 undefined 或 null');
      return res.status(400).json({
        success: false,
        message: '娃娃等级不能为空'
      });
    }

    const parsedDollLevel = parseInt(dollLevel);
    if (isNaN(parsedDollLevel)) {
      console.error('❌ dollLevel 不是有效数字:', dollLevel);
      return res.status(400).json({
        success: false,
        message: '娃娃等级必须是数字'
      });
    }

    console.log(`✅ 数据验证通过: parsedDollLevel=${parsedDollLevel}`);

    // 获取娃娃配置
    const dollConfig = Doll.getDollConfig(parsedDollLevel);
    console.log(`🔍 娃娃配置:`, dollConfig);
    
    if (!dollConfig) {
      return res.status(400).json({
        success: false,
        message: '娃娃配置不存在'
      });
    }

    // 获取用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.points < dollConfig.purchasePrice) {
      return res.status(400).json({
        success: false,
        message: '积分不足'
      });
    }

    // 创建娃娃
    const doll = new Doll({
      userId: userId,
      name: dollConfig.name,
      level: parsedDollLevel,
      emoji: dollConfig.emoji,
      description: dollConfig.description,
      rarity: dollConfig.rarity,
      purchasePrice: dollConfig.purchasePrice,
      productionPerDay: dollConfig.productionPerDay,
      totalDays: dollConfig.totalDays,
      remainingDays: dollConfig.totalDays
    });

    await doll.save();
    console.log(`✅ 娃娃创建成功: dollId=${doll._id}`);

    // 扣除积分
    user.points -= dollConfig.purchasePrice;
    await user.save();

    // 记录交易
    await new Transaction({
      userId: userId,
      type: 'purchase',
      amount: -dollConfig.purchasePrice,
      balance: user.points,
      description: `购买娃娃: ${dollConfig.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel: parsedDollLevel,
        dollName: dollConfig.name
      }
    }).save();

    console.log(`🎉 娃娃购买完成: ${user.username}, ${dollConfig.name}`);

    res.json({
      success: true,
      message: '购买成功',
      data: {
        doll: {
          _id: doll._id,
          name: doll.name,
          level: doll.level,
          emoji: doll.emoji,
          productionPerDay: doll.productionPerDay,
          remainingDays: doll.remainingDays,
          totalDays: doll.totalDays,
          totalProduced: doll.totalProduced,
          isExpired: doll.isExpired
        },
        userPoints: user.points
      }
    });

  } catch (error) {
    console.error('❌ 购买娃娃失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 🔧 修复：回收娃娃方法
exports.recycleDoll = async (req, res) => {
  try {
    const { dollId } = req.params;
    const userId = req.user.id;

    console.log(`🔄 开始回收娃娃: dollId=${dollId}, userId=${userId}`);

    // 🔧 关键修复：确保只查找未回收的娃娃
    const doll = await Doll.findOne({ 
      _id: dollId, 
      userId: userId,
      isRecycled: false  // 🔧 只能回收未回收的娃娃
    });
    
    if (!doll) {
      console.error('❌ 娃娃不存在或已回收:', dollId);
      return res.status(404).json({
        success: false,
        message: '娃娃不存在或已被回收'
      });
    }

    console.log(`🔍 找到娃娃: ${doll.name}, 剩余天数: ${doll.remainingDays}`);

    const recycleResult = doll.recycle();
    await doll.save();

    console.log(`🔄 回收计算结果: ${recycleResult.reward} 积分, ${recycleResult.experience} 经验`);

    const user = await User.findById(userId);
    const oldPoints = user.points;
    const oldExperience = user.experience;
    
    user.points += recycleResult.reward;
    user.experience += recycleResult.experience;
    await user.save();

    console.log(`💰 用户积分变化: ${oldPoints} → ${user.points} (+${recycleResult.reward})`);
    console.log(`⭐ 用户经验变化: ${oldExperience} → ${user.experience} (+${recycleResult.experience})`);

    // 记录回收交易
    await new Transaction({
      userId: userId,
      type: 'recycle',
      amount: recycleResult.reward,
      balance: user.points,
      description: `回收娃娃: ${doll.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel: doll.level,
        dollName: doll.name,
        remainingDays: doll.remainingDays,
        recycleReward: recycleResult.reward
      }
    }).save();

    console.log(`🎉 娃娃回收完成: ${user.username}, ${doll.name}`);

    res.json({
      success: true,
      message: '回收成功',
      data: {
        recyclePoints: recycleResult.reward,
        experience: recycleResult.experience,
        userPoints: user.points,
        userExperience: user.experience
      }
    });
  } catch (error) {
    console.error('❌ 回收娃娃失败:', error);
    res.status(500).json({
      success: false,
      message: '回收失败',
      error: error.message
    });
  }
};

// 商店相关
exports.getShopDolls = async (req, res) => {
  try {
    const shopDolls = [
      {
        level: 1,
        name: '萌新宝宝',
        emoji: '👶',
        description: '新用户的入门级伙伴，可爱又贴心',
        rarity: '⭐',
        purchasePrice: 50,
        productionPerDay: 0.88,
        totalDays: 60,
        isAvailable: true
      },
      {
        level: 2,
        name: '元气宝贝',
        emoji: '⚡',
        description: '充满活力的进阶伙伴，产出效率更高',
        rarity: '⭐⭐',
        purchasePrice: 250,
        productionPerDay: 3.88,
        totalDays: 70,
        isAvailable: true
      }
    ];

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
