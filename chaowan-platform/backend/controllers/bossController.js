// backend/controllers/bossController.js
const Boss = require('../models/Boss');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 挑战Boss
exports.challengeBoss = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bossId } = req.body;

    const boss = await Boss.findOne({ _id: bossId, isActive: true });
    if (!boss) {
      return res.status(400).json({ success: false, message: 'Boss不存在' });
    }

    // 检查用户是否已参与
    if (boss.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: '已参与挑战' });
    }

    // 添加参与记录
    boss.participants.push(userId);
    await boss.save();

    res.json({ success: true, message: '挑战开始', data: { boss } });
  } catch (error) {
    res.status(500).json({ success: false, message: '挑战失败', error: error.message });
  }
};

// 攻击Boss
exports.attackBoss = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bossId, damage } = req.body;

    const boss = await Boss.findOne({ _id: bossId, isActive: true });
    if (!boss) {
      return res.status(400).json({ success: false, message: 'Boss不存在' });
    }

    // 计算伤害（简化版：直接使用传入的伤害值）
    boss.currentHp -= damage;
    boss.totalDamage += damage;
    await boss.save();

    // 计算积分掉落（每100伤害掉落38-188积分）
    const integralDrop = Math.floor(damage / 100) * (Math.floor(Math.random() * 151) + 38);

    // 增加用户积分
    const user = await User.findById(userId);
    user.points += integralDrop;
    await user.save();

    // 记录交易
    await new Transaction({
      userId,
      type: 'boss_integral',
      amount: integralDrop,
      currency: 'points',
      balance: user.points,
      description: 'Boss挑战积分掉落',
      metadata: { bossId, damage, integralDrop }
    }).save();

    // 检查Boss是否被击杀
    if (boss.currentHp <= 0) {
      // 计算现金红包（88.8-188.8元）
      const cashReward = (Math.random() * 100 + 88.8).toFixed(1);
      
      // 标记Boss为已击杀
      boss.isActive = false;
      await boss.save();

      // 发放现金红包（实际需对接支付接口）
      res.json({ 
        success: true, 
        message: 'Boss被击杀！', 
        data: { 
          bossKilled: true, 
          cashReward, 
          integralDrop 
        } 
      });
    } else {
      res.json({ 
        success: true, 
        message: '攻击成功', 
        data: { 
          bossHp: boss.currentHp, 
          integralDrop 
        } 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '攻击失败', error: error.message });
  }
};
