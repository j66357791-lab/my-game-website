// backend/controllers/mysteryCardController.js
const User = require('../models/User');
const MysteryCardGame = require('../models/MysteryCardGame');
const Transaction = require('../models/Transaction');

class MysteryCardController {
  // 生成领主卡牌
  generateLordCard() {
    const probabilities = [
      { star: 0, prob: 0.05 },
      { star: 1, prob: 0.10 },
      { star: 2, prob: 0.12 },
      { star: 3, prob: 0.05 },
      { star: 4, prob: 0.10 },
      { star: 5, prob: 0.08 },
      { star: 6, prob: 0.13 },
      { star: 7, prob: 0.10 },
      { star: 8, prob: 0.12 },
      { star: 9, prob: 0.10 },
      { star: 10, prob: 0.05 }
    ];

    return this.generateCardByProbability(probabilities);
  }

  // 生成战将卡牌
  generateGeneralCard() {
    const probabilities = [
      { star: 0, prob: 0.04 },
      { star: 1, prob: 0.08 },
      { star: 2, prob: 0.10 },
      { star: 3, prob: 0.07 },
      { star: 4, prob: 0.11 },
      { star: 5, prob: 0.15 },
      { star: 6, prob: 0.13 },
      { star: 7, prob: 0.07 },
      { star: 8, prob: 0.08 },
      { star: 9, prob: 0.08 },
      { star: 10, prob: 0.07 }
    ];

    return this.generateCardByProbability(probabilities);
  }

  // 根据概率生成卡牌
  generateCardByProbability(probabilities) {
    const random = Math.random();
    let cumulative = 0;
    
    for (const { star, prob } of probabilities) {
      cumulative += prob;
      if (random <= cumulative) {
        return star;
      }
    }
    
    return 1; // 默认返回1星
  }

  // 处理下注
  async processBet(userId, general, amount) {
    try {
      // 验证用户
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      // 验证积分
      if (user.points < amount) {
        return { success: false, message: '积分不足' };
      }

      // 验证下注金额（最多下注积分的十分之一）
      const maxBet = Math.floor(user.points / 10);
      if (amount > maxBet) {
        return { success: false, message: `最多可下注${maxBet}积分` };
      }

      // 验证最低下注
      if (amount < 10) {
        return { success: false, message: '最低下注10积分' };
      }

      // 扣除积分（包含5%手续费）
      const fee = Math.floor(amount * 0.05);
      const actualAmount = amount - fee;
      
      user.points -= amount;
      await user.save();

      // 记录交易
      await Transaction.create({
        userId,
        type: 'mystery_card_bet',
        amount: -amount,
        balance: user.points,
        description: `神秘卡牌下注${general}战将`,
        metadata: { general, amount, fee }
      });

      return { success: true, actualAmount };
    } catch (error) {
      console.error('下注处理错误:', error);
      return { success: false, message: '下注处理失败' };
    }
  }

  // 结算下注
  async settleBet(userId, general, amount, lordStar, generalStar) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const multiplier = generalStar === 0 ? 1 : generalStar;
      let result = 'lose';
      let winAmount = 0;
      
      if (generalStar > lordStar) {
        // 用户获胜
        result = 'win';
        winAmount = amount * multiplier;
        user.points += winAmount;
      } else if (generalStar === lordStar) {
        // 平局
        result = 'draw';
        winAmount = amount;
        user.points += amount;
      }
      // 如果输了，不返还积分

      await user.save();

      // 记录交易
      if (result !== 'lose') {
        await Transaction.create({
          userId,
          type: 'mystery_card_settlement',
          amount: winAmount,
          balance: user.points,
          description: `神秘卡牌${result === 'win' ? '获胜' : '平局'}`,
          metadata: { result, general, lordStar, generalStar, multiplier }
        });
      }

      return { result, winAmount, multiplier };
    } catch (error) {
      console.error('结算处理错误:', error);
      throw error;
    }
  }

  // 保存游戏记录
  async saveRoundRecord(gameData) {
    try {
      const gameRecord = new MysteryCardGame(gameData);
      await gameRecord.save();
      return gameRecord;
    } catch (error) {
      console.error('保存游戏记录错误:', error);
      throw error;
    }
  }

  // 获取游戏历史
  async getGameHistory(limit = 20) {
    try {
      return await MysteryCardGame.find()
        .sort({ roundNumber: -1 })
        .limit(limit);
    } catch (error) {
      console.error('获取游戏历史错误:', error);
      throw error;
    }
  }

  // 获取用户游戏历史
  async getUserGameHistory(userId, limit = 50) {
    try {
      const transactions = await Transaction.find({
        userId,
        type: { $in: ['mystery_card_bet', 'mystery_card_settlement'] }
      })
      .sort({ createdAt: -1 })
      .limit(limit);

      return transactions;
    } catch (error) {
      console.error('获取用户游戏历史错误:', error);
      throw error;
    }
  }
}

module.exports = MysteryCardController;
