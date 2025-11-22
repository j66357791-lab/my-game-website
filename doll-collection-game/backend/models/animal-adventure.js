const mongoose = require('mongoose');

const GameRoundSchema = new mongoose.Schema({
    roundId: { type: Number, required: true, unique: true },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    status: { type: String, enum: ['waiting', 'active', 'finished'], default: 'waiting' },
    hunterRooms: [String], // 猎人袭击的房间
    isRageMode: { type: Boolean, default: false }, // 狂暴模式
    totalBets: { type: Number, default: 0 },
    totalPlayers: { type: Number, default: 0 }
});

const PlayerBetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roundId: { type: Number, required: true },
    room: { type: String, required: true },
    betAmount: { type: Number, required: true },
    isSurvivor: { type: Boolean },
    reward: { type: Number },
    candies: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});

const GameStatsSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    totalRounds: { type: Number, default: 0 },
    totalPlayers: { type: Number, default: 0 },
    totalBets: { type: Number, default: 0 },
    roomStats: {
        grassland: { bets: 0, players: 0 },
        bushes: { bets: 0, players: 0 },
        forest: { bets: 0, players: 0 },
        lake: { bets: 0, players: 0 },
        cave: { bets: 0, players: 0 }
    }
});

module.exports = {
    GameRound: mongoose.model('GameRound', GameRoundSchema),
    PlayerBet: mongoose.model('PlayerBet', PlayerBetSchema),
    GameStats: mongoose.model('GameStats', GameStatsSchema)
};
