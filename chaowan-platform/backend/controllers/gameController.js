// backend/controllers/gameController.js
const { GameSession, Bet, User } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

// 生成随机图标组合
function generateIcons() {
  const icons = ['heart', 'burger', 'chest', 'cola', 'car', 'fridge'];
  const rand = Math.random() * 100;
  
  if (rand < 15) { // 15% 全相同
    const icon = icons[Math.floor(Math.random() * 6)];
    return [icon, icon, icon];
  } else if (rand < 45) { // 30% 全不同
    return [...icons].sort(() => Math.random() - 0.5).slice(0, 3);
  } else { // 55% 两个相同
    const same = icons[Math.floor(Math.random() * 6)];
    const diff = icons.filter(i => i !== same)[Math.floor(Math.random() * 5)];
    return [same, same, diff].sort(() => Math.random() - 0.5);
  }
}

// 获取当前游戏状态
exports.getCurrentGame = async (req, res) => {
  try {
    let session = await GameSession.findOne({
      where: { status: { [Op.not]: 'finished' } },
      order: [['start_time', 'DESC']]
    });

    if (!session) {
      session = await GameSession.create({
        session_id: `G${Date.now()}`,
        status: 'betting'
      });
    }

    const bets = await Bet.findAll({ 
      where: { session_id: session.session_id },
      include: [{ model: User, attributes: ['id', 'username'] }]
    });

    res.json({ session, bets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 下注
exports.placeBet = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { session_id, bets } = req.body;
    const user_id = req.user.id;
    
    // 验证游戏状态
    const session = await GameSession.findOne({ 
      where: { session_id },
      transaction: t
    });
    
    if (!session || session.status !== 'betting') {
      await t.rollback();
      return res.status(400).json({ error: '下注阶段已结束' });
    }

    // 验证用户积分
    const user = await User.findByPk(user_id, { transaction: t });
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    
    if (user.points < totalBet) {
      await t.rollback();
      return res.status(400).json({ error: '积分不足' });
    }

    // 处理下注
    for (const bet of bets) {
      if (bet.amount < 10 || bet.amount > 10000) {
        await t.rollback();
        return res.status(400).json({ error: '下注金额必须在10-10000之间' });
      }

      await Bet.create({
        session_id,
        user_id,
        icon_type: bet.icon,
        bet_amount: bet.amount
      }, { transaction: t });
    }
    
    // 更新用户积分和奖池
    await user.update({ points: user.points - totalBet }, { transaction: t });
    await session.increment('total_pot', { by: totalBet, transaction: t });

    await t.commit();
    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// 结算游戏
exports.settleGame = async (session_id) => {
  const t = await sequelize.transaction();
  
  try {
    const session = await GameSession.findByPk(session_id, { transaction: t });
    if (!session || session.status !== 'revealing') {
      await t.rollback();
      return;
    }

    const resultIcons = generateIcons();
    const winningIcons = [...new Set(resultIcons)];
    
    // 获取所有下注
    const allBets = await Bet.findAll({ 
      where: { session_id },
      transaction: t
    });

    if (allBets.length === 0) {
      await session.update({
        status: 'finished',
        end_time: new Date(),
        result_icons: resultIcons,
        winning_icons: winningIcons
      }, { transaction: t });
      await t.commit();
      return;
    }

    // 按图标分组下注
    const betsByIcon = {};
    allBets.forEach(bet => {
      if (!betsByIcon[bet.icon_type]) {
        betsByIcon[bet.icon_type] = { total: 0, players: {} };
      }
      betsByIcon[bet.icon_type].total += bet.bet_amount;
      betsByIcon[bet.icon_type].players[bet.user_id] = 
        (betsByIcon[bet.icon_type].players[bet.user_id] || 0) + bet.bet_amount;
    });

    // 计算奖励
    const rewards = {};
    let totalReward = 0;

    for (const icon of winningIcons) {
      if (betsByIcon[icon]) {
        const iconBets = betsByIcon[icon];
        // 计算失败方的总下注
        const losingBets = allBets
          .filter(b => !winningIcons.includes(b.icon_type))
          .reduce((sum, b) => sum + b.bet_amount, 0);
        
        for (const [playerId, playerBet] of Object.entries(iconBets.players)) {
          const share = (playerBet / iconBets.total) * losingBets;
          rewards[playerId] = (rewards[playerId] || 0) + share;
          totalReward += share;
        }
      }
    }

    // 更新用户积分
    for (const [userId, amount] of Object.entries(rewards)) {
      await User.increment(
        { points: Math.floor(amount) },
        { where: { id: userId }, transaction: t }
      );
    }
    
    // 更新游戏状态
    await session.update({
      status: 'finished',
      end_time: new Date(),
      result_icons: resultIcons,
      winning_icons: winningIcons
    }, { transaction: t });

    await t.commit();
    console.log(`游戏 ${session_id} 结算完成，总奖励: ${totalReward}`);
    return { resultIcons, rewards };
  } catch (error) {
    await t.rollback();
    console.error('结算错误:', error);
  }
};

// 获取历史记录
exports.getHistory = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    const sessions = await GameSession.findAll({
      where: { status: 'finished' },
      order: [['end_time', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
