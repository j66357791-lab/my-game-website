const Doll = require('../models/Doll');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 🔧 超强调试版本：每个步骤都记录详细信息
exports.purchaseDoll = async (req, res) => {
  try {
    console.log('🧸 ========== 超强调试版本 ==========');
    console.log('📡 请求体原始数据:', JSON.stringify(req.body, null, 2));
    console.log('📡 请求用户ID:', req.user?.id);
    console.log('📡 Doll模型是否存在:', !!Doll);
    
    const { dollLevel, dollId } = req.body;
    const userId = req.user.id;

    console.log(`🔍 解析后的数据:`);
    console.log(`  - dollLevel: ${dollLevel} (类型: ${typeof dollLevel})`);
    console.log(`  - dollId: ${dollId} (类型: ${typeof dollId})`);
    console.log(`  - userId: ${userId}`);

    // 🔧 验证数据
    if (dollLevel === undefined || dollLevel === null) {
      console.error('❌ dollLevel 为 undefined 或 null');
      return res.status(400).json({
        success: false,
        message: '娃娃等级不能为空',
        debug: { dollLevel, dollId, userId }
      });
    }

    const parsedDollLevel = parseInt(dollLevel);
    console.log(`🔍 parseInt 结果: ${parsedDollLevel} (类型: ${typeof parsedDollLevel})`);
    
    if (isNaN(parsedDollLevel)) {
      console.error('❌ parseInt 失败，结果为 NaN');
      return res.status(400).json({
        success: false,
        message: '娃娃等级必须是数字',
        debug: { dollLevel, parsedDollLevel }
      });
    }

    console.log(`✅ 数据验证通过: parsedDollLevel=${parsedDollLevel}`);

    // 🔧 获取娃娃配置
    console.log(`🔍 开始获取娃娃配置...`);
    const dollConfig = Doll.getDollConfig(parsedDollLevel);
    console.log(`🔍 娃娃配置结果:`, dollConfig);
    
    if (!dollConfig) {
      console.error(`❌ 娃娃配置不存在: level=${parsedDollLevel}`);
      return res.status(400).json({
        success: false,
        message: '娃娃配置不存在',
        debug: { parsedDollLevel, availableLevels: Object.keys(Doll.getDollConfigs?.() || {}) }
      });
    }

    // 🔧 获取用户
    console.log(`🔍 开始获取用户: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ 用户不存在: ${userId}`);
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        debug: { userId }
      });
    }
    console.log(`✅ 用户获取成功: ${user.username}, 积分: ${user.points}`);

    if (user.points < dollConfig.purchasePrice) {
      console.error(`❌ 积分不足: ${user.points} < ${dollConfig.purchasePrice}`);
      return res.status(400).json({
        success: false,
        message: '积分不足',
        debug: { userPoints: user.points, required: dollConfig.purchasePrice }
      });
    }

    // 🔧 构建娃娃数据
    console.log(`🔍 开始构建娃娃数据...`);
    const dollData = {
      userId: userId,
      name: dollConfig.name,
      level: parsedDollLevel, // 🔧 关键：确保这里是数字
      emoji: dollConfig.emoji,
      description: dollConfig.description,
      rarity: dollConfig.rarity,
      purchasePrice: dollConfig.purchasePrice,
      productionPerDay: dollConfig.productionPerDay,
      totalDays: dollConfig.totalDays,
      remainingDays: dollConfig.totalDays
    };

    console.log(`🔍 构建的娃娃数据:`, JSON.stringify(dollData, null, 2));
    console.log(`🔍 特别检查 level 字段: ${dollData.level} (类型: ${typeof dollData.level})`);

    // 🔧 创建娃娃实例
    console.log(`🔍 开始创建娃娃实例...`);
    const doll = new Doll(dollData);
    
    console.log(`🔍 娃娃实例创建完成，检查字段:`);
    console.log(`  - doll.level: ${doll.level} (类型: ${typeof doll.level})`);
    console.log(`  - doll.name: ${doll.name}`);
    console.log(`  - doll.userId: ${doll.userId}`);

    // 🔧 手动验证
    console.log(`🔍 开始手动验证...`);
    try {
      const validationResult = doll.validateSync();
      if (validationResult) {
        console.error(`❌ 娃娃验证失败:`, validationResult);
        console.error(`❌ 验证错误详情:`, validationResult.errors);
        throw new Error('娃娃数据验证失败: ' + validationResult.message);
      }
      console.log(`✅ 娃娃验证通过`);
    } catch (validationError) {
      console.error(`❌ 验证过程出错:`, validationError);
      throw validationError;
    }

    // 🔧 保存娃娃
    console.log(`🔍 开始保存娃娃到数据库...`);
    await doll.save();
    console.log(`✅ 娃娃保存成功: dollId=${doll._id}`);

    // 扣除积分
    console.log(`🔍 开始扣除积分...`);
    const oldPoints = user.points;
    user.points -= dollConfig.purchasePrice;
    await user.save();
    console.log(`✅ 积分扣除成功: ${oldPoints} -> ${user.points}`);

    // 记录交易
    console.log(`🔍 开始记录交易...`);
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
    console.log(`✅ 交易记录成功`);

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
    console.error('❌ 错误消息:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message,
      debug: {
        requestBody: req.body,
        userId: req.user?.id,
        errorName: error.name,
        errorMessage: error.message
      }
    });
  }
};

// 其他方法保持不变...
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

exports.getUserDolls = async (req, res) => {
  try {
    const userId = req.user.id;
    const dolls = await Doll.find({ userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { dolls }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取娃娃列表失败',
      error: error.message
    });
  }
};

exports.recycleDoll = async (req, res) => {
  try {
    const { dollId } = req.params;
    const userId = req.user.id;

    const doll = await Doll.findOne({ _id: dollId, userId });
    if (!doll) {
      return res.status(404).json({
        success: false,
        message: '娃娃不存在'
      });
    }

    const recycleResult = doll.recycle();
    await doll.save();

    const user = await User.findById(userId);
    user.points += recycleResult.reward;
    user.experience += recycleResult.experience;
    await user.save();

    res.json({
      success: true,
      message: '回收成功',
      data: {
        recyclePoints: recycleResult.reward,
        experience: recycleResult.experience,
        userPoints: user.points
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
