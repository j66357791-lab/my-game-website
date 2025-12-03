const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    round: {
        type: Number,
        required: true
    },
    redStar: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    blueStar: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    winner: {
        type: String,
        enum: ['red', 'blue', 'draw'],
        required: true
    },
    bets: {
        red: { type: Number, default: 0 },
        blue: { type: Number, default: 0 },
        draw: { type: Number, default: 0 },
        redStars: [{ type: Number, default: 0 }],
        blueStars: [{ type: Number, default: 0 }]
    },
    profit: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// 索引优化
gameSchema.index({ userId: 1, timestamp: -1 });
gameSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Game', gameSchema);
