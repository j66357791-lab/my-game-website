const ImmortalDoll = require('../models/ImmortalDoll');
const User = require('../models/User');
const ImmortalEquipment = require('../models/ImmortalEquipment');
const config = require('../utils/realmConfig');

// 获取娃娃信息
const getMyDoll = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id })
      .populate('equipmentSlots.weapon')
      .populate('equipmentSlots.armor')
      .populate('equipmentSlots.shoes')
      .populate('equipmentSlots.belt')
      .populate('equipmentSlots.clothes')
      .populate('equipmentSlots.pants');

    if (!doll) return res.json({ success: true, data: { doll: null } });

    // 计算真实战力 (基础 + 装备)
    const attrs = doll.baseAttributes;
    let cp = 0;
    let totalAtk = attrs.attack || 0;
    let totalHp = attrs.health || 0;
    let totalDef = attrs.defense || 0;
    let totalCrit = attrs.critRate || 0;
    let totalDodge = attrs.dodgeRate || 0;
    // 速度不影响战力

    Object.keys(doll.equipmentSlots).forEach(slot => {
      const equip = doll.equipmentSlots[slot];
      if (equip && equip.attributes) {
        const e = equip.attributes;
        totalAtk += (e.attack || 0);
        totalHp += (e.health || 0);
        totalDef += (e.defense || 0);
        totalCrit += (e.critRate || 0);
        totalDodge += (e.dodgeRate || 0);
      }
    });

    cp += totalAtk * 10;
    cp += Math.floor(totalHp / 10) * 10;
    cp += totalDef * 5;
    cp += Math.floor(totalCrit * 100) * 20;
    cp += Math.floor(totalDodge * 100) * 20;

    const dollObj = doll.toObject();
    dollObj.realCombatPower = cp;
    dollObj.totalAttributes = {
      attack: totalAtk,
      health: totalHp,
      defense: totalDef,
      critRate: totalCrit,
      dodgeRate: totalDodge,
      speed: attrs.speed || 0 // ✅ 新增速度
    };

    res.json({ success: true, data: { doll: dollObj } });
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

    const baseAttrs = { 
      attack: 0, health: 0, defense: 0, aptitude: 0, 
      critRate: 0, antiCritRate: 0, dodgeRate: 0, antiDodgeRate: 0,
      speed: 0 // ✅ 初始速度0
    };

    const newDoll = new ImmortalDoll({
      userId: req.user._id,
      faction, gender, baseAttributes: baseAttrs,
      spiritualEnergy: 100 
    });
    await newDoll.save();
    res.json({ success: true, message: '开修成功！', data: { doll: newDoll } });
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
    res.json({ success: true, message: `领取成功！获得 ${spiritGain} 灵气`, data: { doll, spiritGain } });
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
    if (currentLevel >= maxLevel) {
      return res.status(400).json({ success: false, message: `当前 ${doll.realm} 境界灵气池已达上限 Lv.${maxLevel}` });
    }
    const cost = config.spiritPool.costPerLevel; 
    const user = await User.findById(req.user._id);
    if (!user.spiritStones) user.spiritStones = 0;
    if (user.spiritStones < cost) {
      return res.status(400).json({ success: false, message: `灵气石不足！需要 ${cost} 灵气石` });
    }
    user.spiritStones -= cost;
    doll.spiritPool.level += 1;
    await user.save();
    await doll.save();
    res.json({ success: true, message: `升级成功！灵气池等级 Lv.${doll.spiritPool.level}`, data: { doll } });
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
    if (!nextLevelConfig) {
      return res.status(400).json({ success: false, message: '当前境界已圆满，请进行境界突破！' });
    }
    if (doll.spiritualEnergy < nextLevelConfig.cost) {
      return res.status(400).json({ success: false, message: `灵气不足！升级到 ${doll.realm}${nextLevelConfig}级 需要 ${nextLevelConfig.cost} 灵气` });
    }
    doll.spiritualEnergy -= nextLevelConfig.cost;
    doll.level += 1;
    doll.availableAttributePoints += nextLevelConfig.reward;
    await doll.save();
    res.json({ success: true, message: `升级成功！获得 ${nextLevelConfig.reward} 属性点`, data: { doll } });
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
    if (doll.level < 10) {
      return res.status(400).json({ success: false, message: '需达到10级圆满方可突破！' });
    }
    const realmMap = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘'];
    const currentIdx = realmMap.indexOf(doll.realm);
    const nextRealmName = realmMap[currentIdx + 1];
    if (!nextRealmName) {
      return res.status(400).json({ success: false, message: '已臻至化境，无需突破！' });
    }
    let successRate = 0.6;
    if (pillType && config.marrowBonus[pillType]) {
      successRate += config.marrowBonus[pillType];
    }
    if (successRate > 1.0) successRate = 1.0;
    const isSuccess = Math.random() <= successRate;
    if (isSuccess) {
      doll.realm = nextRealmName;
      doll.level = 1;
      const rewardPoints = Math.floor(Math.random() * 5) + 1;
      doll.availableAttributePoints += rewardPoints;
      const rewardAptitude = Math.floor(Math.random() * 100) + 1;
      doll.baseAttributes.aptitude += rewardAptitude;
      await doll.save();
      res.json({ success: true, message: `渡劫成功！境界晋升【${nextRealmName}】！`, data: { doll } });
    } else {
      const penalty = 20000;
      doll.spiritualEnergy -= penalty;
      await doll.save();
      res.json({ success: false, message: `渡劫失败！扣除 ${penalty} 灵气`, data: { doll } });
    }
  } catch (error) {
    console.error('境界突破失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

const allocateAttributes = async (req, res) => {
  try {
    const { attributeType } = req.body;
    // ✅ 新增速度，修复生命值 (+10)
    const allowedTypes = ['attack', 'health', 'defense', 'aptitude', 'critRate', 'dodgeRate', 'antiCritRate', 'antiDodgeRate', 'speed'];
    if (!allowedTypes.includes(attributeType)) {
      return res.status(400).json({ success: false, message: '无效的属性类型' });
    }
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '请先创建角色' });
    if (doll.availableAttributePoints <= 0) {
      return res.status(400).json({ success: false, message: '可用属性点不足' });
    }
    if (['critRate', 'dodgeRate', 'antiCritRate', 'antiDodgeRate'].includes(attributeType)) {
      doll.baseAttributes[attributeType] += 0.001;
    } else if (attributeType === 'health') {
      // ✅ 每点加10点血
      doll.baseAttributes.health += 10; 
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

// ✅ 副本挑战 (带战斗日志)
const challengeDungeon = async (req, res) => {
  try {
    const { stageId } = req.body; // ✅ 接收关卡ID
    const user = await User.findById(req.user._id);
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!user || !doll) return res.status(404).json({ success: false, message: '角色不存在' });

    // 简单的关卡配置 (实际应在数据库或配置文件)
    const stages = {
      1: { name: '狗熊', hp: 50, attack: 5, defense: 0, speed: 1 },
      2: { name: '小狼', hp: 60, attack: 8, defense: 0, speed: 2 },
      3: { name: '树妖', hp: 80, attack: 10, defense: 2, speed: 1 }
    };
    const enemy = stages[stageId];

    if (!enemy) return res.status(400).json({ success: false, message: '关卡配置不存在' });

    const ticketCost = 100;
    if ((user.starcoin || 0) < ticketCost) {
      return res.status(400).json({ success: false, message: `星源币不足！挑战需要 ${ticketCost} 星源币` });
    }
    
    // 简单实现：不检查每日次数，直接扣费
    user.starcoin -= ticketCost;

    // 战斗数据获取
    const playerAtk = Math.max(1, (doll.totalAttributes && doll.totalAttributes.attack) || doll.baseAttributes.attack);
    const playerHp = (doll.totalAttributes && doll.totalAttributes.health) || doll.baseAttributes.health;
    const playerDef = (doll.totalAttributes && doll.totalAttributes.defense) || doll.baseAttributes.defense;
    const playerSpd = (doll.totalAttributes && doll.totalAttributes.speed) || doll.baseAttributes.speed || 0;

    // 模拟战斗回合
    let currentEnemyHp = enemy.hp;
    let currentPlayerHp = playerHp;
    const logs = [];

    // 先手判定
    let isPlayerFirst = playerSpd >= enemy.speed;
    logs.push({ type: 'info', text: `速度判定：你${playerSpd} vs ${enemy.name}${enemy.speed}，${isPlayerFirst ? '你先出手' : '敌人先出手'}` });

    let turn = 1;
    while (currentPlayerHp > 0 && currentEnemyHp > 0 && turn <= 50) {
      if (isPlayerFirst) {
        // 玩家攻击
        const dmg = Math.max(1, playerAtk - enemy.defense);
        currentEnemyHp -= dmg;
        logs.push({ type: 'player', text: `回合${turn}: 你造成 ${dmg} 伤害`, value: dmg });
        if (currentEnemyHp <= 0) break;

        // 敌人攻击
        const eDmg = Math.max(0, enemy.attack - playerDef);
        currentPlayerHp -= eDmg;
        logs.push({ type: 'enemy', text: `回合${turn}: ${enemy.name}造成 ${eDmg} 伤害`, value: eDmg });
      } else {
        // 敌人先手
        const eDmg = Math.max(0, enemy.attack - playerDef);
        currentPlayerHp -= eDmg;
        logs.push({ type: 'enemy', text: `回合${turn}: ${enemy.name}造成 ${eDmg} 伤害`, value: eDmg });
        if (currentPlayerHp <= 0) break;

        const dmg = Math.max(1, playerAtk - enemy.defense);
        currentEnemyHp -= dmg;
        logs.push({ type: 'player', text: `回合${turn}: 你造成 ${dmg} 伤害`, value: dmg });
      }
      turn++;
    }

    const isWin = currentEnemyHp <= 0 && currentPlayerHp > 0;
    
    let rewards = { spirit: 0, equipments: [], stones: { spiritStone: 0, refineStone: 0 } };
    if (isWin) {
      const spiritGain = Math.floor(Math.random() * 4000) + 1000;
      doll.spiritualEnergy += spiritGain;
      rewards.spirit = spiritGain;
      const equipCount = Math.floor(Math.random() * 4);
      const slotTypes = ['weapon', 'armor', 'shoes', 'belt', 'clothes', 'pants'];
      for (let i = 0; i < equipCount; i++) {
        const randomSlot = slotTypes[Math.floor(Math.random() * slotTypes.length)];
        const newEquip = new ImmortalEquipment({
          userId: user._id, slot: randomSlot, level: 1, quality: 'common'
        });
        await newEquip.save();
        rewards.equipments.push(newEquip);
      }
      if (Math.random() < 0.1) rewards.stones.refineStone += 1;
      if (Math.random() < 0.05) rewards.stones.spiritStone += 1;
    }
    
    await user.save();
    await doll.save();

    res.json({ 
      success: true, 
      message: isWin ? `挑战成功！击败了 ${enemy.name}` : `挑战失败！`,
      data: { 
        doll, 
        rewards, 
        userStarcoin: user.starcoin,
        battleResult: {
          isWin,
          logs,
          enemyName: enemy.name,
          finalPlayerHp: Math.max(0, currentPlayerHp),
          finalEnemyHp: Math.max(0, currentEnemyHp)
        }
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
    const { equipId, targetSlot } = req.body;
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    const item = await ImmortalEquipment.findOne({ _id: equipId, userId: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: '装备不存在' });
    if (!doll) return res.status(404).json({ success: false, message: '角色不存在' });
    if (item.slot !== targetSlot) {
      return res.status(400).json({ success: false, message: `该装备不能穿戴在 ${targetSlot}` });
    }
    doll.equipmentSlots[targetSlot] = item._id;
    await doll.save();
    res.json({ success: true, message: '穿戴成功！', data: { doll } });
  } catch (error) {
    console.error('穿戴失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = {
  getMyDoll,
  createDoll,
  collectSpirit,
  upgradeSpiritPool,
  levelUp,
  attemptBreakthrough,
  allocateAttributes,
  challengeDungeon,
  getInventory,
  equipItem
};
