const ImmortalDoll = require('../models/ImmortalDoll');
const User = require('../models/User');
const config = require('../utils/realmConfig');

const getMyDoll = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.json({ success: true, data: { doll: null } }); // 返回null而不是404
    
    // 计算实际灵气产出 = 灵气池等级 + 资质
    // 注意：这里的 productionRate 我们需要在获取时实时计算，或者存储时包含资质
    // 为了简单，我们这里前端只读 doll.spiritPool.level，前端计算时加上 aptitude
    res.json({ success: true, data: { doll } });
  } catch (error) {
    console.error('获取娃娃失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const createDoll = async (req, res) => {
  try {
    const { faction, gender } = req.body;
    if (!['仙', '魔', '道'].includes(faction) || !['男', '女'].includes(gender)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }
    const existing = await ImmortalDoll.findOne({ userId: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: '您已拥有娃娃' });

    // 初始属性全0
    const baseAttrs = { 
      attack: 0, health: 0, defense: 0, aptitude: 0, 
      critRate: 0, antiCritRate: 0, dodgeRate: 0, antiDodgeRate: 0 
    };

    const newDoll = new ImmortalDoll({
      userId: req.user._id,
      faction, gender, baseAttributes: baseAttrs,
      // ✅ 初始给一点灵气方便测试
      spiritualEnergy: 100 
    });
    await newDoll.save();
    res.json({ success: true, message: '开修成功！', data: { doll: newDoll } });
  } catch (error) {
    console.error('创建娃娃失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 收集灵气
const collectSpirit = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });

    const now = new Date();
    const lastTime = doll.spiritPool.lastCollectedAt || doll.createdAt; 
    const hoursPassed = (now - lastTime) / (1000 * 60 * 60);
    
    // ✅ 产出计算：灵气池等级 + 资质
    // 注意：doll.spiritPool.level 在数据库是数字，doll.baseAttributes.aptitude 也是数字
    // 例如 池Lv1 + 资质5 = 6/h
    const totalRate = doll.spiritPool.level + doll.baseAttributes.aptitude;
    
    const spiritGain = Math.floor(hoursPassed * totalRate);

    doll.spiritualEnergy += spiritGain;
    doll.spiritPool.lastCollectedAt = now;
    await doll.save();

    res.json({ success: true, message: `领取成功！获得 ${spiritGain} 灵气`, data: { doll, spiritGain } });
  } catch (error) {
    console.error('领取灵气失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 升级灵气池
const upgradeSpiritPool = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });

    const currentLevel = doll.spiritPool.level;
    const maxLevel = config.getPoolMax(doll.realm);

    if (currentLevel >= maxLevel) {
      return res.status(400).json({ success: false, message: `当前 ${doll.realm} 境界灵气池已达上限 Lv.${maxLevel}，请先突破境界！` });
    }

    const cost = config.spiritPool.costPerLevel; // 固定1个灵气石
    const user = await User.findById(req.user._id);
    if (!user.spiritStones) user.spiritStones = 0;

    if (user.spiritStones < cost) {
      return res.status(400).json({ success: false, message: `灵气石不足！需要 ${cost} 灵气石` });
    }

    user.spiritStones -= cost;
    doll.spiritPool.level += 1;
    // doll.spiritPool.productionRate 已经改为计算属性，这里只存 level 即可

    await user.save();
    await doll.save();

    res.json({ success: true, message: `升级成功！灵气池等级 Lv.${doll.spiritPool.level}`, data: { doll } });
  } catch (error) {
    console.error('升级灵气池失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// ✅ 新增：小层级升级 (核心循环)
const levelUp = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });

    // 1. 获取当前境界的配置表
    const levelTable = config.getLevelTable(doll.realm);
    const nextLevelConfig = levelTable.find(l => l.level === doll.level + 1);

    if (!nextLevelConfig) {
      return res.status(400).json({ success: false, message: '当前境界已圆满，请进行境界突破！' });
    }

    // 2. 检查灵气
    if (doll.spiritualEnergy < nextLevelConfig.cost) {
      return res.status(400).json({ 
        success: false, 
        message: `灵气不足！升级到 ${doll.realm}${nextLevelConfig}级 需要 ${nextLevelConfig.cost} 灵气` 
      });
    }

    // 3. 扣除并升级
    doll.spiritualEnergy -= nextLevelConfig.cost;
    doll.level += 1;
    doll.availableAttributePoints += nextLevelConfig.reward;

    await doll.save();
    console.log(`✅ 用户 ${req.user.username} 升级至 ${doll.realm}${doll.level}级，获得 ${nextLevelConfig.reward} 属性点`);

    res.json({
      success: true,
      message: `升级成功！获得 ${nextLevelConfig.reward} 属性点`,
      data: { doll }
    });
  } catch (error) {
    console.error('升级失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// ✅ 境界突破 (大境界)
const attemptBreakthrough = async (req, res) => {
  try {
    const { pillType } = req.body; // 洗髓丹类型
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });

    // 1. 检查是否满足突破条件 (当前境界10级)
    if (doll.level < 10) {
      return res.status(400).json({ success: false, message: '需达到10级圆满方可突破！' });
    }

    // 2. 检查是否有下一境界
    const realmMap = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘'];
    const currentIdx = realmMap.indexOf(doll.realm);
    const nextRealmName = realmMap[currentIdx + 1];
    if (!nextRealmName) {
      return res.status(400).json({ success: false, message: '已臻至化境，无需突破！' });
    }

    // 3. 计算成功率 (基础 60%)
    let successRate = 0.6;
    // TODO: 这里应该检查用户背包是否有洗髓丹，并扣除。目前假设前端传入了 pillType
    if (pillType && config.marrowBonus[pillType]) {
      successRate += config.marrowBonus[pillType];
    }
    // 上限 100%
    if (successRate > 1.0) successRate = 1.0;

    const isSuccess = Math.random() <= successRate;

    if (isSuccess) {
      // --- 成功 ---
      // 1. 转换境界
      doll.realm = nextRealmName;
      doll.level = 1; // 重置为1级
      
      // 2. 奖励属性点 (1-5 随机)
      const rewardPoints = Math.floor(Math.random() * 5) + 1;
      doll.availableAttributePoints += rewardPoints;

      // 3. 奖励资质 (1-100 随机)
      const rewardAptitude = Math.floor(Math.random() * 100) + 1;
      doll.baseAttributes.aptitude += rewardAptitude;

      await doll.save();
      console.log(`✅ 突破成功：${nextRealmName}，资质+${rewardAptitude}`);

      res.json({
        success: true,
        message: `渡劫成功！境界晋升【${nextRealmName}】！资质提升 ${rewardAptitude}，获得 ${rewardPoints} 点奖励`,
        data: { doll }
      });

    } else {
      // --- 失败 ---
      const penalty = 20000;
      doll.spiritualEnergy -= penalty;
      await doll.save();
      console.log(`⚠️ 突破失败，扣除 ${penalty} 灵气`);

      res.json({
        success: false, // 业务失败
        message: `渡劫失败！雷劫太强，扣除 ${penalty} 灵气`,
        data: { doll }
      });
    }

  } catch (error) {
    console.error('境界突破失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 属性加点 (逻辑不变，但需要包含新属性)
const allocateAttributes = async (req, res) => {
  try {
    const { attributeType } = req.body;
    const allowedTypes = ['attack', 'health', 'defense', 'aptitude', 'critRate', 'dodgeRate', 'antiCritRate', 'antiDodgeRate'];
    
    if (!allowedTypes.includes(attributeType)) {
      return res.status(400).json({ success: false, message: '无效的属性类型' });
    }

    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });
    if (doll.availableAttributePoints <= 0) {
      return res.status(400).json({ success: false, message: '可用属性点不足' });
    }

    // ✅ 特殊处理：百分比属性
    if (['critRate', 'dodgeRate', 'antiCritRate', 'antiDodgeRate'].includes(attributeType)) {
      doll.baseAttributes[attributeType] += 0.001; // 加 0.1%
    } else {
      doll.baseAttributes[attributeType] += 1;
    }

    doll.availableAttributePoints -= 1;
    await doll.save();

    res.json({ success: true, message: '加点成功！', data: { doll } });
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
  levelUp, // ✅ 新增
  attemptBreakthrough, // ✅ 修改
  allocateAttributes
};
