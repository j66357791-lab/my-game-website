// frontend/src/components/IconBrawl/BetButton.js
import React from 'react';
import './BetButton.css';

const BetButton = ({ icon, totalBet, myBet, disabled, onClick, theme }) => {
  return (
    <button
      className="bet-button"
      style={{ backgroundColor: icon.color }}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="icon-symbol">{icon.symbol}</div>
      <div className="icon-name">{icon.name}</div>
      <div className="bet-amount">
        总: {totalBet}
      </div>
      <div className="my-bet">
        我: {myBet}
      </div>
    </button>
  );
};

export default BetButton;
