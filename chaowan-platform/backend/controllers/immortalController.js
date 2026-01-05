const ImmortalDoll = require('../models/ImmortalDoll');
const User = require('../models/User');
const ImmortalEquipment = require('../models/ImmortalEquipment');
const config = require('../utils/realmConfig');

// ==========================================
// ✅ 装备与属性计算配置
// ==========================================

// 基础属性表
const GEAR_BASE_STATS = {
  weapon: { attack: 5, health: 0, defense: 0, speed: 0, critRate: 0, dodgeRate: 0, antiCritRate: 0, antiDodgeRate: 0 },
  armor: { attack: 0, health: 50, defense: 0, speed: 0, critRate: 0, dodgeRate: 0, antiCritRate: 0, antiDodgeRate: 0 },
  shoes: { attack: 0, health: 0, defense: 0, speed: 0, critRate: 0, dodgeRate: 0.002, antiCritRate: 0, antiDodgeRate: 0 },
  belt: { attack: 0, health: 0, defense: 5, speed: 0, critRate: 0, dodgeRate: 0, antiCritRate: 0, antiDodgeRate: 0 },
  clothes: { attack: 0, health: 30, defense: 2, speed: 0, critRate: 0, dodgeRate: 0, antiCritRate: 0, antiDodgeRate: 0 },
  pants: { attack: 0, health: 0, defense: 0, speed: 0, critRate: 0, dodgeRate: 0, antiCritRate: 0.002, antiDodgeRate: 0.002 },
};

// 每级成长属性
const GEAR_GROWTH = {
  weapon: { attack: 1 },
  armor: { health: 10 },
  shoes: { dodgeRate: 0.001 },
  belt: { defense: 1 },
  clothes: { health: 10, defense: 0.5 },
  pants: { antiCritRate: 0.001, antiDodgeRate: 0.001 },
};

// 词条池
const AFFIX_POOL = {
  red: [
    { name: '灵气获取+10%', type: 'spiritRate', value: 0.1 },
    { name: '攻击+20', type: 'attack', value: 20 }, { name: '生命+300', type: 'health', value: 300 },
    { name: '防御+15', type: 'defense', value: 15 }, { name: '速度+10', type: 'speed', value: 10 },
    { name: '暴击+5%', type: 'critRate', value: 0.05 }, { name: '闪避+5%', type: 'dodgeRate', value: 0.05 },
    { name: '抗暴+8%', type: 'antiCritRate', value: 0.08 }, { name: '抗闪+8%', type: 'antiDodgeRate', value: 0.08 },
  ],
  orange: [
    { name: '灵气+5%', type: 'spiritRate', value: 0.05 },
    { name: '攻击+10', type: 'attack', value: 10 }, { name: '生命+150', type: 'health', value: 150 },
    { name: '防御+10', type: 'defense', value: 10 }, { name: '速度+5', type: 'speed', value: 5 },
    { name: '暴击+2%', type: 'critRate', value: 0.02 }, { name: '闪避+2%', type: 'dodgeRate', value: 0.02 },
    { name: '抗暴+4%', type: 'antiCritRate', value: 0.04 }, { name: '抗闪+4%', type: 'antiDodgeRate', value: 0.04 },
  ],
  purple: [
    { name: '灵气+3%', type: 'spiritRate', value: 0.03 },
    { name: '攻击+5', type: 'attack', value: 5 }, { name: '生命+50', type: 'health', value: 50 },
    { name: '防御+5', type: 'defense', value: 5 }, { name: '速度+3', type: 'speed', value: 3 },
    { name: '暴击+1%', type: 'critRate', value: 0.01 }, { name: '闪避+1%', type: 'dodgeRate', value: 0.01 },
    { name: '抗暴+2%', type: 'antiCritRate', value: 0.02 }, { name: '抗闪+2%', type: 'antiDodgeRate', value: 0.02 },
  ],
  blue: [
    { name: '灵气+1%', type: 'spiritRate', value: 0.01 },
    { name: '攻击+3', type: 'attack', value: 3 }, { name: '生命+30', type: 'health', value: 30 },
    { name: '防御+3', type: 'defense', value: 3 }, { name: '速度+1', type: 'speed', value: 1 },
  ],
  white: [
    { name: '攻击+1', type: 'attack', value: 1 }, { name: '生命+10', type: 'health', value: 10 },
    { name: '防御+1', type: 'defense', value: 1 },
  ]
};

// 计算单件装备的最终属性
const calculateEquipStats = (equip) => {
  const slot = equip.slot;
  const base = GEAR_BASE_STATS[slot] || {};
  const growth = GEAR_GROWTH[slot] || {};
  const level = equip.level || 0;
  const star = equip.star || 0;
  const affixes = equip.affixes || [];

  let stats = { ...base };
  // 1. 等级加成
  for (let key in growth) {
    stats[key] = (stats[key] || 0) + (growth[key] * level);
  }

  // 2. 星级加成 (每星属性提升100%)
  const starMultiplier = 1 + star;
  for (let key in stats) {
    if (key !== 'type') stats[key] = stats[key] * starMultiplier;
  }

  // 3. 词条加成
  affixes.forEach(affix => {
    stats[affix.type] = (stats[affix.type] || 0) + affix.value;
  });

  return stats;
};

// ✅ 生成固定属性的装备 (掉落用)
const createFixedEquip = (userId, slot) => {
  const baseStats = GEAR_BASE_STATS[slot];
  return new ImmortalEquipment({
    userId, slot, level: 1, star: 0, quality: 'common',
    attributes: baseStats, // 初始基础
    affixes: []
  });
};

// ==========================================
// ✅ 核心计算函数：获取角色完整数据与战力 (修复崩溃版)
// ==========================================
const calculateDollFullStats = async (input) => {
  let doll = null;

  // 策略：先尝试当做 Doll ID 查找，找不到则当做 User ID 查找
  doll = await ImmortalDoll.findOne({ _id: input })
    .populate('equipmentSlots.weapon')
    .populate('equipmentSlots.armor')
    .populate('equipmentSlots.shoes')
    .populate('equipmentSlots.belt')
    .populate('equipmentSlots.clothes')
    .populate('equipmentSlots.pants');
  
  if (!doll) {
    doll = await ImmortalDoll.findOne({ userId: input })
      .populate('equipmentSlots.weapon')
      .populate('equipmentSlots.armor')
      .populate('equipmentSlots.shoes')
      .populate('equipmentSlots.belt')
      .populate('equipmentSlots.clothes')
      .populate('equipmentSlots.pants');
  }

  if (!doll) return null;

  // ✅ 关键修复：如果 equipmentSlots 未定义，初始化为空对象，防止 Object.keys 崩溃
  if (!doll.equipmentSlots) {
    doll.equipmentSlots = {};
  }

  // 累加属性
  const attrs = { ...doll.baseAttributes };
  let totalSpiritRate = 0;

  Object.keys(doll.equipmentSlots).forEach(slot => {
    const equip = doll.equipmentSlots[slot];
    if (equip) {
      const stats = calculateEquipStats(equip);
      attrs.attack += (stats.attack || 0);
      attrs.health += (stats.health || 0);
      attrs.defense += (stats.defense || 0);
      attrs.critRate += (stats.critRate || 0);
      attrs.dodgeRate += (stats.dodgeRate || 0);
      attrs.antiCritRate += (stats.antiCritRate || 0);
      attrs.antiDodgeRate += (stats.antiDodgeRate || 0);
      attrs.speed += (stats.speed || 0);
      totalSpiritRate += (stats.spiritRate || 0);
    }
  });

  attrs.totalSpiritRate = totalSpiritRate;

  // 计算战力 (CP)
  let cp = 0;
  cp += attrs.attack * 10;
  cp += Math.floor(attrs.health / 10) * 10;
  cp += attrs.defense * 5;
  cp += Math.floor(attrs.critRate * 100) * 20;
  cp += Math.floor(attrs.dodgeRate * 100) * 20;

  return {
    totalAttributes: attrs,
    realCombatPower: cp,
    doll
  };
};

// ==========================================
// Controller Methods
// ==========================================

const getMyDoll = async (req, res) => {
  try {
    // 传入 userId
    const statsData = await calculateDollFullStats(req.user._id);
    if (!statsData) return res.json({ success: true, data: { doll: null } });
    
    const { totalAttributes, realCombatPower, doll } = statsData;
    const dollObj = doll.toObject();
    dollObj.totalAttributes = totalAttributes;
    dollObj.realCombatPower = realCombatPower;
    
    res.json({ success: true, data: { doll: dollObj } });
  } catch (error) {
    console.error('获取娃娃失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const createDoll = async (req, res) => {
  try {
    const { faction, gender } = req.body;
    if (!['仙', '魔', '道'].includes(faction) || !['男', '女'].includes(gender)) return res.status(400).json({ success: false, message: '参数错误' });
    const existing = await ImmortalDoll.findOne({ userId: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: '您已拥有娃娃' });

    const baseAttrs = { 
      attack: 0, health: 0, defense: 0, aptitude: 0, 
      critRate: 0, antiCritRate: 0, dodgeRate: 0, antiDodgeRate: 0, speed: 0
    };

    const newDoll = new ImmortalDoll({
      userId: req.user._id,
      faction, gender, baseAttributes: baseAttrs, spiritualEnergy: 100 
    });
    await newDoll.save();
    
    // 创建后立即计算一次战力返回
    const statsData = await calculateDollFullStats(newDoll._id);
    const dollObj = statsData.doll.toObject();
    dollObj.totalAttributes = statsData.totalAttributes;
    dollObj.realCombatPower = statsData.realCombatPower;
    
    res.json({ success: true, message: '开修成功！', data: { doll: dollObj } });
  } catch (error) {
    console.error('创建娃娃失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const collectSpirit = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });
    
    const now = new Date();
    const lastTime = doll.spiritPool.lastCollectedAt || doll.createdAt; 
    const hoursPassed = (now - lastTime) / (1000 * 60 * 60);
    const totalRate = doll.spiritPool.level + (doll.baseAttributes.aptitude || 0);
    const spiritGain = Math.floor(hoursPassed * totalRate);
    
    doll.spiritualEnergy += spiritGain;
    doll.spiritPool.lastCollectedAt = now;
    await doll.save();
    
    // 保存后重新计算战力
    const statsData = await calculateDollFullStats(doll._id);
    const dollObj = statsData.doll.toObject();
    dollObj.totalAttributes = statsData.totalAttributes;
    dollObj.realCombatPower = statsData.realCombatPower;

    res.json({ success: true, message: `领取成功！获得 ${spiritGain} 灵气`, data: { doll: dollObj, spiritGain } });
  } catch (error) {
    console.error('领取灵气失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const upgradeSpiritPool = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });
    const currentLevel = doll.spiritPool.level;
    const maxLevel = config.getPoolMax(doll.realm);
    if (currentLevel >= maxLevel) return res.status(400).json({ success: false, message: `当前境界灵气池已达上限` });
    const cost = config.spiritPool.costPerLevel; 
    const user = await User.findById(req.user._id);
    if (!user.spiritStones) user.spiritStones = 0;
    if (user.spiritStones < cost) return res.status(400).json({ success: false, message: `灵气石不足！` });
    
    user.spiritStones -= cost;
    doll.spiritPool.level += 1;
    await user.save();
    await doll.save();
    
    // 计算战力
    const statsData = await calculateDollFullStats(doll._id);
    const dollObj = statsData.doll.toObject();
    dollObj.totalAttributes = statsData.totalAttributes;
    dollObj.realCombatPower = statsData.realCombatPower;

    res.json({ success: true, message: `升级成功！灵气池等级 Lv.${doll.spiritPool.level}`, data: { doll: dollObj } });
  } catch (error) {
    console.error('升级灵气池失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const levelUp = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });
    const levelTable = config.getLevelTable(doll.realm);
    const nextLevelConfig = levelTable.find(l => l.level === doll.level + 1);
    if (!nextLevelConfig) return res.status(400).json({ success: false, message: '当前境界已圆满，请进行境界突破！' });
    if (doll.spiritualEnergy < nextLevelConfig.cost) return res.status(400).json({ success: false, message: `灵气不足！` });
    
    doll.spiritualEnergy -= nextLevelConfig.cost;
    doll.level += 1;
    doll.availableAttributePoints += nextLevelConfig.reward;
    await doll.save();
    
    // 计算战力
    const statsData = await calculateDollFullStats(doll._id);
    const dollObj = statsData.doll.toObject();
    dollObj.totalAttributes = statsData.totalAttributes;
    dollObj.realCombatPower = statsData.realCombatPower;

    res.json({ success: true, message: `升级成功！获得 ${nextLevelConfig.reward} 属性点`, data: { doll: dollObj } });
  } catch (error) {
    console.error('升级失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const attemptBreakthrough = async (req, res) => {
  try {
    const { pillType } = req.body;
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });
    if (doll.level < 10) return res.status(400).json({ success: false, message: '需达到10级圆满方可突破！' });
    
    const realmMap = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘'];
    const currentIdx = realmMap.indexOf(doll.realm);
    const nextRealmName = realmMap[currentIdx + 1];
    if (!nextRealmName) return res.status(400).json({ success: false, message: '已臻至化境，无需突破！' });
    
    let successRate = 0.6;
    if (pillType && config.marrowBonus[pillType]) successRate += config.marrowBonus[pillType];
    if (successRate > 1.0) successRate = 1.0;
    const isSuccess = Math.random() <= successRate;
    
    if (isSuccess) {
      doll.realm = nextRealmName; doll.level = 1;
      const rewardPoints = Math.floor(Math.random() * 5) + 1;
      doll.availableAttributePoints += rewardPoints;
      const rewardAptitude = Math.floor(Math.random() * 100) + 1;
      doll.baseAttributes.aptitude += rewardAptitude;
      await doll.save();
      const statsData = await calculateDollFullStats(doll._id);
      const dollObj = statsData.doll.toObject();
      dollObj.totalAttributes = statsData.totalAttributes;
      dollObj.realCombatPower = statsData.realCombatPower;
      res.json({ success: true, message: `渡劫成功！境界晋升【${nextRealmName}】！`, data: { doll: dollObj } });
    } else {
      const penalty = 20000;
      doll.spiritualEnergy -= penalty;
      await doll.save();
      const statsData = await calculateDollFullStats(doll._id);
      const dollObj = statsData.doll.toObject();
      dollObj.totalAttributes = statsData.totalAttributes;
      dollObj.realCombatPower = statsData.realCombatPower;
      res.json({ success: false, message: `渡劫失败！扣除 ${penalty} 灵气`, data: { doll: dollObj } });
    }
  } catch (error) {
    console.error('境界突破失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const allocateAttributes = async (req, res) => {
  try {
    const { attributeType } = req.body;
    const allowedTypes = ['attack', 'health', 'defense', 'aptitude', 'critRate', 'dodgeRate', 'antiCritRate', 'antiDodgeRate', 'speed'];
    if (!allowedTypes.includes(attributeType)) return res.status(400).json({ success: false, message: '无效的属性类型' });
    
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });
    if (doll.availableAttributePoints <= 0) return res.status(400).json({ success: false, message: '可用属性点不足' });
    
    if (['critRate', 'dodgeRate', 'antiCritRate', 'antiDodgeRate'].includes(attributeType)) {
      doll.baseAttributes[attributeType] += 0.001;
    } else if (attributeType === 'health') {
      doll.baseAttributes.health += 10;
    } else {
      doll.baseAttributes[attributeType] += 1;
    }
    doll.availableAttributePoints -= 1;
    await doll.save();
    
    const statsData = await calculateDollFullStats(doll._id);
    const dollObj = statsData.doll.toObject();
    dollObj.totalAttributes = statsData.totalAttributes;
    dollObj.realCombatPower = statsData.realCombatPower;
    
    res.json({ success: true, message: '加点成功！', data: { doll: dollObj } });
  } catch (error) {
    console.error('分配属性失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const challengeDungeon = async (req, res) => {
  try {
    const { stageId } = req.body;
    const user = await User.findById(req.user._id);
    
    // 战斗前必须获取最准确的属性（带装备）
    // 传入 userId (req.user._id)
    const statsData = await calculateDollFullStats(req.user._id);
    
    // ✅ 关键修复：如果查询失败（statsData 为 null），直接报错返回，防止崩溃
    if (!statsData) {
      return res.status(404).json({ success: false, message: '角色数据加载失败，请刷新页面重试' });
    }

    const doll = statsData.doll;
    const playerStats = statsData.totalAttributes;

    if (!user || !doll) return res.status(404).json({ success: false, message: '角色不存在' });

    const stages = {
      1: { name: '狗熊', hp: 50, attack: 5, defense: 0, speed: 1 },
      2: { name: '小狼', hp: 60, attack: 8, defense: 0, speed: 2 },
      3: { name: '树妖', hp: 80, attack: 10, defense: 2, speed: 1 }
    };
    const enemy = stages[stageId];
    if (!enemy) return res.status(400).json({ success: false, message: '关卡配置不存在' });

    const ticketCost = 100;
    if ((user.starcoin || 0) < ticketCost) return res.status(400).json({ success: false, message: `星源币不足！` });
    user.starcoin -= ticketCost;

    // 战斗判定 (使用 totalAttributes)
    let isWin = true;
    let playerAtk = playerStats.attack;
    let playerHp = playerStats.health;
    let playerDef = playerStats.defense;
    let playerSpd = playerStats.speed;
    
    // 简单战斗算法
    if (playerAtk <= enemy.defense) {
        isWin = false;
    } else {
        const turnsToWin = Math.ceil(enemy.hp / Math.max(1, playerAtk - enemy.defense));
        const totalDmgPerTurn = Math.max(0, enemy.attack - playerDef);
        if (playerHp <= 0) isWin = false;
        else {
            const totalDmg = totalDmgPerTurn * turnsToWin;
            isWin = playerHp > totalDmg;
        }
    }

    let logs = [];
    if (isWin) {
        logs.push({ type: 'info', text: `速度判定：你${playerSpd} vs ${enemy.name}${enemy.speed}` });
        logs.push({ type: 'player', text: `你发起了攻击！` });
        logs.push({ type: 'enemy', text: `${enemy.name}受到了致命一击！` });
        logs.push({ type: 'player', text: `战斗胜利！` });
    } else {
        logs.push({ type: 'info', text: '战斗开始...' });
        logs.push({ type: 'enemy', text: `${enemy.name}击败了你！` });
    }

    let rewards = { spirit: 0, equipments: [], materials: {}, stones: { spiritStone: 0, refineStone: 0 } };
    if (isWin) {
      const spiritGain = 1000;
      doll.spiritualEnergy += spiritGain;
      rewards.spirit = spiritGain;
      
      // ✅ 新增：副本掉落逻辑
      // 副本1掉落狗熊心
      if (stageId == 1 && Math.random() < 0.05) {
        doll.inventory['mat_bear_heart'] = (doll.inventory['mat_bear_heart'] || 0) + 1;
        rewards.materials['mat_bear_heart'] = 1;
      }
      // 副本3掉落树妖枝干
      if (stageId == 3 && Math.random() < 0.05) { 
        doll.inventory['mat_tree_branch'] = (doll.inventory['mat_tree_branch'] || 0) + 1;
        rewards.materials['mat_tree_branch'] = 1;
      }

      const slotTypes = ['weapon', 'armor', 'shoes', 'belt', 'clothes', 'pants'];
      const randomSlot = slotTypes[Math.floor(Math.random() * slotTypes.length)];
      const newEquip = createFixedEquip(user._id, randomSlot);
      await newEquip.save();
      rewards.equipments.push(newEquip);

      if (Math.random() < 0.1) rewards.stones.refineStone += 1;
    }
    
    await user.save();
    await doll.save();
    
    // 返回包含计算战力的 Doll
    const dollObj = doll.toObject();
    dollObj.totalAttributes = playerStats;
    dollObj.realCombatPower = statsData.realCombatPower;

    res.json({ 
      success: true, 
      message: isWin ? `挑战成功！` : `挑战失败！`,
      data: { 
        doll: dollObj, 
        rewards, 
        userStarcoin: user.starcoin,
        battleResult: { isWin, logs }
      } 
    });
  } catch (error) {
    console.error('副本挑战失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const getInventory = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '角色不存在' });
    const equippedIds = Object.values(doll.equipmentSlots).filter(id => id).map(id => id.toString());
    const inventory = await ImmortalEquipment.find({
      userId: req.user._id,
      _id: { $nin: equippedIds }
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: { inventory } });
  } catch (error) {
    console.error('获取背包失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const equipItem = async (req, res) => {
  try {
    const { equipId } = req.body;
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    const item = await ImmortalEquipment.findOne({ _id: equipId, userId: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: '装备不存在' });
    doll.equipmentSlots[item.slot] = item._id;
    await doll.save();
    
    const statsData = await calculateDollFullStats(doll._id);
    const dollObj = statsData.doll.toObject();
    dollObj.totalAttributes = statsData.totalAttributes;
    dollObj.realCombatPower = statsData.realCombatPower;

    res.json({ success: true, message: '穿戴成功！', data: { doll: dollObj } });
  } catch (error) {
    console.error('穿戴失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const unequipItem = async (req, res) => {
  try {
    const { slot } = req.body;
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '角色不存在' });
    doll.equipmentSlots[slot] = undefined;
    await doll.save();

    const statsData = await calculateDollFullStats(doll._id);
    const dollObj = statsData.doll.toObject();
    dollObj.totalAttributes = statsData.totalAttributes;
    dollObj.realCombatPower = statsData.realCombatPower;

    res.json({ success: true, message: '卸下成功', data: { doll: dollObj } });
  } catch (error) {
    console.error('卸下失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const refineItem = async (req, res) => {
  try {
    const { equipId, materialId } = req.body;
    const user = await User.findById(req.user._id);
    const equip = await ImmortalEquipment.findOne({ _id: equipId, userId: req.user._id });
    if (!equip) return res.status(404).json({ success: false, message: '装备不存在' });
    if (equip.level >= 10) return res.status(400).json({ success: false, message: '已达到最高强化等级' });

    const material = await ImmortalEquipment.findOne({ _id: materialId, userId: req.user._id, slot: equip.slot });
    if (!material) return res.status(400).json({ success: false, message: '材料错误' });
    if ((user.refineStones || 0) < 1) return res.status(400).json({ success: false, message: '强化石不足' });

    const successRate = Math.max(0.1, 0.6 - (equip.level * 0.03));
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
      equip.level += 1;
      await material.deleteOne();
      user.refineStones -= 1;
    } else {
      if (equip.level > 0) {
        equip.level -= 1;
        await material.deleteOne();
        user.refineStones -= 1;
      } else {
        await ImmortalEquipment.deleteOne({ _id: equipId });
        await material.deleteOne();
        user.refineStones -= 1;
      }
    }
    await equip.save();
    await user.save();
    res.json({ success: isSuccess, message: isSuccess ? `强化成功！当前等级 ${equip.level}` : `强化失败！装备降级至 ${equip.level}`, data: { equip } });
  } catch (error) {
    console.error('强化失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const starUpItem = async (req, res) => {
  try {
    const { equipId, materialIds } = req.body;
    const user = await User.findById(req.user._id);
    const equip = await ImmortalEquipment.findOne({ _id: equipId, userId: req.user._id });
    if (!equip) return res.status(404).json({ success: false, message: '装备不存在' });
    if (equip.star >= 3) return res.status(400).json({ success: false, message: '已达到最高星级' });
    if (materialIds.length !== 5) return res.status(400).json({ success: false, message: '需要5件同品质装备' });

    const materials = await ImmortalEquipment.find({ _id: { $in: materialIds }, userId: req.user._id, slot: equip.slot, quality: equip.quality });
    if (materials.length !== 5) return res.status(400).json({ success: false, message: '材料不足或部位不匹配' });

    equip.star += 1;
    const rand = Math.random();
    let affixPool = [];
    if (rand < 0.05) affixPool = AFFIX_POOL.red;
    else if (rand < 0.15) affixPool = AFFIX_POOL.orange;
    else if (rand < 0.30) affixPool = AFFIX_POOL.purple;
    else if (rand < 0.55) affixPool = AFFIX_POOL.blue;
    else affixPool = AFFIX_POOL.white;

    const newAffix = affixPool[Math.floor(Math.random() * affixPool.length)];
    equip.affixes = equip.affixes || [];
    equip.affixes.push(newAffix);

    await ImmortalEquipment.deleteMany({ _id: { $in: materialIds } });
    await equip.save();

    res.json({ success: true, message: `升星成功！获得词条 ${newAffix.name}`, data: { equip } });
  } catch (error) {
    console.error('升星失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const decomposeItem = async (req, res) => {
  try {
    const { equipId } = req.body;
    const user = await User.findById(req.user._id);
    const equip = await ImmortalEquipment.findOne({ _id: equipId, userId: req.user._id });
    if (!equip) return res.status(404).json({ success: false, message: '装备不存在' });

    let rewardCoins = 0;
    if (equip.slot === 'weapon') {
      rewardCoins = 20 + (equip.level * 10) + (equip.star * 120);
    } else {
      rewardCoins = 20 + (equip.level * 5) + (equip.star * 50);
    }

    user.starcoin = (user.starcoin || 0) + rewardCoins;
    await ImmortalEquipment.deleteOne({ _id: equipId });
    await user.save();

    res.json({ success: true, message: `拆解成功！获得 ${rewardCoins} 星源币`, data: { starcoin: user.starcoin } });
  } catch (error) {
    console.error('拆解失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = {
  getMyDoll, createDoll, collectSpirit, upgradeSpiritPool,
  levelUp, attemptBreakthrough, allocateAttributes, challengeDungeon,
  getInventory, equipItem, unequipItem, refineItem, starUpItem, decomposeItem
};
