const mongoose = require('mongoose');
const Boss = require('../models/Boss');
require('dotenv').config();

async function initBoss() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');
    
    // 检查是否已有活跃Boss
    const existingBoss = await Boss.findOne({ isActive: true });
    if (existingBoss) {
      console.log('已存在活跃Boss:', existingBoss.name);
      return;
    }
    
    // 创建初始Boss
    const boss = new Boss({
      name: '千羽',
      maxHp: 100000,
      currentHp: 100000,
      attack: 1000,
      defense: 50,
      rewardMin: 88.8,
      rewardMax: 188.8,
      isActive: true
    });
    
    await boss.save();
    console.log('✅ Boss初始化成功:', boss.name);
  } catch (error) {
    console.error('❌ Boss初始化失败:', error);
  } finally {
    mongoose.disconnect();
  }
}

initBoss();
