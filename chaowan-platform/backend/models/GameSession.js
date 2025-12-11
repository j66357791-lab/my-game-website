// backend/models/GameSession.js
module.exports = (sequelize, DataTypes) => {
  const GameSession = sequelize.define('GameSession', {
    session_id: { 
      type: DataTypes.STRING(50), 
      primaryKey: true,
      defaultValue: () => `G${Date.now()}`
    },
    start_time: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    },
    end_time: { type: DataTypes.DATE },
    status: { 
      type: DataTypes.ENUM('waiting', 'betting', 'locked', 'revealing', 'finished'),
      defaultValue: 'betting'
    },
    result_icons: { type: DataTypes.JSON },
    winning_icons: { type: DataTypes.JSON },
    total_pot: { 
      type: DataTypes.DECIMAL(10, 2), 
      defaultValue: 0 
    },
    total_players: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    }
  });
  return GameSession;
};
