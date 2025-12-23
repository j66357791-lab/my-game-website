const mongoose = require('mongoose');

const MysteryCardControlSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['RANDOM', 'FIXED', 'PROBABILITY'],
    default: 'RANDOM' 
  },
  fixedLordValue: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  biasDirection: {
    type: String,
    enum: ['east', 'south', 'west', 'north', 'none'],
    default: 'none'
  }
}, { timestamps: true });

module.exports = mongoose.model('MysteryCardControl', MysteryCardControlSchema);
