const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    description: {
        type: String,
        default: '积分转账'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'  // 修改：默认为待处理
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // 新增：处理时间
    processedAt: {
        type: Date,
        default: null
    },
    // 新增：失败原因
    errorMessage: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('Transfer', transferSchema);
