// frontend/src/components/MysteryCard/BetButton.js
import React from 'react';

const BetButton = ({ position, amount, onBet }) => {
  return (
    <button 
      className="bet-button"
      onClick={onBet}
      disabled={amount <= 0}
    >
      下注 {amount} 积分
    </button>
  );
};

export default BetButton;
