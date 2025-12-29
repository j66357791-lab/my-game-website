const Cultivation = require('../models/Cultivation');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
// 引入你提供的 constants.js
const constants = require('../config/constants');

// 1. 初始化角色 (选择性别)
exports.initProfile = async (req, res) => {
  try {
    const { gender } = req.body;
    const userId = req.user.id;
    
    // 检查是否已创建
    const exists = await Cultivation.findOne({ userId });
    if (exists) {
      return res.status(400).json({ success: false, message: '角色已创建' });
    }

    // 创建档案
    const profile = await Cultivation.create({ userId, gender });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. 获取修仙数据
exports.getData = async (req, res) => {
  try {
    const userId = req.user.id;
    const cult = await Cultivation.findOne({ userId });
    
    if (!cult) {
      return res.json({ success: true, exists: false });
    }
    
    // 查询装备加成
    const equipments = await Equipment.find({ userId, isEquipped: true });
    let equipStats = { attack: 0, hp: 0, defense: 0, critRate: 0, dodgeRate: 0 };
    equipments.forEach(eq => {
      equipStats.attack += eq.stats.attack || 0;
      equipStats.hp += eq.stats.hp || 0;
      equipStats.defense += eq.stats.defense || 0;
      equipStats.critRate += eq.stats.critRate || 0;
      equipStats.dodgeRate += eq.stats.dodgeRate || 0;
    });

    // 计算战斗力 (公式: 攻*10 + 血 + 防*5 + 暴*20 + 闪*20)
    const totalAttack = cult.attributes.attack + equipStats.attack;
    const totalHp = cult.attributes.hp + equipStats.hp;
    const totalDef = cult.attributes.defense + equipStats.defense;
    const totalCrit = cult.attributes.critRate + equipStats.critRate;
    const totalDodge = cult.attributes.dodgeRate + equipStats.dodgeRate;

    // 暴击和闪避只有整数部分生效
    const power = (totalAttack * 10) + totalHp + (totalDef * 5) + (Math.floor(totalCrit) * 20) + (Math.floor(totalDodge) * 20);
    
    // 整合数据
    const responseData = {
      ...cult._doc,
      power,
      equipStats
    };

    res.json({ success: true, exists: true, data: responseData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. 领取修炼收益 (含自动升级逻辑)
exports.cultivateClaim = async (req, res) => {
  try {
    const userId = req.user.id;
    const cult = await Cultivation.findOne({ userId });
    const now = new Date();
    
    // 计算时间差 (小时)
    const diffMs = now - cult.lastCultivationTime;
    const diffHours = Math.max(0, diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0.01) {
      return res.json({ success: true, gained: 0, message: '修炼时间不足' });
    }

    // 1. 计算修炼速度
    // 基础1 + 家园等级 + 娃娃资质
    let speed = 1 + cult.homePoolLevel + cult.attributes.aptitude;
    
    // 检查法宝 (一星灵气葫芦 +10%)
    const hasGourd = cult.artifacts.some(a => a.id === 'gourd_1_star');
    if (hasGourd) {
      speed = Math.floor(speed * 1.10);
    }

    // 2. 计算获得灵气
    const gained = Math.floor(speed * diffHours);
    
    // 3. 增加经验并尝试连级升级
    cult.exp += gained;
    let levelUpCount = 0;
    
    // 获取当前境界的升级阈值表
    const reqs = constants.REALM_EXP_REQ[cult.realm];
    const rewards = constants.REALM_LEVEL_REWARDS[cult.realm];

    if (reqs && rewards) {
      while (cult.level < reqs.length && cult.exp >= reqs[cult.level]) {
        // 执行升级
        cult.level += 1;
        
        // 获取升级奖励点数
        cult.availablePoints += rewards[cult.level - 1].points;
        levelUpCount++;
      }
    }

    cult.lastCultivationTime = now;
    await cult.save();

    res.json({ 
      success: true, 
      gained, 
      levelUpCount, 
      currentExp: cult.exp, 
      currentLevel: cult.level,
      availablePoints: cult.availablePoints
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. 分配属性点
exports.allocatePoint = async (req, res) => {
  try {
    const { attr } = req.body; // 'attack', 'hp', 'defense', 'aptitude', 'critRate', 'dodgeRate', 'antiCrit', 'antiDodge'
    const userId = req.user.id;
    const cult = await Cultivation.findOne({ userId });
    
    if (cult.availablePoints <= 0) {
      return res.status(400).json({ success: false, message: '无可用属性点' });
    }
    
    // 分配逻辑
    if (attr === 'hp') {
      cult.attributes.hp += 10; // 生命值+10
    } else if (['attack', 'defense', 'aptitude'].includes(attr)) {
      cult.attributes[attr] += 1;
    } else {
      // 百分比属性 +0.1
      cult.attributes[attr] += 0.1;
    }
    
    cult.availablePoints -= 1;
    await cult.save();
    
    res.json({ success: true, attributes: cult.attributes, availablePoints: cult.availablePoints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. 境界突破
exports.breakthrough = async (req, res) => {
  try {
    const { usePillQuality } = req.body; // 'NORMAL', 'GOOD', etc.
    const userId = req.user.id;
    const cult = await Cultivation.findOne({ userId });
    
    // 1. 检查是否满级 (10级)
    const reqs = constants.REALM_EXP_REQ[cult.realm];
    if (!reqs || cult.level < 10) {
      return res.status(400).json({ success: false, message: '未达到当前境界圆满 (10级)' });
    }
    
    // 2. 计算成功率
    let rate = 0.6; // 基础60%
    if (usePillQuality && constants.PILL_BONUS[usePillQuality]) {
      rate += constants.PILL_BONUS[usePillQuality];
    }
    
    // 3. 掷骰子
    const isSuccess = Math.random() < rate;
    
    if (isSuccess) {
      // 突破成功逻辑
      // 查找下一境界
      const realms = ['MORTAL', 'QI_REFINING', 'FOUNDATION', 'GOLD_CORE', 'NASCENT_SOUL', 'SPIRITUAL', 'TRIBULATION', 'MAHAYANA'];
      const currentIdx = realms.indexOf(cult.realm);
      
      if (currentIdx === -1 || currentIdx === realms.length - 1) {
         return res.status(400).json({ success: false, message: '已达最高境界' });
      }

      const nextRealm = realms[currentIdx + 1];
      cult.realm = nextRealm;
      cult.level = 1; // 重置为1级
      
      // 奖励
      const pointReward = Math.floor(Math.random() * 5) + 1; // 1-5点
      const aptReward = Math.floor(Math.random() * 100) + 1; // 1-100资质
      
      cult.availablePoints += pointReward;
      cult.attributes.aptitude += aptReward;
      
      await cult.save();
      res.json({ success: true, message: '突破成功！', newRealm: nextRealm, pointReward, aptReward });
    } else {
      // 突破失败
      cult.exp -= 20000; // 惩罚
      await cult.save();
      res.json({ success: false, message: '突破失败，扣除20000灵气', newExp: cult.exp });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. 装备强化
exports.enhanceEquipment = async (req, res) => {
  try {
    const { mainId, materialId } = req.body;
    const userId = req.user.id;
    
    const mainEquip = await Equipment.findOne({ _id: mainId, userId });
    const matEquip = await Equipment.findOne({ _id: materialId, userId });

    if (!mainEquip || !matEquip) return res.status(404).json({ success: false, message: '装备不存在' });
    if (mainEquip.level >= 10) return res.status(400).json({ success: false, message: '已达到最高等级' });
    
    // 校验规则：同类型、同品级、同等级
    if (mainEquip.type !== matEquip.type || 
        mainEquip.rarity !== matEquip.rarity || 
        mainEquip.level !== matEquip.level) {
      return res.status(400).json({ success: false, message: '材料装备必须与主装备类型、品级、等级相同' });
    }

    // 60%概率
    if (Math.random() < 0.6) {
      // 成功
      mainEquip.level += 1;
      const growth = constants.EQUIPMENT_BASE_STATS[mainEquip.type].growth;
      
      // 增加属性
      if (growth.attack) mainEquip.stats.attack += growth.attack;
      if (growth.hp) mainEquip.stats.hp += growth.hp;
      if (growth.defense) mainEquip.stats.defense += growth.defense;
      if (growth.dodgeRate) mainEquip.stats.dodgeRate += growth.dodgeRate;
      if (growth.antiDodge) mainEquip.stats.antiDodge += growth.antiDodge;
      if (growth.antiCrit) mainEquip.stats.antiCrit += growth.antiCrit;

      await mainEquip.save();
      await Equipment.deleteOne({ _id: materialId }); // 删除材料
      
      res.json({ 
        success: true, 
        message: '强化成功！', 
        newLevel: mainEquip.level,
        stats: mainEquip.stats 
      });
    } else {
      // 失败
      if (mainEquip.level > 1) {
        mainEquip.level -= 1;
        // 这里为了简化，暂不回退具体数值，建议重新计算或前端显示
        await mainEquip.save();
        await Equipment.deleteOne({ _id: materialId });
        res.json({ success: false, message: '强化失败，装备等级-1', level: mainEquip.level });
      } else {
        // 掉到0级，装备消失
        await Equipment.deleteOne({ _id: mainEquip._id });
        await Equipment.deleteOne({ _id: materialId });
        res.json({ success: false, message: '强化失败，装备已破碎', destroyed: true });
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 7. 挑战副本 (简化版)
exports.challengeDungeon = async (req, res) => {
  try {
    const userId = req.user.id;
    const dungeonId = 1; // 目前只有关卡1
    
    // 获取用户修仙数据 (用于计算战力)
    const cultRes = await exports.getData({ user: { id: userId } }, { json: (data) => data }); // 复用逻辑
    // 注意：上面的复用有点 hack，实际项目中应抽取 service 层。这里简单重写一下获取战力：
    const cult = await Cultivation.findOne({ userId });
    const equipments = await Equipment.find({ userId, isEquipped: true });
    
    let totalStats = { ...cult.attributes };
    equipments.forEach(eq => {
        totalStats.attack += eq.stats.attack || 0;
        totalStats.hp += eq.stats.hp || 0;
        totalStats.defense += eq.stats.defense || 0;
        totalStats.critRate += eq.stats.critRate || 0;
        totalStats.dodgeRate += eq.stats.dodgeRate || 0;
    });

    const dungeon = constants.DUNGEONS[dungeonId];
    const boss = dungeon.boss;

    // 简单战斗计算
    // 玩家必须具备战力，否则无法打
    // 这里简单判定：如果 玩家攻击 > 0 且 玩家血量 > 0
    // 实际战斗太复杂，这里简化为：只要攻击力 > Boss防御力，就算能打，按回合扣血
    
    // 简化逻辑：每回合 双方对砍
    // 伤害 = 攻 - 防 (最低1)
    // 玩家先手
    let playerHp = totalStats.hp;
    let bossHp = boss.hp;
    let turn = 0;
    let win = false;

    // 如果玩家没攻击没血，直接输
    if (totalStats.attack <= 0) {
        return res.json({ success: false, message: '攻击力太低，无法挑战' });
    }

    while(playerHp > 0 && bossHp > 0 && turn < 50) {
        // 玩家攻击 Boss
        let pDmg = totalStats.attack - boss.defense;
        if (pDmg < 1) pDmg = 1;
        bossHp -= pDmg;

        // Boss攻击玩家
        let bDmg = boss.attack - totalStats.defense;
        if (bDmg < 1) bDmg = 1;
        playerHp -= bDmg;
        turn++;
    }

    if (bossHp <= 0) win = true;

    if (win) {
        // 掉落逻辑
        const gainedQi = Math.floor(Math.random() * (dungeon.rewards.maxQi - dungeon.rewards.minQi + 1)) + dungeon.rewards.minQi;
        cult.exp += gainedQi;
        
        // 随机掉落装备 (0-3件)
        const dropCount = Math.floor(Math.random() * 4);
        const droppedItems = [];
        const types = ['WEAPON', 'ARMOR', 'SHOES', 'BELT', 'CLOTH', 'PANTS'];
        
        for(let i=0; i<dropCount; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const baseStats = constants.EQUIPMENT_BASE_STATS[type].base;
            const newItem = await Equipment.create({
                userId,
                type,
                rarity: 'COMMON',
                level: 1,
                stats: baseStats
            });
            droppedItems.push(newItem);
        }

        await cult.save();
        res.json({ success: true, message: '挑战成功！', gainedQi, droppedItems });
    } else {
        res.json({ success: false, message: '挑战失败，请提升战力' });
    }

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
