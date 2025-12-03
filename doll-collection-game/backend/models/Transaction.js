// backend/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'purchase',      // 购买娃娃
            'synthesis',     // 合成娃娃
            'income',        // 每日收益
            'admin_adjust',  // 管理员调整
            'admin_grant',   // 管理员发放
            'transfer_out',  // 转出
            'transfer_in',   // 转入
            'recycle'        // 回收娃娃
        ]
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 200
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true  // 自动添加updatedAt字段
});

// 添加索引提高查询性能
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

// 添加虚拟字段：格式化金额
transactionSchema.virtual('formattedAmount').get(function() {
    return this.amount >= 0 ? `+${this.amount.toFixed(2)}` : this.amount.toFixed(2);
});

// 添加静态方法：获取用户交易记录
transactionSchema.statics.getUserTransactions = function(userId, options = {}) {
    const query = this.find({ userId });
    
    if (options.type) {
        query.where({ type: options.type });
    }
    
    if (options.startDate && options.endDate) {
        query.where({
            createdAt: {
                $gte: new Date(options.startDate),
                $lte: new Date(options.endDate)
            }
        });
    }
    
    return query.sort({ createdAt: -1 }).limit(options.limit || 50);
};

module.exports = mongoose.model('Transaction', transactionSchema);
