// backend/controllers/dollController.js - 重构版
const Doll = require('../models/Doll');
const User = require('../models/User');

// 抽取娃娃 (Gacha)
exports.drawDoll = async (req, res) => {
  try {
    const userId = req.user.id;
    const DRAW_COST = 500; // 假设每次抽取消耗500星源币

    const user = await User.findById(userId);
    if (user.starcoin < DRAW_COST) {
      return res.status(400).json({ success: false, message: '星源币不足' });
    }

    // 简单的随机等级算法 (1-6级，概率可自定义)
    const level = Math.floor(Math.random() * 6) + 1;
    const config = Doll.getDollConfigByLevel(level);
    
    if (!config) {
        return res.status(500).json({ success: false, message: '娃娃配置错误' });
    }

    // 随机一个属性
    const attributes = ['fire', 'water', 'wood', 'light', 'dark'];
    const randomAttribute = attributes[Math.floor(Math.random() * attributes.length)];

    const newDoll = new Doll({
      userId: userId,
      name: config.name,
      level: level,
      attribute: randomAttribute,
      emoji: '🧸', // 可以根据等级或属性配置不同的emoji
    });

    await newDoll.save();

    user.starcoin -= DRAW_COST;
    await user.save();

    res.json({
      success: true,
      message: `成功抽取 ${config.name}`,
      data: { doll: newDoll, cost: DRAW_COST, newStarcoin: user.starcoin }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 获取用户背包中的娃娃 (空闲状态)
exports.getDollInventory = async (req, res) => {
  try {
    const userId = req.user.id;
    const dolls = await Doll.find({ userId: userId, status: 'idle' }).sort({ createdAt: -1 });
    res.json({ success: true, data: { dolls } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 派遣娃娃出战
exports.deployDoll = async (req, res) => {
  try {
    const { dollId } = req.body;
    const userId = req.user.id;
    const MAX_DEPLOYMENT_SLOTS = 5;

    // 检查出战位是否已满
    const deployedCount = await Doll.countDocuments({ userId, status: 'deployed' });
    if (deployedCount >= MAX_DEPLOYMENT_SLOTS) {
      return res.status(400).json({ success: false, message: '出战位已满' });
    }

    const doll = await Doll.findOne({ _id: dollId, userId, status: 'idle' });
    if (!doll) {
      return res.status(404).json({ success: false, message: '娃娃不存在或已在出战中' });
    }

    doll.status = 'deployed';
    doll.deployment_date = new Date();
    await doll.save();

    res.json({ success: true, message: '出战成功', data: { doll } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 召回娃娃
exports.recallDoll = async (req, res) => {
  try {
    const { dollId } = req.body;
    const userId = req.user.id;

    const doll = await Doll.findOne({ _id: dollId, userId, status: 'deployed' });
    if (!doll) {
      return res.status(404).json({ success: false, message: '娃娃不存在或未在出战中' });
    }

    doll.status = 'idle';
    doll.deployment_date = undefined;
    await doll.save();

    res.json({ success: true, message: '召回成功', data: { doll } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 获取出战位的娃娃
exports.getDeploymentSlots = async (req, res) => {
  try {
    const userId = req.user.id;
    const deployedDolls = await Doll.find({ userId, status: 'deployed' }).sort({ deployment_date: 1 });
    res.json({ success: true, data: { dolls: deployedDolls } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};

// 合成娃娃
exports.synthesizeDoll = async (req, res) => {
  try {
    const { baseDollId, materialDollIds } = req.body; // baseDollId: 本体, materialDollIds: 材料(数组)
    const userId = req.user.id;

    if (!baseDollId || !materialDollIds || materialDollIds.length !== 4) {
      return res.status(400).json({ success: false, message: '合成需要1个本体和4个材料' });
    }

    // 1. 查找并验证本体
    const baseDoll = await Doll.findOne({ _id: baseDollId, userId, status: 'idle' });
    if (!baseDoll) {
      return res.status(404).json({ success: false, message: '本体娃娃不存在或不可用' });
    }
    if (baseDoll.level >= 6) {
      return res.status(400).json({ success: false, message: '已达到最高等级，无法合成' });
    }

    // 2. 查找并验证材料
    const materialDolls = await Doll.find({ _id: { $in: materialDollIds }, userId, status: 'idle' });
    if (materialDolls.length !== 4) {
      return res.status(400).json({ success: false, message: '材料娃娃不足或不可用' });
    }

    // 3. 校验属性和等级是否一致
    const isSameLevelAndAttribute = materialDolls.every(
      doll => doll.level === baseDoll.level && doll.attribute === baseDoll.attribute
    );
    if (!isSameLevelAndAttribute) {
      return res.status(400).json({ success: false, message: '所有娃娃必须为相同等级和属性' });
    }

    // 4. 执行合成
    const newLevel = baseDoll.level + 1;
    const newConfig = Doll.getDollConfigByLevel(newLevel);
    if (!newConfig) {
        return res.status(500).json({ success: false, message: '合成配置错误' });
    }

    // 删除4个材料
    await Doll.deleteMany({ _id: { $in: materialDollIds } });

    // 升级本体
    baseDoll.name = newConfig.name;
    baseDoll.level = newLevel;
    await baseDoll.save();

    res.json({
      success: true,
      message: `恭喜！合成成功，获得 ${newConfig.name}`,
      data: { upgradedDoll: baseDoll }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
};
