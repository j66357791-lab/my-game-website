// backend/controllers/dollController.js - 完整修复版本（只使用星源币）
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
      purchasePrice: parseFloat(doll.purchasePrice).toFixed(1),
      productionPerDay: parseFloat(doll.productionPerDay).toFixed(1),
      totalDays: doll.totalDays,
      remainingDays: doll.remainingDays,
      totalProduced: parseFloat(doll.totalProduced || 0).toFixed(1),
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
      currency: 'starcoin', // 🔥 修复：使用星源币
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
          productionPerDay: parseFloat(doll.productionPerDay).toFixed(1),
          remainingDays: doll.remainingDays,
          totalDays: doll.totalDays,
          totalProduced: parseFloat(doll.totalProduced || 0).toFixed(1),
          isExpired: doll.isExpired,
          isDeployed: doll.isDeployed
        },
        cost: parseFloat(dollConfig.purchasePrice).toFixed(1),
        oldStarcoin: parseFloat(oldStarcoin).toFixed(1),
        newStarcoin: parseFloat(user.starcoin).toFixed(1)
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

// 🔥 修复：幸运抽取功能 - 只使用星源币
exports.luckyDraw = async (req, res) => {
  try {
    const { drawType } = req.body; // 'single' 或 'ten'
    const userId = req.user.id;
    
    const drawCount = drawType === 'ten' ? 10 : 1;
    const costPerDraw = 500;
    const totalCost = drawCount * costPerDraw;
    
    // 检查星源币
    const user = await User.findById(userId);
    if (user.starcoin < totalCost) {
      return res.status(400).json({ 
        success: false, 
        message: '星源币不足' 
      });
    }
    
    // 扣除星源币
    const oldStarcoin = user.starcoin;
    user.starcoin -= totalCost;
    await user.save();
    
    // 按照策划案：只能抽取娃娃，随机属性
    const rewards = [];
    const elements = ['金', '木', '水', '火', '土'];
    const elementEmojis = {
      '金': '⚡',
      '木': '🌿', 
      '水': '💧',
      '火': '🔥',
      '土': '🗿'
    };
    
    for (let i = 0; i < drawCount; i++) {
      // 随机选择属性
      const randomIndex = Math.floor(Math.random() * elements.length);
      const element = elements[randomIndex];
      
      // 命名规则：一级娃娃-木，以此类推
      const dollName = `一级娃娃-${element}`;
      const dollEmoji = elementEmojis[element];
      
      const reward = {
        type: 'doll',
        name: dollName,
        emoji: dollEmoji,
        element: element
      };
      
      rewards.push(reward);
      
      // 创建娃娃 - 按照策划案的一级娃娃配置
      const newDoll = new Doll({
        userId,
        name: dollName,
        emoji: dollEmoji,
        description: `${element}属性的一级娃娃`,
        level: 1, // 只能抽到一级娃娃
        rarity: '普通',
        purchasePrice: 0, // 抽取的娃娃无购买价格
        productionPerDay: 17.5, // 一级娃娃日产出：525÷30=17.5
        totalDays: 30, // 产出周期30天
        remainingDays: 30,
        totalProduced: 0,
        isExpired: false,
        isRecycled: false,
        isDeployed: false,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await newDoll.save();
    }
    
    // 记录交易
    await new Transaction({
      userId,
      type: 'lucky_draw',
      amount: -totalCost,
      currency: 'starcoin', // 🔥 修复：使用星源币
      balance: user.starcoin,
      description: `幸运抽取${drawCount}次`,
      metadata: { rewards, drawType }
    }).save();
    
    const responseData = drawCount === 1 ? 
      { reward: rewards[0] } : 
      { rewards };
    
    res.json({
      success: true,
      message: '抽取成功',
      data: {
        ...responseData,
        oldStarcoin: parseFloat(oldStarcoin).toFixed(1),
        newStarcoin: parseFloat(user.starcoin).toFixed(1)
      }
    });
    
  } catch (error) {
    console.error('❌ 幸运抽取失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '抽取失败', 
      error: error.message 
    });
  }
};

// 🔥 修复：领取今日收益 - 只返回星源币
exports.claimDailyEarnings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 🔥 修复：检查今日是否已领取星源币收益
    const today = new Date().toDateString();
    const existingTransaction = await Transaction.findOne({
      userId: userId,
      type: 'production',
      currency: 'starcoin', // 🔥 修复：检查星源币收益
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

    // 🔥 修复：只获取出战的娃娃
    const dolls = await Doll.find({
      userId: userId,
      isRecycled: false,
      isExpired: false,
      isDeployed: true // 🔥 修复：只有出战的娃娃才产出
    });

    if (dolls.length === 0) {
      return res.status(400).json({
        success: false,
        message: '暂无出战的娃娃产出星源币'
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
          dailyEarning: parseFloat(dailyEarning).toFixed(1),
          currency: 'starcoin'
        });
        await doll.save();
      }
    }

    if (totalEarnings === 0) {
      return res.status(400).json({
        success: false,
        message: '今日暂无娃娃产出星源币'
      });
    }

    // 🔥 修复：增加用户星源币
    const user = await User.findById(userId);
    const oldStarcoin = user.starcoin;
    user.starcoin += totalEarnings;
    await user.save();

    // 🔥 修复：记录星源币交易
    const transaction = new Transaction({
      userId: userId,
      type: 'production',
      amount: parseFloat(totalEarnings).toFixed(1),
      currency: 'starcoin', // 🔥 修复：货币类型为星源币
      balance: user.starcoin,
      description: `今日娃娃产出星源币收益`,
      metadata: {
        earningDetails: earningDetails,
        totalDolls: dolls.length,
        producingDolls: earningDetails.length,
        currency: 'starcoin'
      }
    });
    await transaction.save();

    res.json({
      success: true,
      message: `成功领取今日收益 ${parseFloat(totalEarnings).toFixed(1)} 星源币`,
      data: {
        totalEarnings: parseFloat(totalEarnings).toFixed(1),
        oldStarcoin: parseFloat(oldStarcoin).toFixed(1),
        newStarcoin: parseFloat(user.starcoin).toFixed(1),
        earningDetails: earningDetails,
        totalDolls: dolls.length,
        producingDolls: earningDetails.length,
        currency: 'starcoin'
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

// 🔥 修复：回收娃娃 - 只给星源币
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

    // 🔥 修复：只给星源币，移除经验
    const recycleRate = 0.3; // 30%回收率
    const recycleStarcoin = Math.floor(doll.purchasePrice * recycleRate);
    
    doll.isRecycled = true;
    doll.isDeployed = false;
    await doll.save();

    // 🔥 修复：增加用户星源币
    const user = await User.findById(userId);
    const oldStarcoin = user.starcoin;
    user.starcoin += recycleStarcoin;
    await user.save();

    // 🔥 修复：记录星源币交易
    await new Transaction({
      userId: userId,
      type: 'recycle',
      amount: parseFloat(recycleStarcoin).toFixed(1),
      currency: 'starcoin', // 🔥 修复：货币类型为星源币
      balance: user.starcoin,
      description: `回收娃娃: ${doll.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel: doll.level,
        dollName: doll.name,
        remainingDays: doll.remainingDays,
        recycleStarcoin: parseFloat(recycleStarcoin).toFixed(1),
        currency: 'starcoin'
      }
    }).save();

    res.json({
      success: true,
      message: '回收成功',
      data: {
        recycleStarcoin: parseFloat(recycleStarcoin).toFixed(1),
        oldStarcoin: parseFloat(oldStarcoin).toFixed(1),
        newStarcoin: parseFloat(user.starcoin).toFixed(1),
        currency: 'starcoin'
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
          productionPerDay: parseFloat(mainDoll.productionPerDay).toFixed(1),
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
          productionPerDay: parseFloat(doll.productionPerDay).toFixed(1),
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
          productionPerDay: parseFloat(doll.productionPerDay).toFixed(1),
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

console.log('✅ dollController 所有方法已导出（星源币版本）');
