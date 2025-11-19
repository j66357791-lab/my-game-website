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
        enum: ['purchase', 'sell', 'transfer', 'synthesis', 'income', 'admin_grant', 'admin_adjust'] // 🔧 关键修复：添加 transfer 和 sell
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    transferData: { // 🔧 关键修复：添加转增数据字段
        senderId: { type: mongoose.Schema.Types.ObjectId },
        recipientId: { type: mongoose.Schema.Types.ObjectId },
        senderRole: { type: String },
        recipientRole: { type: String },
        originalAmount: { type: Number },
        fee: { type: Number },
        bonus: { type: Number },
        actualAmount: { type: Number },
        doll1Level: { type: Number },
        doll2Level: { type: Number },
        pointsUsed: { type: Number },
        successRate: { type: Number },
        success: { type: Boolean },
        newDollLevel: { type: Number },
        newDollId: { type: mongoose.Schema.Types.ObjectId },
        recipientUsername: { type: String }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
