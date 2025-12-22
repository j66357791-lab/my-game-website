// backend/models/MysteryCardGame.js
const mongoose = require('mongoose');

const mysteryCardGameSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  lordCard: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  generalsCards: {
    east: { type: Number, required: true, min: 0, max: 10 },
    south: { type: Number, required: true, min: 0, max: 10 },
    west: { type: Number, required: true, min: 0, max: 10 },
    north: { type: Number, required: true, min: 0, max: 10 }
  },
  results: {
    east: { type: String, enum: ['win', 'lose', 'draw'], required: true },
    south: { type: String, enum: ['win', 'lose', 'draw'], required: true },
    west: { type: String, enum: ['win', 'lose', 'draw'], required: true },
    north: { type: String, enum: ['win', 'lose', 'draw'], required: true }
  },
  totalBets: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  totalLosses: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 索引
mysteryCardGameSchema.index({ roundNumber: 1 });
mysteryCardGameSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MysteryCardGame', mysteryCardGameSchema);
