const mongoose = require('mongoose');

const CultivationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  gender: { type: String, enum: ['male', 'female'], required: true },
  
  realm: { 
    type: String, 
    enum: ['MORTAL', 'QI_REFINING', 'FOUNDATION', 'GOLD_CORE', 'NASCENT_SOUL', 'SPIRITUAL', 'TRIBULATION', 'MAHAYANA'],
    default: 'MORTAL' 
  },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  
  availablePoints: { type: Number, default: 0 },
  
  attributes: {
    attack: { type: Number, default: 0 },
    hp: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    aptitude: { type: Number, default: 0 },
    critRate: { type: Number, default: 0 },
    antiCrit: { type: Number, default: 0 },
    dodgeRate: { type: Number, default: 0 },
    antiDodge: { type: Number, default: 0 }
  },
  
  homePoolLevel: { type: Number, default: 1 },
  
  artifacts: [{ 
    id: String, 
    name: String, 
    effect: String,
    effectValue: Number 
  }],
  
  lastCultivationTime: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Cultivation', CultivationSchema);
