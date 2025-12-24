const mongoose = require('mongoose');

const blindBoxActivitySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  collectedChars: [{ 
    type: String 
  }],
  totalDraws: { 
    type: Number, 
    default: 0 
  },
  lastDrawTime: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

blindBoxActivitySchema.index({ userId: 1 });

module.exports = mongoose.model('BlindBoxActivity', blindBoxActivitySchema);
