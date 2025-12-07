// backend/controllers/dollController.js - 添加收益领取功能

// 🔧 新增：一键领取今日娃娃收益
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
          dailyEarning: dailyEarning
        });
        await doll.save(); // 保存娃娃状态
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
    const oldPoints = user.points;
    user.points += totalEarnings;
    await user.save();

    // 记录交易
    const transaction = new Transaction({
      userId: userId,
      type: 'production',
      amount: totalEarnings,
      balance: user.points,
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
      message: `成功领取今日收益 ${totalEarnings} 积分`,
      data: {
        totalEarnings: totalEarnings,
        oldPoints: oldPoints,
        newPoints: user.points,
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

// 🔧 修改：支持批量购买
exports.purchaseDolls = async (req, res) => {
  try {
    console.log('🧸 ========== 批量购买娃娃开始 ==========');
    console.log('📡 请求体:', req.body);
    
    const { purchases } = req.body; // purchases: [{ dollLevel: 1, quantity: 2 }, { dollLevel: 2, quantity: 1 }]
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

      const purchaseCost = dollConfig.purchasePrice * quantity;
      totalCost += purchaseCost;

      validatedPurchases.push({
        dollLevel: parsedDollLevel,
        quantity: quantity,
        dollConfig: dollConfig,
        cost: purchaseCost
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

    if (user.points < totalCost) {
      return res.status(400).json({
        success: false,
        message: `积分不足，需要 ${totalCost} 积分，当前只有 ${user.points} 积分`
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
          purchasePrice: purchase.dollConfig.purchasePrice,
          productionPerDay: purchase.dollConfig.productionPerDay,
          totalDays: purchase.dollConfig.totalDays,
          remainingDays: purchase.dollConfig.totalDays
        });

        await doll.save();
        createdDolls.push(doll);

        // 🔧 优化3：二级娃娃购买获得180经验值
        if (purchase.dollLevel === 2) {
          totalExperienceGained += 180;
        }
      }
    }

    // 扣除积分
    const oldPoints = user.points;
    user.points -= totalCost;
    
    // 增加经验
    const oldExperience = user.experience;
    user.experience += totalExperienceGained;
    
    await user.save();

    // 记录交易
    const transaction = new Transaction({
      userId: userId,
      type: 'purchase',
      amount: -totalCost,
      balance: user.points,
      description: `批量购买娃娃`,
      relatedId: null,
      metadata: {
        purchases: validatedPurchases,
        totalDolls: createdDolls.length,
        experienceGained: totalExperienceGained
      }
    });
    await transaction.save();

    // 如果有经验获得，记录经验交易
    if (totalExperienceGained > 0) {
      const expTransaction = new Transaction({
        userId: userId,
        type: 'level_up',
        amount: totalExperienceGained,
        balance: user.experience,
        description: `二级娃娃购买经验奖励`,
        metadata: {
          dollCount: validatedPurchases.find(p => p.dollLevel === 2)?.quantity || 0,
          experiencePerDoll: 180
        }
      });
      await expTransaction.save();
    }

    console.log(`🎉 批量购买完成: ${user.username}, ${createdDolls.length} 个娃娃, -${totalCost} 积分, +${totalExperienceGained} 经验`);

    res.json({
      success: true,
      message: `成功购买 ${createdDolls.length} 个娃娃`,
      data: {
        dolls: createdDolls.map(doll => ({
          _id: doll._id,
          name: doll.name,
          level: doll.level,
          emoji: doll.emoji,
          productionPerDay: doll.productionPerDay,
          remainingDays: doll.remainingDays,
          totalDays: doll.totalDays
        })),
        cost: totalCost,
        oldPoints: oldPoints,
        newPoints: user.points,
        experienceGained: totalExperienceGained,
        oldExperience: oldExperience,
        newExperience: user.experience
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

// 🔧 修改：单个购买也支持二级娃娃经验
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

    // 扣除积分
    const oldPoints = user.points;
    user.points -= dollConfig.purchasePrice;
    
    // 🔧 优化3：二级娃娃购买获得180经验值
    let experienceGained = 0;
    if (parsedDollLevel === 2) {
      experienceGained = 180;
      user.experience += experienceGained;
    }
    
    const oldExperience = user.experience;
    await user.save();

    // 记录购买交易
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

    // 如果有经验获得，记录经验交易
    if (experienceGained > 0) {
      await new Transaction({
        userId: userId,
        type: 'level_up',
        amount: experienceGained,
        balance: user.experience,
        description: `二级娃娃购买经验奖励`,
        metadata: {
          dollLevel: parsedDollLevel,
          experiencePerDoll: 180
        }
      }).save();
    }

    console.log(`🎉 娃娃购买完成: ${user.username}, ${dollConfig.name}, -${dollConfig.purchasePrice} 积分, +${experienceGained} 经验`);

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
        cost: dollConfig.purchasePrice,
        oldPoints: oldPoints,
        newPoints: user.points,
        experienceGained: experienceGained,
        oldExperience: oldExperience,
        newExperience: user.experience
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

// 其他方法保持不变...
