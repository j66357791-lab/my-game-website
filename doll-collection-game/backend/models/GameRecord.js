const mongoose = require('mongoose');

const gameRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gameType: {
        type: String,
        required: true,
        enum: ['space-challenge', 'doll-collection']
    },
    record: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// 添加索引
gameRecordSchema.index({ userId: 1, gameType: 1, timestamp: -1 });

module.exports = mongoose.model('GameRecord', gameRecordSchema);