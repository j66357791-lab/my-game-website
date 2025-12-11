// backend/models/Bet.js
module.exports = (sequelize, DataTypes) => {
  const Bet = sequelize.define('Bet', {
    bet_id: { 
      type: DataTypes.BIGINT, 
      autoIncrement: true, 
      primaryKey: true 
    },
    session_id: { type: DataTypes.STRING(50) },
    user_id: { type: DataTypes.STRING(50) },
    icon_type: { 
      type: DataTypes.ENUM('heart', 'burger', 'chest', 'cola', 'car', 'fridge')
    },
    bet_amount: { type: DataTypes.DECIMAL(10, 2) },
    created_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  });
  return Bet;
};
