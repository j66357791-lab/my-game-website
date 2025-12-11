// frontend/src/components/IconBrawl/BetButton.js
import React from 'react';
import './BetButton.css';

const BetButton = ({ icon, totalBet, myBet, pendingBet, disabled, onClick, onQuickBet, theme }) => {
  const safeIcon = icon || { symbol: '?', color: '#999', name: '未知' };
  const safeTotalBet = totalBet || 0;
  const safeMyBet = myBet || 0;
  const safePendingBet = pendingBet || 0;

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
      {/* 🔧 新增：显示待确认下注 */}
      {safePendingBet > 0 && (
        <div className="pending-bet">
          待: {safePendingBet}
        </div>
      )}
      {onQuickBet && (
        <div className="quick-bet-hint">
          点击图标或使用快速下注
        </div>
      )}
    </button>
  );
};

export default BetButton;
