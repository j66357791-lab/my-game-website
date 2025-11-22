const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: [
            'purchase',      // 购买娃娃
            'synthesis',     // 合成娃娃
            'income',        // 每日收益
            'transfer_in',   // 转账收入
            'transfer_out',  // 转账支出
            'game_bet',      // 游戏投注
            'game_win',      // 游戏获胜
            'feed_purchase', // 饲料购买
            'chicken_draw',  // 抽取小鸡
            'coop_upgrade',  // 养鸡场升级
            'egg_exchange',  // 鸡蛋兑换
            'egg_pool_exchange', // 鸡蛋兑换到积分池
            'admin_adjust'   // 管理员调整
        ], 
        required: true 
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    // 可选字段
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' },
    chickenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chicken' },
    feedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feed' },
    dollId: { type: mongoose.Schema.Types.ObjectId