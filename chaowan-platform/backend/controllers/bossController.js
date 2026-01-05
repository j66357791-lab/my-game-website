// backend/controllers/bossController.js
const Boss = require('../models/Boss');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 新增：获取Boss状态
exports.getBossStatus = async (req, res) => {
  try {
    // 获取当前活跃的Boss
    const boss = await Boss.findOne({ isActive: true }).sort({ createdAt: -1 });
    
    if (!boss) {
      return res.json({
        success: true,
        data: {
          hasActiveBoss: false,
          message: '当前没有Boss活动'
        }
      });
    }

    // 获取用户的挑战记录
    const userId = req.user._id;
    const userChallenges = await Transaction.find({
      userId,
      type: 'boss_integral',
      'metadata.bossId': boss._id.toString()
    }).sort({ createdAt: -1 }).limit(5);

    // 获取最近的挑战记录
    const recentChallenges = await Transaction.find({
      type: 'boss_integral',
      'metadata.bossId': boss._id.toString()
    })
    .populate('userId', 'username')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: {
        hasActiveBoss: true,
        boss: {
          id: boss._id,
          name: boss.name,
          level: boss.level,
          currentHp: boss.currentHp,
          maxHp: boss.maxHp,
          participants: boss.participants.length,
          rewardPool: boss.rewardPool,
          isActive: boss.isActive,
          createdAt: boss.createdAt
        },
        userChallenges: userChallenges.map(challenge => ({
          damage: challenge.metadata.damage,
          integralDrop: challenge.amount,
          createdAt: challenge.createdAt
        })),
        recentChallenges: recentChallenges.map(challenge => ({
          playerName: challenge.userId.username || '匿名玩家',
          damage: challenge.metadata.damage,
          integralDrop: challenge.amount,
          time: formatTime(challenge.createdAt)
        }))
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '获取Boss状态失败', 
      error: error.message 
    });
  }
};

// 时间格式化函数
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
}

// 现有方法保持不变...
exports.challengeBoss = async (req, res) => {
  try {
    const userId = req.user._id;
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

exports.attackBoss = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bossId, damage } = req.body;

    const boss = await Boss.findOne({ _id: bossId, isActive: true });
    if (!boss) {
      return res.status(400).json({ success: false, message: 'Boss不存在' });
    }

    // 如果没有传入伤害值，计算基础伤害
    let finalDamage = damage;
    if (!finalDamage) {
      // 基础伤害 + 随机加成
      finalDamage = 100 + Math.floor(Math.random() * 50);
    }

    // 更新Boss血量
    boss.currentHp = Math.max(0, boss.currentHp - finalDamage);
    boss.totalDamage += finalDamage;
    await boss.save();

    // 计算积分掉落（每100伤害掉落38-188积分）
    const integralDrop = Math.floor(finalDamage / 100) * (Math.floor(Math.random() * 151) + 38);

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
      metadata: { bossId: bossId, damage: finalDamage, integralDrop }
    }).save();

    // 检查Boss是否被击杀
    if (boss.currentHp <= 0) {
      // 计算现金红包（88.8-188.8元）
      const cashReward = (Math.random() * 100 + 88.8).toFixed(1);
      
      // 标记Boss为已击杀
      boss.isActive = false;
      boss.defeatedAt = new Date();
      await boss.save();

      // 给最后击杀者额外奖励
      user.points += 1000; // 额外1000积分奖励
      await user.save();

      res.json({ 
        success: true, 
        message: 'Boss被击杀！', 
        data: { 
          bossKilled: true, 
          cashReward, 
          integralDrop,
          finalDamage,
          bonus: 1000
        } 
      });
    } else {
      res.json({ 
        success: true, 
        message: '攻击成功', 
        data: { 
          bossHp: boss.currentHp, 
          bossMaxHp: boss.maxHp,
          integralDrop,
          finalDamage
        } 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '攻击失败', error: error.message });
  }
};
