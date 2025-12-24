const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  session_id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  start_time: { 
    type: Date, 
    default: Date.now 
  },
  end_time: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ['waiting', 'betting', 'locked', 'revealing', 'finished'],
    default: 'betting'
  },
  result_icons: { 
    type: [String] 
  },
  winning_icons: { 
    type: [String] 
  },
  total_pot: { 
    type: Number, 
    default: 0 
  },
  total_players: { 
    type: Number, 
    default: 0 
  }
}, {
  timestamps: true
});

// 静态方法：生成随机图标
gameSessionSchema.statics.generateIcons = function() {
  const icons = ['heart', 'burger', 'chest', 'cola', 'car', 'fridge'];
  const rand = Math.random() * 100;
  
  if (rand < 15) { // 15% 全相同
    const icon = icons[Math.floor(Math.random() * 6)];
    return [icon, icon, icon];
  } else if (rand < 45) { // 30% 全不同
    return [...icons].sort(() => Math.random() - 0.5).slice(0, 3);
  } else { // 55% 两个相同
    const same = icons[Math.floor(Math.random() * 6)];
    const diff = icons.filter(i => i !== same)[Math.floor(Math.random() * 5)];
    return [same, same, diff].sort(() => Math.random() - 0.5);
  }
};

module.exports = mongoose.model('GameSession', gameSessionSchema);
