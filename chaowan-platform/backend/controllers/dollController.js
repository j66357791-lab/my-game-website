// backend/controllers/dollController.js
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

// 购买娃娃（使用starcoin）
exports.purchaseDoll = async (req, res) => {
  try {
    const { dollLevel } = req.body;
    const userId = req.user.id;

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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 🔧 使用starcoin购买，而不是points
    if (user.starcoin < dollConfig.purchasePrice) {
      return res.status(400).json({
        success: false,
        message: '星源币不足'
      });
    }

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

    // 扣除starcoin
    const oldStarcoin = parseFloat(user.starcoin);
    user.starcoin -= dollConfig.purchasePrice;
    await user.save();

    // 记录交易
    await new Transaction({
      userId: userId,
      type: 'doll_purchase',
      amount: -dollConfig.purchasePrice,
      currency: 'starcoin',
      balance: user.starcoin,
      description: `购买娃娃: ${dollConfig.name}`,
      relatedId: doll._id,
      metadata: {
        dollLevel: parsedDollLevel,
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
