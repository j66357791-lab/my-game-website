// backend/jobs/starcoinProduction.js
const Doll = require('../models/Doll');
const User = require('../models/User');
const cron = require('node-cron');

// 执行每日星源币产出
const executeDailyStarcoinProduction = async () => {
  console.log('🌙 开始执行每日星源币产出任务...');
  try {
    const deployedDolls = await Doll.find({ status: 'deployed' }).populate('userId');
    let totalProduction = 0;
    let expiredDollIds = [];

    for (const doll of deployedDolls) {
      const config = Doll.getDollConfigByLevel(doll.level);
      if (!config) continue;

      // 检查是否过期
      if (doll.isExpired()) {
        expiredDollIds.push(doll._id);
        console.log(`⏰ 娃娃 ${doll.name} (ID: ${doll._id}) 已过期，将被移除。`);
        continue;
      }
      
      // 为用户增加星源币
      const user = doll.userId;
      if (user) {
        user.starcoin += config.daily_production;
        await user.save();
        totalProduction += config.daily_production;
        console.log(`💰 用户 ${user.username} 的娃娃 ${doll.name} 产出 ${config.daily_production} 星源币。`);
      }
    }

    // 移除所有过期的娃娃
    if (expiredDollIds.length > 0) {
      await Doll.deleteMany({ _id: { $in: expiredDollIds } });
      console.log(`🗑️ 已移除 ${expiredDollIds.length} 个过期的娃娃。`);
    }

    console.log(`✅ 每日星源币产出完成！总产出: ${totalProduction}，影响用户数: ${deployedDolls.length - expiredDollIds.length}`);
  } catch (error) {
    console.error('❌ 每日星源币产出任务失败:', error);
  }
};

// 设置定时任务，每天凌晨0点执行
cron.schedule('0 0 * * *', executeDailyStarcoinProduction, {
  timezone: "Asia/Shanghai" // 请根据你的服务器时区调整
});

module.exports = { executeDailyStarcoinProduction };
