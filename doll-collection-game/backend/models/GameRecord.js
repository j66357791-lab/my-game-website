// models/GameRecord.js
const mongoose = require('mongoose');

const gameRecordSchema = new mongoose.Schema({
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
        red: Number,
        blue: Number,
        draw: Number,
        redStars: [Number],
        blueStars: [Number]
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

module.exports = mongoose.model('GameRecord', gameRecordSchema);
