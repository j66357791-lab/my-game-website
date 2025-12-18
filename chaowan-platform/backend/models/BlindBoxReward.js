const mongoose = require('mongoose');

const blindBoxRewardSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rewardType: { 
    type: String, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  charsUsed: [String],
  status: { 
    type: String, 
    default: 'completed',
    enum: ['pending', 'completed', 'failed']
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

blindBoxRewardSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BlindBoxReward', blindBoxRewardSchema);
