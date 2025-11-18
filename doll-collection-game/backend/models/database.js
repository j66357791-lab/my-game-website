// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // 连接字符串 - 开发时用本地，生产时用环境变量
        const conn = await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017/doll-collection-game',
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
        );

        console.log(`MongoDB连接成功: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB连接失败:', error);
        process.exit(1); // 退出进程
    }
};

module.exports = connectDB;