const mongoose = require('mongoose');

const gameTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },
    type: {
        type: String,
        enum: ['bet', 'win', 'lose'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// 索引优化
gameTransactionSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('GameTransaction', gameTransactionSchema);
