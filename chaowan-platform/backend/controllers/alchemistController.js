const ImmortalDoll = require('../models/ImmortalDoll');

// ==========================================
// 辅助函数
// ==========================================

// 获取炼丹师总品阶 (0-26, 0为一品低阶)
const getAlchemistIndex = (level, stageStr) => {
  const stageMap = { 'low': 0, 'mid': 1, 'high': 2 };
  return (level - 1) * 3 + stageMap[stageStr];
};

// 计算炼制时间 (毫秒)
const calculateRefineTime = (level, stageStr) => {
  const index = getAlchemistIndex(level, stageStr);
  const baseTime = 4 * 60 * 60 * 1000; // 4小时
  // 每提升1个小品阶，速度提升5% (时间减少5%)
  let speedBonus = 1 - (index * 0.05);
  
  // 计算最终时间
  let finalTime = baseTime * speedBonus;
  
  // 最快限制为 10分钟
  const minTime = 10 * 60 * 1000;
  return Math.max(finalTime, minTime);
};

// 计算炼丹结果
const calculatePillResult = (doll) => {
  const index = getAlchemistIndex(doll.alchemist.level, doll.alchemist.stage);
  
  // 基础概率
  let probLow = 0.20;
  let probMid = 0.05;
  
  // 加成
  probLow += index * 0.02;
  probMid += index * 0.02;
  let probSuper = index * 0.01;
  let probImmortal = index * 0.001;
  
  // 概率修正
  if (probLow > 0.6) probLow = 0.6;
  if (probMid > 0.6) probMid = 0.6;
  
  let probHigh = 1 - (probLow + probMid + probSuper + probImmortal);
  if (probHigh < 0) probHigh = 0;
  
  const rand = Math.random();
  let result = { quality: 'fail', exp: 10 }; // 失败
  
  // 区间判定
  const pImmortal = probImmortal;
  const pSuper = probImmortal + probSuper;
  const pHigh = pSuper + probHigh;
  const pMid = pHigh + probMid;
  const pLow = pMid + probLow;

  if (rand < pImmortal) {
    result.quality = 'immortal'; result.exp = 2000;
  } else if (rand < pSuper) {
    result.quality = 'super'; result.exp = 800;
  } else if (rand < pHigh) {
    result.quality = 'high'; result.exp = 300;
  } else if (rand < pMid) {
    result.quality = 'mid'; result.exp = 100;
  } else if (rand < pLow) {
    result.quality = 'low'; result.exp = 50;
  }
  
  return result;
};

// 检查物品是否足够
const hasItem = (inventory, itemKey, amount) => {
  return (inventory[itemKey] || 0) >= amount;
};

const consumeItem = (inventory, itemKey, amount) => {
  if (!inventory[itemKey]) inventory[itemKey] = 0;
  inventory[itemKey] -= amount;
};

const addItem = (inventory, itemKey, amount) => {
  if (!inventory[itemKey]) inventory[itemKey] = 0;
  inventory[itemKey] += amount;
};

// ==========================================
// Controller 逻辑
// ==========================================

// 获取丹药/药园数据
const getAlchemistData = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    if (!doll) return res.status(404).json({ success: false, message: '角色不存在' });
    res.json({ success: true, data: doll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 药园商店 ---
const buyGardenItem = async (req, res) => {
  try {
    const { type, amount } = req.body;
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    
    let cost = 0;
    let itemKey = '';
    
    if (type === 'fertilizer') {
      cost = 2000;
      itemKey = 'fertilizer';
    } else if (type === 'seed_worry') {
      cost = 500;
      itemKey = 'herb_worry_10';
    } else if (type === 'seed_spirit') {
      cost = 500;
      itemKey = 'herb_spirit_10';
    } else {
      return res.status(400).json({ success: false, message: '商品不存在' });
    }
    
    const totalCost = cost * amount;
    if (doll.spiritualEnergy < totalCost) {
      return res.status(400).json({ success: false, message: '灵气不足' });
    }
    
    doll.spiritualEnergy -= totalCost;
    addItem(doll.inventory, itemKey, amount);
    await doll.save();
    
    res.json({ success: true, message: '购买成功', data: { spirit: doll.spiritualEnergy, inventory: doll.inventory } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 药园管理 ---

// 解锁土地
const unlockPlot = async (req, res) => {
  try {
    const { plotId } = req.body; // 2-9
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    
    if (plotId < 2 || plotId > 9) return res.status(400).json({ success: false, message: '无效的土地ID' });
    if (doll.garden.unlockedPlots >= plotId) return res.status(400).json({ success: false, message: '该土地已解锁' });
    if (doll.garden.unlockedPlots + 1 !== plotId) return res.status(400).json({ success: false, message: '请先解锁前置土地' });
    
    // 价格：10k * 3^(n-1). Plot 2 = 10k, Plot 3 = 30k...
    const indexToUnlock = doll.garden.unlockedPlots; // 1 for plot 2
    const cost = 10000 * Math.pow(3, indexToUnlock);
    
    if (doll.spiritualEnergy < cost) {
      return res.status(400).json({ success: false, message: `灵气不足，需要 ${cost} 灵气` });
    }
    
    doll.spiritualEnergy -= cost;
    doll.garden.unlockedPlots = plotId;
    await doll.save();
    
    res.json({ success: true, message: `解锁成功，消耗 ${cost} 灵气`, data: { spirit: doll.spiritualEnergy, unlockedPlots: doll.garden.unlockedPlots } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 恢复耐久
const restoreDurability = async (req, res) => {
  try {
    const { plotId } = req.body;
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    const plot = doll.garden.plots.find(p => p.id === plotId);
    
    if (!plot) return res.status(404).json({ success: false, message: '土地不存在' });
    if (plot.durability >= 100) return res.status(400).json({ success: false, message: '耐久已满' });
    
    if (!hasItem(doll.inventory, 'fertilizer', 1)) {
      return res.status(400).json({ success: false, message: '肥料不足' });
    }
    
    consumeItem(doll.inventory, 'fertilizer', 1);
    plot.durability += 10;
    if (plot.durability > 100) plot.durability = 100;
    
    await doll.save();
    res.json({ success: true, message: '施肥成功，耐久+10' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 种植
const plantCrop = async (req, res) => {
  try {
    const { plotId, cropType } = req.body; // cropType: 'worry_10' or 'spirit_10'
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    const plot = doll.garden.plots.find(p => p.id === plotId);
    
    if (!plot) return res.status(400).json({ success: false, message: '地块不存在' });
    if (plot.status !== 'empty') return res.status(400).json({ success: false, message: '该地块已有作物' });
    if (plot.durability <= 0) return res.status(400).json({ success: false, message: '土地已荒芜，请施肥' });
    
    const itemKey = `herb_${cropType}`;
    if (!hasItem(doll.inventory, itemKey, 1)) {
      return res.status(400).json({ success: false, message: '种子不足' });
    }
    
    consumeItem(doll.inventory, itemKey, 1);
    plot.status = 'growing';
    plot.crop = cropType;
    plot.plantTime = new Date();
    plot.durability -= 1;
    
    await doll.save();
    res.json({ success: true, message: '种植成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 收获
const harvestCrop = async (req, res) => {
  try {
    const { plotId } = req.body;
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    const plot = doll.garden.plots.find(p => p.id === plotId);
    
    if (!plot || plot.status !== 'growing') return res.status(400).json({ success: false, message: '作物未成熟' });
    
    const plantTime = new Date(plot.plantTime).getTime();
    const now = new Date().getTime();
    const growTime = 4 * 60 * 60 * 1000; // 4小时
    
    if (now - plantTime < growTime) {
      const leftMin = Math.ceil((growTime - (now - plantTime)) / 60000);
      return res.status(400).json({ success: false, message: `作物未成熟，还需 ${leftMin} 分钟` });
    }
    
    // 收获
    const itemKey = `herb_${plot.crop}`;
    addItem(doll.inventory, itemKey, 1);
    
    // 重置地块
    plot.status = 'empty';
    plot.crop = null;
    plot.plantTime = null;
    
    await doll.save();
    res.json({ success: true, message: '收获成功', data: { reward: { [itemKey]: 1 } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 炼丹师 ---

// 开始炼丹
const startRefining = async (req, res) => {
  try {
    const { recipeType } = req.body; // 'potential' or 'spirit'
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    
    if (doll.alchemist.currentTask) {
      return res.status(400).json({ success: false, message: '正在炼丹中...' });
    }
    
    // 检查材料
    if (recipeType === 'potential') {
      if (!hasItem(doll.inventory, 'herb_worry_10', 1) || !hasItem(doll.inventory, 'mat_bear_heart', 1)) {
        return res.status(400).json({ success: false, message: '材料不足：十年无忧草 x1, 狗熊心 x1' });
      }
      consumeItem(doll.inventory, 'herb_worry_10', 1);
      consumeItem(doll.inventory, 'mat_bear_heart', 1);
    } else if (recipeType === 'spirit') {
      if (!hasItem(doll.inventory, 'herb_spirit_10', 1) || !hasItem(doll.inventory, 'mat_bear_heart', 1) || !hasItem(doll.inventory, 'mat_tree_branch', 1)) {
        return res.status(400).json({ success: false, message: '材料不足：十年灵气草 x1, 狗熊心 x1, 树妖枝干 x1' });
      }
      consumeItem(doll.inventory, 'herb_spirit_10', 1);
      consumeItem(doll.inventory, 'mat_bear_heart', 1);
      consumeItem(doll.inventory, 'mat_tree_branch', 1);
    } else {
      return res.status(400).json({ success: false, message: '配方错误' });
    }
    
    const duration = calculateRefineTime(doll.alchemist.level, doll.alchemist.stage);
    const now = new Date();
    
    doll.alchemist.currentTask = {
      type: recipeType,
      startTime: now,
      endTime: new Date(now.getTime() + duration)
    };
    
    await doll.save();
    res.json({ success: true, message: '开始炼丹', data: { task: doll.alchemist.currentTask } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 收取丹药
const collectPill = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    const task = doll.alchemist.currentTask;
    
    if (!task) return res.status(400).json({ success: false, message: '没有正在进行的任务' });
    
    const now = new Date();
    if (now < new Date(task.endTime)) {
      return res.status(400).json({ success: false, message: '炼丹尚未完成' });
    }
    
    // 结算
    const result = calculatePillResult(doll);
    
    // 增加经验
    doll.alchemist.exp += result.exp;
    
    // 简易升级逻辑 (每500升一级品阶，可自定义)
    if (doll.alchemist.exp > doll.alchemist.level * 500) {
        doll.alchemist.level += 1;
        doll.alchemist.exp = 0; // 简单重置，保留溢出逻辑更佳
    }
    
    // 发放丹药
    let pillItem = '';
    if (result.quality !== 'fail') {
      pillItem = `pill_${task.type}_${result.quality}`;
      addItem(doll.inventory, pillItem, 1);
    }
    
    // 清除任务
    doll.alchemist.currentTask = null;
    await doll.save();
    
    res.json({ 
      success: true, 
      message: result.quality === 'fail' ? '炼制失败，获得经验 10' : `炼制成功：获得 ${result.quality} 丹药`, 
      data: { result, inventory: doll.inventory, alchemist: doll.alchemist } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 服用丹药
const usePill = async (req, res) => {
  try {
    const { pillKey } = req.body; // e.g. 'pill_pot_low'
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    
    if (!hasItem(doll.inventory, pillKey, 1)) {
      return res.status(400).json({ success: false, message: '丹药不足' });
    }
    
    consumeItem(doll.inventory, pillKey, 1);
    
    // 属性加成
    if (pillKey.startsWith('pill_pot')) { // 潜力丹
        const map = { low: 2, mid: 5, high: 15, super: 50, immortal: 100 };
        const points = map[pillKey.split('_')[2]];
        doll.availableAttributePoints += points;
    } else if (pillKey.startsWith('pill_spirit')) { // 灵气丹
        const map = { low: 1000, mid: 3000, high: 5000, super: 10000, immortal: 250000 };
        const spirit = map[pillKey.split('_')[2]];
        doll.spiritualEnergy += spirit;
    }
    
    await doll.save();
    res.json({ success: true, message: '服用成功', data: doll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAlchemistData,
  buyGardenItem,
  unlockPlot,
  restoreDurability,
  plantCrop,
  harvestCrop,
  startRefining,
  collectPill,
  usePill
};
