const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 云端数据库连接成功');
        console.log(`📊 连接到数据库: ${conn.connection.name}`);
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
