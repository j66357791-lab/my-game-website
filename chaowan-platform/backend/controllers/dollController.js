const Doll = require('../models/Doll');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 获取用户娃娃列表
exports.getUserDolls = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const dolls = await Doll.find({ 
      userId: userId,
      isRecycled: false
    })
      .sort({ createdAt: -1 });

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
      isDeployed: doll.isDeployed,
      purchasedAt: doll.purchasedAt,
      expiresAt: doll.expiresAt,
      createdAt: doll.createdAt,
      updatedAt: doll.updatedAt
    }));

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

// 购买娃娃
exports.purchaseDoll = async (req, res) => {
  try {
    const { dollLevel } = req.body;
    const userId = req.user.id;

    const dollConfig = Doll.getDollConfig(dollLevel);
    if (!dollConfig) {
      return res.status(400).json({
        success: false,
        message: '娃娃配置不存在'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.starcoin < dollConfig.purchasePrice) {
      return res.status(400).json({
        success: false,
        message: '星源币不足'
      });
    }

    const doll = new Doll({
      userId: userId,
      name: dollConfig.name,
      level: dollLevel,
      emoji: dollConfig.emoji,
      description: dollConfig.description,
      rarity: dollConfig.rarity,
      purchasePrice: dollConfig.purchasePrice,
      productionPerDay: dollConfig.productionPerDay,
      totalDays: dollConfig.totalDays,
      remainingDays: dollConfig.totalDays
    });

    await doll.save();

    const oldStarcoin = user.starcoin;
    user.starcoin -= dollConfig.purchasePrice;
    await user.save();

    await new Transaction({
      userId: userId,
      type: 'doll_purchase',
      amount: -dollConfig.purchasePrice,
      currency: 'starcoin',
      balance: user.starcoin,
      description: `购买娃娃: ${dollConfig.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel: dollLevel,
        dollName: dollConfig.name
      }
    }).save();

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
          isExpired: doll.isExpired,
          isDeployed: doll.isDeployed
        },
        cost: parseFloat(dollConfig.purchasePrice).toFixed(2),
        oldStarcoin: parseFloat(oldStarcoin).toFixed(2),
        newStarcoin: parseFloat(user.starcoin).toFixed(2)
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

// 批量购买娃娃
exports.purchaseDolls = async (req, res) => {
  try {
    const { purchases } = req.body;
    const userId = req.user.id;

    if (!purchases || !Array.isArray(purchases) || purchases.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的购买信息'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const createdDolls = [];
    let totalCost = 0;

    for (const purchase of purchases) {
      const { dollLevel, quantity } = purchase;
      const dollConfig = Doll.getDollConfig(dollLevel);
      
      if (!dollConfig) {
        return res.status(400).json({
          success: false,
          message: `等级 ${dollLevel} 的娃娃配置不存在`
        });
      }

      const purchaseCost = dollConfig.purchasePrice * quantity;
      totalCost += purchaseCost;

      for (let i = 0; i < quantity; i++) {
        const doll = new Doll({
          userId: userId,
          name: dollConfig.name,
          level: dollLevel,
          emoji: dollConfig.emoji,
          description: dollConfig.description,
          rarity: dollConfig.rarity,
          purchasePrice: dollConfig.purchasePrice,
          productionPerDay: dollConfig.productionPerDay,
          totalDays: dollConfig.totalDays,
          remainingDays: dollConfig.totalDays
        });
        await doll.save();
        createdDolls.push(doll);
      }
    }

    if (user.starcoin < totalCost) {
      return res.status(400).json({
        success: false,
        message: '星源币不足'
      });
    }

    user.starcoin -= totalCost;
    await user.save();

    res.json({
      success: true,
      message: `成功购买 ${createdDolls.length} 个娃娃`,
      data: {
        dolls: createdDolls,
        cost: totalCost,
        newStarcoin: user.starcoin
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

// 领取今日收益
exports.claimDailyEarnings = async (req, res) => {
  try {
    const userId = req.user.id;
    
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

    const user = await User.findById(userId);
    const oldPoints = user.points;
    user.points += totalEarnings;
    await user.save();

    const transaction = new Transaction({
      userId: userId,
      type: 'production',
      amount: parseFloat(totalEarnings).toFixed(2),
      currency: 'points',
      balance: user.points,
      description: `今日娃娃产出收益`,
      metadata: {
        earningDetails: earningDetails,
        totalDolls: dolls.length,
        producingDolls: earningDetails.length
      }
    });
    await transaction.save();

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

// 回收娃娃
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
    const oldPoints = user.points;
    const oldExperience = user.experience;
    
    user.points += recycleResult.reward;
    user.experience += recycleResult.experience;
    await user.save();

    await new Transaction({
      userId: userId,
      type: 'recycle',
      amount: parseFloat(recycleResult.reward).toFixed(2),
      currency: 'points',
      balance: user.points,
      description: `回收娃娃: ${doll.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel: doll.level,
        dollName: doll.name,
        remainingDays: doll.remainingDays,
        recycleReward: parseFloat(recycleResult.reward).toFixed(2)
      }
    }).save();

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

// 合成娃娃
exports.synthesize = async (req, res) => {
  try {
    const { dollId, materialDollIds } = req.body;
    const userId = req.user.id;

    const mainDoll = await Doll.findOne({ _id: dollId, userId, isRecycled: false, isDeployed: false });
    if (!mainDoll) {
      return res.status(400).json({
        success: false,
        message: '本体娃娃不存在或已被回收/出战'
      });
    }

    if (!materialDollIds || materialDollIds.length !== 2) {
      return res.status(400).json({
        success: false,
        message: '需要2个材料娃娃'
      });
    }

    const materialDolls = await Doll.find({ 
      _id: { $in: materialDollIds }, 
      userId, 
      isRecycled: false, 
      isDeployed: false,
      level: mainDoll.level
    });

    if (materialDolls.length !== 2) {
      return res.status(400).json({
        success: false,
        message: '材料娃娃不存在或等级不符'
      });
    }

    await Doll.updateMany({ _id: { $in: materialDollIds } }, { isRecycled: true });

    mainDoll.level += 1;
    mainDoll.productionPerDay = Doll.getDollConfig(mainDoll.level).productionPerDay;
    await mainDoll.save();

    res.json({
      success: true,
      message: '合成成功',
      data: {
        upgradedDoll: {
          _id: mainDoll._id,
          name: mainDoll.name,
          level: mainDoll.level,
          emoji: mainDoll.emoji,
          productionPerDay: parseFloat(mainDoll.productionPerDay).toFixed(2),
          remainingDays: mainDoll.remainingDays,
          totalDays: mainDoll.totalDays,
          isDeployed: mainDoll.isDeployed
        }
      }
    });
  } catch (error) {
    console.error('❌ 合成娃娃失败:', error);
    res.status(500).json({
      success: false,
      message: '合成失败',
      error: error.message
    });
  }
};

// 派遣娃娃出战
exports.deployDoll = async (req, res) => {
  try {
    const { dollId } = req.body;
    const userId = req.user.id;

    const doll = await Doll.findOne({ _id: dollId, userId, isRecycled: false, isDeployed: false });
    if (!doll) {
      return res.status(400).json({
        success: false,
        message: '娃娃不存在或已被回收/出战'
      });
    }

    const user = await User.findById(userId);
    if (user.deployedDolls.length >= 5) {
      return res.status(400).json({
        success: false,
        message: '出战位已满，无法出战'
      });
    }

    doll.isDeployed = true;
    await doll.save();

    user.deployedDolls.push(doll._id);
    await user.save();

    res.json({
      success: true,
      message: '出战成功',
      data: {
        doll: {
          _id: doll._id,
          name: doll.name,
          level: doll.level,
          emoji: doll.emoji,
          productionPerDay: parseFloat(doll.productionPerDay).toFixed(2),
          remainingDays: doll.remainingDays,
          totalDays: doll.totalDays,
          isDeployed: doll.isDeployed
        }
      }
    });
  } catch (error) {
    console.error('❌ 派遣娃娃出战失败:', error);
    res.status(500).json({
      success: false,
      message: '出战失败',
      error: error.message
    });
  }
};

// 召回娃娃
exports.recallDoll = async (req, res) => {
  try {
    const { dollId } = req.body;
    const userId = req.user.id;

    const doll = await Doll.findOne({ _id: dollId, userId, isRecycled: false, isDeployed: true });
    if (!doll) {
      return res.status(400).json({
        success: false,
        message: '娃娃不存在或未出战'
      });
    }

    doll.isDeployed = false;
    await doll.save();

    const user = await User.findById(userId);
    user.deployedDolls = user.deployedDolls.filter(id => id.toString() !== dollId.toString());
    await user.save();

    res.json({
      success: true,
      message: '召回成功',
      data: {
        doll: {
          _id: doll._id,
          name: doll.name,
          level: doll.level,
          emoji: doll.emoji,
          productionPerDay: parseFloat(doll.productionPerDay).toFixed(2),
          remainingDays: doll.remainingDays,
          totalDays: doll.totalDays,
          isDeployed: doll.isDeployed
        }
      }
    });
  } catch (error) {
    console.error('❌ 召回娃娃失败:', error);
    res.status(500).json({
      success: false,
      message: '召回失败',
      error: error.message
    });
  }
};

console.log('✅ dollController 所有方法已导出');
