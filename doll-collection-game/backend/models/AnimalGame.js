const mongoose = require('mongoose');

const GamePlayerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  betAmount: { type: Number, required: true },
  joinTime: { type: Date, default: Date.now }
});

const GameRoomSchema = new mongoose.Schema({
  roomName: { type: String, required: true },
  players: [GamePlayerSchema],
  totalBet: { type: Number, default: 0 }
});

const GameRoundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  rooms: [GameRoomSchema],
  hunterTarget: [{ type: String }],
  isRageMode: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['waiting', 'active', 'finished'], 
    default: 'waiting' 
  },
  totalPlayers: { type: Number, default: 0 },
  totalBetPool: { type: Number, default: 0 },
  fee: { type: Number, default: 0 },
  candiesDistributed: { type: Number, default: 0 }
});

const GameStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalGames: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  totalBet: { type: Number, default: 0 },
  totalWon: { type: Number, default: 0 },
  candies: { type: Number, default: 0 },
  lastPlayed: { type: Date, default: Date.now }
});

module.exports = {
  GameRound: mongoose.model('GameRound', GameRoundSchema),
  GameStats: mongoose.model('GameStats', GameStatsSchema)
};
