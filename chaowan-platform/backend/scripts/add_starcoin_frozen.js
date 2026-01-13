// backend/scripts/add_starcoin_frozen.js
const mongoose = require('mongoose');
require('dotenv').config();
require('../config/db'); // 确保路径正确，连接数据库

const User = require('../models/User');

async function migrate() {
  try {
    console.log('🚀 开始迁移：添加 frozenStarCoin 字段...');
    
    // 检查字段是否存在，不存在则添加
    const updateResult = await User.updateMany(
      { frozenStarCoin: { $exists: false } }, // 只更新没有这个字段的文档
      { $set: { frozenStarCoin: 0 } }
    );

    console.log(`✅ 迁移完成！影响用户数: ${updateResult.modifiedCount}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

migrate();
