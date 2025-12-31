// backend/controllers/mailController.js
const Mail = require('../models/Mail');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 获取用户邮件列表
exports.getUserMails = async (req, res) => {
  try {
    const userId = req.user.userId; // 假设中间件解析了userId
    const mails = await Mail.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: mails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 领取邮件奖励
exports.claimMail = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { mailId } = req.params;
    const userId = req.user.userId;

    const mail = await Mail.findOne({ _id: mailId, userId }).session(session);
    if (!mail) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: '邮件不存在' });
    }

    if (mail.isClaimed) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: '奖励已领取' });
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('用户不存在');

    // 增加余额
    let totalPoints = 0;
    let totalStarcoin = 0;
    let totalCash = 0;

    if (mail.rewards.points > 0) {
      user.points += mail.rewards.points;
      totalPoints += mail.rewards.points;
    }
    if (mail.rewards.starcoin > 0) {
      user.starcoin += mail.rewards.starcoin;
      totalStarcoin += mail.rewards.starcoin;
    }
    if (mail.rewards.cash > 0) {
      user.cashBalance += mail.rewards.cash;
      totalCash += mail.rewards.cash;
    }

    await user.save({ session });

    // 标记邮件已领取
    mail.isClaimed = true;
    mail.isRead = true;
    await mail.save({ session });

    // 记录交易明细
    if (totalPoints > 0 || totalStarcoin > 0 || totalCash > 0) {
      const transaction = new Transaction({
        userId,
        type: 'mail_claim',
        amount: totalPoints, // 主要记录积分，其他在metadata
        balance: user.points,
        description: `邮件领取: ${mail.title}`,
        currency: 'points', // 简化处理，主要货币
        metadata: {
          starcoin: totalStarcoin,
          cash: totalCash
        }
      });
      await transaction.save({ session });
    }

    await session.commitTransaction();

    res.json({ 
      success: true, 
      message: '领取成功',
      data: {
        points: user.points,
        starcoin: user.starcoin,
        cashBalance: user.cashBalance
      }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};
