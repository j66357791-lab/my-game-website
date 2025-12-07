// backend/jobs/pointProduction.js
const Doll = require('../models/Doll');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { SYSTEM_CONFIG } = require('../config/constants');

// 执行每日积分产出
const executeDailyProduction = async () => {
  try {
    console.log('开始执行每日积分产出...');
    
    // 获取所有未过期的娃娃
    const activeDolls = await Doll.find({
      isExpired: false,
      isRecycled: false
    }).populate('userId');

    let totalProduction = 0;
    let processedUsers = new Set();

    for (const doll of activeDolls) {
      // 检查是否过期
      const wasExpired = doll.checkExpiration();
      if (wasExpired) {
        await doll.save();
        continue;
      }

      // 获取用户加成
      const user = doll.userId;
      const userBonus = user.getProductionBonus();
      
      // 执行产出
      const production = doll.produceDaily(userBonus);
      if (production > 0) {
        // 更新用户积分
        user.points += production;
        user.todayPointsEarned += production;
        user.totalPointsEarned += production;
        await user.save();
        
        // 记录交易
        await new Transaction({
          userId: user._id,
          type: 'production',
          amount: production,
          balance: user.points,
          description: `${doll.name} 每日产出`,
          relatedId: doll._id,
          metadata: {
            dollLevel: doll.level,
            dollName: doll.name
          }
        }).save();
        
        totalProduction += production;
        processedUsers.add(user._id);
      }
      
      await doll.save();
    }

    // 重置今日产出统计
    for (const userId of processedUsers) {
      await User.findByIdAndUpdate(userId, {
        todayPointsEarned: 0
      });
    }

    console.log(`每日产出完成！总产出: ${totalProduction} 积分，影响用户: ${processedUsers.size} 人`);
    
  } catch (error) {
    console.error('每日产出执行失败:', error);
  }
};

// 使用node-cron设置定时任务
const cron = require('node-cron');
cron.schedule('0 0 * * *', executeDailyProduction, {
  timezone: SYSTEM_CONFIG.timezone
});

module.exports = { executeDailyProduction };
