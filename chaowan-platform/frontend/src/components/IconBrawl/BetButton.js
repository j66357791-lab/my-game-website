// frontend/src/components/IconBrawl/BetButton.js
import React from 'react';
import './BetButton.css';

const BetButton = ({ icon, totalBet, myBet, disabled, onClick, theme }) => {
  // 🔧 添加空值检查
  const safeIcon = icon || { symbol: '?', color: '#999', name: '未知' };
  const safeTotalBet = totalBet || 0;
  const safeMyBet = myBet || 0;

  return (
    <button
      className="bet-button"
      style={{ backgroundColor: safeIcon.color }}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="icon-symbol">{safeIcon.symbol}</div>
      <div className="icon-name">{safeIcon.name}</div>
      <div className="bet-amount">
        总: {safeTotalBet}
      </div>
      <div className="my-bet">
        我: {safeMyBet}
      </div>
    </button>
  );
};

export default BetButton;
