const mongoose = require('mongoose');

// 使用你server.js中的数据库连接字符串
const MONGODB_URI = 'mongodb+srv://j66357791_db_user:hjh628727@cluster0.oiwbvje.mongodb.net/chaowan-db?retryWrites=true&w=majority';

async function fixStarcoin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 直接执行更新
    const result = await mongoose.connection.db.collection('users').updateMany(
      { starcoin: { $exists: false } },
      { 
        $set: { 
          starcoin: 0,
          deployedDolls: [],
          vipCards: []
        } 
      }
    );
    
    console.log(`✅ 成功更新 ${result.modifiedCount} 个用户`);
    
    // 检查admin用户
    const adminUser = await mongoose.connection.db.collection('users').findOne(
      { email: "admin@example.com" }
    );
    
    console.log('📋 Admin用户更新后:', {
      email: adminUser.email,
      points: adminUser.points,
      starcoin: adminUser.starcoin,
      cashBalance: adminUser.cashBalance,
      deployedDolls: adminUser.deployedDolls,
      vipCards: adminUser.vipCards
    });
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

fixStarcoin();
