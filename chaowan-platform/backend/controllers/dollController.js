// backend/controllers/dollController.js - 完整修复版本（积分精度修复）
const Doll = require('../models/Doll');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 🔧 确保 getShopDolls 正确导出
exports.getShopDolls = async (req, res) => {
  try {
    const shopDolls = [
      {
        level: 1,
        name: '萌新宝宝',
        emoji: '👶',
        description: '新用户的入门级伙伴，可爱又贴心',
        rarity: '⭐',
        purchasePrice: parseFloat(50).toFixed(2),
        productionPerDay: parseFloat(0.88).toFixed(2),
        totalDays: 60,
        isAvailable: true
      },
      {
        level: 2,
        name: '元气宝贝',
        emoji: '⚡',
        description: '充满活力的进阶伙伴，产出效率更高',
        rarity: '⭐⭐',
        purchasePrice: parseFloat(250).toFixed(2),
        productionPerDay: parseFloat(3.88).toFixed(2),
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

// 🔧 修复：获取用户娃娃列表
exports.getUserDolls = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔍 获取用户娃娃列表: userId=${userId}`);
    
    const dolls = await Doll.find({ 
      userId: userId,
      isRecycled: false
    })
      .sort({ createdAt: -1 });

    // 🔧 修复：为娃娃数据添加精度处理
    const processedDolls = dolls.map(doll => ({
      _id: doll._id,
      userId: doll.userId,
      name: doll.name,
      level: doll.level,
      emoji: doll.emoji,
      description: doll.description,
      rarity: doll.rarity,
      purchasePrice: parseFloat(doll.purchasePrice).toFixed(2),
      productionPerDay: parseFloat(doll.productionPerDay).toFixed(2),
      totalDays: doll.totalDays,
      remainingDays: doll.remainingDays,
      totalProduced: parseFloat(doll.totalProduced || 0).toFixed(2),
      isExpired: doll.isExpired,
      isRecycled: doll.isRecycled,
      purchasedAt: doll.purchasedAt,
      expiresAt: doll.expiresAt,
      createdAt: doll.createdAt,
      updatedAt: doll.updatedAt
    }));

    console.log(`✅ 找到 ${processedDolls.length} 个未回收的娃娃`);

    res.json({
      success: true,
      data: { dolls: processedDolls }
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

// 🔧 修复：单个购买娃娃
exports.purchaseDoll = async (req, res) => {
  try {
    console.log('🧸 ========== 单个购买娃娃开始 ==========');
    console.log('📡 请求体:', req.body);
    
    const { dollLevel } = req.body;
    const userId = req.user.id;

    // 验证数据
    if (dollLevel === undefined || dollLevel === null) {
      return res.status(400).json({
        success: false,
        message: '娃娃等级不能为空'
      });
    }

    const parsedDollLevel = parseInt(dollLevel);
    if (isNaN(parsedDollLevel)) {
      return res.status(400).json({
        success: false,
        message: '娃娃等级必须是数字'
      });
    }

    const dollConfig = Doll.getDollConfig(parsedDollLevel);
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

    if (parseFloat(user.points || 0) < parseFloat(dollConfig.purchasePrice)) {
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
      purchasePrice: parseFloat(dollConfig.purchasePrice).toFixed(2),
      productionPerDay: parseFloat(dollConfig.productionPerDay).toFixed(2),
      totalDays: dollConfig.totalDays,
      remainingDays: dollConfig.totalDays
    });

    await doll.save();

    // 扣除积分
    const oldPoints = parseFloat(user.points || 0);
    const dollPrice = parseFloat(dollConfig.purchasePrice);
    user.points = parseFloat(oldPoints - dollPrice).toFixed(2);
    
    // 二级娃娃获得经验
    let experienceGained = 0;
    if (parsedDollLevel === 2) {
      experienceGained = 180;
      user.experience = parseFloat((user.experience || 0) + experienceGained).toFixed(2);
    }
    
    const oldExperience = parseFloat(user.experience || 0);
    await user.save();

    // 记录交易
    await new Transaction({
      userId: userId,
      type: 'purchase',
      amount: parseFloat(-dollPrice).toFixed(2),
      balance: parseFloat(user.points).toFixed(2),
      description: `购买娃娃: ${dollConfig.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel: parsedDollLevel,
        dollName: dollConfig.name
      }
    }).save();

    // 记录经验交易
    if (experienceGained > 0) {
      await new Transaction({
        userId: userId,
        type: 'level_up',
        amount: parseFloat(experienceGained).toFixed(2),
        balance: parseFloat(user.experience).toFixed(2),
        description: `二级娃娃购买经验奖励`,
        metadata: {
          dollLevel: parsedDollLevel,
          experiencePerDoll: 180
        }
      }).save();
    }

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
          productionPerDay: parseFloat(doll.productionPerDay).toFixed(2),
          remainingDays: doll.remainingDays,
          totalDays: doll.totalDays,
          totalProduced: parseFloat(doll.totalProduced || 0).toFixed(2),
          isExpired: doll.isExpired
        },
        cost: parseFloat(dollPrice).toFixed(2),
        oldPoints: parseFloat(oldPoints).toFixed(2),
        newPoints: parseFloat(user.points).toFixed(2),
        experienceGained: parseFloat(experienceGained).toFixed(2),
        oldExperience: parseFloat(oldExperience).toFixed(2),
        newExperience: parseFloat(user.experience).toFixed(2)
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

// 🔧 修复：批量购买娃娃
exports.purchaseDolls = async (req, res) => {
  try {
    console.log('🧸 ========== 批量购买娃娃开始 ==========');
    console.log('📡 请求体:', req.body);
    
    const { purchases } = req.body;
    const userId = req.user.id;

    if (!purchases || !Array.isArray(purchases) || purchases.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的购买信息'
      });
    }

    // 验证购买数据
    const validatedPurchases = [];
    let totalCost = 0;

    for (const purchase of purchases) {
      const { dollLevel, quantity } = purchase;
      
      if (!dollLevel || !quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: '娃娃等级和数量必须有效'
        });
      }

      const parsedDollLevel = parseInt(dollLevel);
      if (isNaN(parsedDollLevel)) {
        return res.status(400).json({
          success: false,
          message: '娃娃等级必须是数字'
        });
      }

      const dollConfig = Doll.getDollConfig(parsedDollLevel);
      if (!dollConfig) {
        return res.status(400).json({
          success: false,
          message: `等级 ${parsedDollLevel} 的娃娃配置不存在`
        });
      }

      const purchaseCost = parseFloat(dollConfig.purchasePrice) * quantity;
      totalCost += purchaseCost;

      validatedPurchases.push({
        dollLevel: parsedDollLevel,
        quantity: quantity,
        dollConfig: dollConfig,
        cost: parseFloat(purchaseCost).toFixed(2)
      });
    }

    // 检查用户积分
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (parseFloat(user.points || 0) < parseFloat(totalCost)) {
      return res.status(400).json({
        success: false,
        message: `积分不足，需要 ${parseFloat(totalCost).toFixed(2)} 积分，当前只有 ${parseFloat(user.points || 0).toFixed(2)} 积分`
      });
    }

    // 批量创建娃娃
    const createdDolls = [];
    let totalExperienceGained = 0;

    for (const purchase of validatedPurchases) {
      for (let i = 0; i < purchase.quantity; i++) {
        const doll = new Doll({
          userId: userId,
          name: purchase.dollConfig.name,
          level: purchase.dollLevel,
          emoji: purchase.dollConfig.emoji,
          description: purchase.dollConfig.description,
          rarity: purchase.dollConfig.rarity,
          purchasePrice: parseFloat(purchase.dollConfig.purchasePrice).toFixed(2),
          productionPerDay: parseFloat(purchase.dollConfig.productionPerDay).toFixed(2),
          totalDays: purchase.dollConfig.totalDays,
          remainingDays: purchase.dollConfig.totalDays
        });

        await doll.save();
        createdDolls.push(doll);

        // 二级娃娃获得经验
        if (purchase.dollLevel === 2) {
          totalExperienceGained += 180;
        }
      }
    }

    // 扣除积分和增加经验
    const oldPoints = parseFloat(user.points || 0);
    const oldExperience = parseFloat(user.experience || 0);
    user.points = parseFloat(oldPoints - totalCost).toFixed(2);
    user.experience = parseFloat(oldExperience + totalExperienceGained).toFixed(2);
    await user.save();

    // 记录交易
    await new Transaction({
      userId: userId,
      type: 'purchase',
      amount: parseFloat(-totalCost).toFixed(2),
      balance: parseFloat(user.points).toFixed(2),
      description: `批量购买娃娃`,
      metadata: {
        purchases: validatedPurchases,
        totalDolls: createdDolls.length,
        experienceGained: parseFloat(totalExperienceGained).toFixed(2)
      }
    }).save();

    // 记录经验交易
    if (totalExperienceGained > 0) {
      await new Transaction({
        userId: userId,
        type: 'level_up',
        amount: parseFloat(totalExperienceGained).toFixed(2),
        balance: parseFloat(user.experience).toFixed(2),
        description: `二级娃娃购买经验奖励`,
        metadata: {
          dollCount: validatedPurchases.find(p => p.dollLevel === 2)?.quantity || 0,
          experiencePerDoll: 180
        }
      }).save();
    }

    console.log(`🎉 批量购买完成: ${user.username}, ${createdDolls.length} 个娃娃`);

    res.json({
      success: true,
      message: `成功购买 ${createdDolls.length} 个娃娃`,
      data: {
        dolls: createdDolls.map(doll => ({
          _id: doll._id,
          name: doll.name,
          level: doll.level,
          emoji: doll.emoji,
          productionPerDay: parseFloat(doll.productionPerDay).toFixed(2),
          remainingDays: doll.remainingDays,
          totalDays: doll.totalDays
        })),
        cost: parseFloat(totalCost).toFixed(2),
        oldPoints: parseFloat(oldPoints).toFixed(2),
        newPoints: parseFloat(user.points).toFixed(2),
        experienceGained: parseFloat(totalExperienceGained).toFixed(2),
        oldExperience: parseFloat(oldExperience).toFixed(2),
        newExperience: parseFloat(user.experience).toFixed(2)
      }
    });

  } catch (error) {
    console.error('❌ 批量购买娃娃失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message
    });
  }
};

// 🔧 修复：领取今日收益
exports.claimDailyEarnings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`💰 开始领取今日收益: userId=${userId}`);

    // 检查今日是否已领取
    const today = new Date().toDateString();
    const existingTransaction = await Transaction.findOne({
      userId: userId,
      type: 'production',
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: '今日收益已领取，请明天再来'
      });
    }

    // 获取用户所有未回收且未过期的娃娃
    const dolls = await Doll.find({
      userId: userId,
      isRecycled: false,
      isExpired: false
    });

    if (dolls.length === 0) {
      return res.status(400).json({
        success: false,
        message: '暂无可领取收益的娃娃'
      });
    }

    let totalEarnings = 0;
    const earningDetails = [];

    // 计算每个娃娃的今日产出
    for (const doll of dolls) {
      const dailyEarning = doll.produceDaily();
      if (dailyEarning > 0) {
        totalEarnings += dailyEarning;
        earningDetails.push({
          dollId: doll._id,
          dollName: doll.name,
          dollEmoji: doll.emoji,
          dailyEarning: parseFloat(dailyEarning).toFixed(2)
        });
        await doll.save();
      }
    }

    if (totalEarnings === 0) {
      return res.status(400).json({
        success: false,
        message: '今日暂无娃娃产出'
      });
    }

    // 更新用户积分
    const user = await User.findById(userId);
    const oldPoints = parseFloat(user.points || 0);
    user.points = parseFloat(oldPoints + totalEarnings).toFixed(2);
    await user.save();

    // 记录交易
    const transaction = new Transaction({
      userId: userId,
      type: 'production',
      amount: parseFloat(totalEarnings).toFixed(2),
      balance: parseFloat(user.points).toFixed(2),
      description: `今日娃娃产出收益`,
      metadata: {
        earningDetails: earningDetails,
        totalDolls: dolls.length,
        producingDolls: earningDetails.length
      }
    });
    await transaction.save();

    console.log(`💰 收益领取完成: ${user.username}, +${totalEarnings} 积分`);

    res.json({
      success: true,
      message: `成功领取今日收益 ${parseFloat(totalEarnings).toFixed(2)} 积分`,
      data: {
        totalEarnings: parseFloat(totalEarnings).toFixed(2),
        oldPoints: parseFloat(oldPoints).toFixed(2),
        newPoints: parseFloat(user.points).toFixed(2),
        earningDetails: earningDetails,
        totalDolls: dolls.length,
        producingDolls: earningDetails.length
      }
    });

  } catch (error) {
    console.error('❌ 领取收益失败:', error);
    res.status(500).json({
      success: false,
      message: '领取收益失败',
      error: error.message
    });
  }
};

// 🔧 修复：回收娃娃
exports.recycleDoll = async (req, res) => {
  try {
    const { dollId } = req.params;
    const userId = req.user.id;

    const doll = await Doll.findOne({ 
      _id: dollId, 
      userId: userId,
      isRecycled: false
    });
    
    if (!doll) {
      return res.status(404).json({
        success: false,
        message: '娃娃不存在或已被回收'
      });
    }

    const recycleResult = doll.recycle();
    await doll.save();

    const user = await User.findById(userId);
    const oldPoints = parseFloat(user.points || 0);
    const oldExperience = parseFloat(user.experience || 0);
    
    user.points = parseFloat(oldPoints + recycleResult.reward).toFixed(2);
    user.experience = parseFloat(oldExperience + recycleResult.experience).toFixed(2);
    await user.save();

    // 记录回收交易
    await new Transaction({
      userId: userId,
      type: 'recycle',
      amount: parseFloat(recycleResult.reward).toFixed(2),
      balance: parseFloat(user.points).toFixed(2),
      description: `回收娃娃: ${doll.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel: doll.level,
        dollName: doll.name,
        remainingDays: doll.remainingDays,
        recycleReward: parseFloat(recycleResult.reward).toFixed(2)
      }
    }).save();

    console.log(`🎉 娃娃回收完成: ${user.username}, ${doll.name}`);

    res.json({
      success: true,
      message: '回收成功',
      data: {
        recyclePoints: parseFloat(recycleResult.reward).toFixed(2),
        experience: parseFloat(recycleResult.experience).toFixed(2),
        userPoints: parseFloat(user.points).toFixed(2),
        userExperience: parseFloat(user.experience).toFixed(2)
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

// 🔧 确保所有方法都正确导出
console.log('✅ dollController 所有方法已导出');
