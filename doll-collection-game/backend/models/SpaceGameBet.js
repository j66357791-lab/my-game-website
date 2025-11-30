const mongoose = require('mongoose');

const spaceGameBetSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gameSessionId: { type: String, required: true },
    betOnFighter: { type: Number, required: true },
    betAmount: { type: Number, required: true },
    result: { type: String, enum: ['pending', 'win', 'lose'], default: 'pending' },
    profit: { type: Number, default: 0 },
    bossStar: { type: Number },
    playerFighterStar: { type: Number },
    isRobot: { type: Boolean, default: false },
    robotName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SpaceGameBet', spaceGameBet);
