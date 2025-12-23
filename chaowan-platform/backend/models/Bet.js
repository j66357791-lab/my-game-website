const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  session_id: { 
    type: String, 
    required: true,
    ref: 'GameSession'
  },
  user_id: { 
    type: String, 
    required: true 
  },
  icon_type: { 
    type: String, 
    enum: ['heart', 'burger', 'chest', 'cola', 'car', 'fridge'],
    required: true
  },
  bet_amount: { 
    type: Number, 
    required: true,
    min: 10,
    max: 10000
  }
}, {
  timestamps: true
});

// 复合索引
betSchema.index({ session_id: 1, user_id: 1 });
betSchema.index({ session_id: 1, icon_type: 1 });

module.exports = mongoose.model('Bet', betSchema);
