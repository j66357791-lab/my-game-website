const ImmortalDoll = require('../models/ImmortalDoll');
const User = require('../models/User');
const config = require('../utils/realmConfig');

// 获取我的娃娃
const getMyDoll = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    res.json({ success: true, data: { doll } });
  } catch (error) {
    console.error('获取娃娃失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 创建/转生娃娃
const createDoll = async (req, res) => {
  try {
    const { faction, gender } = req.body;
    
    // 校验
    if (!['仙', '魔', '道'].includes(faction) || !['男', '女'].includes(gender)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    // 检查是否已存在
    const existing = await ImmortalDoll.findOne({ userId: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: '您已拥有娃娃，无法重复创建' });
    }

    // 根据需求设定初始属性
    let baseAttrs = { attack: 0, health: 0, defense: 0, aptitude: 0, critRate: 0, dodgeRate: 0 };
    
    if (faction === '仙') {
      baseAttrs.attack = 1;
      baseAttrs.health = 30;
    } else if (faction === '魔') {
      baseAttrs.attack = 3;
      baseAttrs.health = 10;
    } else if (faction === '道') {
      baseAttrs.attack = 1;
      baseAttrs.health = 10;
      baseAttrs.defense = 1;
    }

    const newDoll = new ImmortalDoll({
      userId: req.user._id,
      faction,
      gender,
      baseAttributes: baseAttrs,
      availableAttributePoints: 5 // ✅ 新手赠送5点
    });

    await newDoll.save();
    console.log(`✅ 用户 ${req.user.username} 创建了 ${faction}${gender}娃娃`);

    res.json({
      success: true,
      message: '开修成功！',
      data: { doll: newDoll }
    });
  } catch (error) {
    console.error('创建娃娃失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 领取灵气
const collectSpirit = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });

    const now = new Date();
    const lastTime = doll.spiritPool.lastCollectedAt || doll.createdAt; 
    const hoursPassed = (now - lastTime) / (1000 * 60 * 60);
    const spiritGain = Math.floor(hoursPassed * doll.spiritPool.productionRate);

    doll.spiritualEnergy += spiritGain;
    doll.spiritPool.lastCollectedAt = now;
    await doll.save();

    console.log(`✅ 用户 ${req.user.username} 领取灵气: +${spiritGain}`);
    res.json({ 
      success: true, 
      message: `领取成功！获得 ${spiritGain} 灵气`,
      data: { doll, spiritGain }
    });
  } catch (error) {
    console.error('领取灵气失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 升级灵气池 (消耗灵气石)
const upgradeSpiritPool = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });

    const currentLevel = doll.spiritPool.level;
    const cost = Math.floor(config.spiritPool.baseCost * Math.pow(config.spiritPool.costMultiplier, currentLevel - 1));

    const user = await User.findById(req.user._id);
    if (!user.spiritStones) user.spiritStones = 0;

    if (user.spiritStones < cost) {
      return res.status(400).json({ 
        success: false, 
        message: `灵气石不足！需要 ${cost} 灵气石，当前拥有 ${user.spiritStones}` 
      });
    }

    user.spiritStones -= cost;
    doll.spiritPool.level += 1;
    doll.spiritPool.productionRate += config.spiritPool.rateIncrement;

    await user.save();
    await doll.save();

    console.log(`✅ 用户 ${req.user.username} 消耗 ${cost} 灵气石升级灵气池到 Lv.${doll.spiritPool.level}`);
    res.json({ 
      success: true, 
      message: `升级成功！当前产出 +${doll.spiritPool.productionRate}/h`,
      data: { doll, newSpiritStones: user.spiritStones }
    });
  } catch (error) {
    console.error('升级灵气池失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// ✅ 分配属性点 (完整版)
const allocateAttributes = async (req, res) => {
  try {
    const { attributeType } = req.body;
    
    // ✅ 包含了所有属性：攻、血、防、资、暴、闪
    const allowedTypes = ['attack', 'health', 'defense', 'aptitude', 'critRate', 'dodgeRate'];
    if (!allowedTypes.includes(attributeType)) {
      return res.status(400).json({ success: false, message: '无效的属性类型' });
    }

    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });

    if (doll.availableAttributePoints <= 0) {
      return res.status(400).json({ success: false, message: '可用属性点不足' });
    }

    // 加点
    doll.baseAttributes[attributeType] = (doll.baseAttributes[attributeType] || 0) + 1;
    doll.availableAttributePoints -= 1;

    await doll.save();

    console.log(`✅ 用户 ${req.user.username} 添加了 1 点 ${attributeType}`);
    res.json({ 
      success: true, 
      message: `加点成功！`,
      data: { doll }
    });
  } catch (error) {
    console.error('分配属性失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = {
  getMyDoll,
  createDoll,
  collectSpirit,
  upgradeSpiritPool,
  allocateAttributes // ✅ 记得导出
};
