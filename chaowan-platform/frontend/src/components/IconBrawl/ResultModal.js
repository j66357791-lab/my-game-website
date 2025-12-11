// frontend/src/components/IconBrawl/ResultModal.js
import React from 'react';
import './ResultModal.css';

const ResultModal = ({ show, result, myBets, isWin, onClose, onPlayAgain }) => {
  if (!show) return null;

  return (
    <div className="result-modal-overlay" onClick={onClose}>
      <div className="result-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="result-header">
          <h2>{isWin ? '🎉 恭喜获胜！' : '😔 很遗憾，再接再厉！'}</h2>
        </div>
        
        <div className="result-body">
          <div className="result-icons">
            {result?.result_icons?.map((icon, index) => (
              <div key={index} className="result-icon">
                {icon}
              </div>
            ))}
          </div>
          
          <div className="result-info">
            <p>中奖图标: {result?.winning_icons?.join(', ')}</p>
            <p>您的下注: {Object.entries(myBets).map(([icon, amount]) => `${icon}(${amount})`).join(', ')}</p>
          </div>
        </div>
        
        <div className="result-footer">
          <button className="result-btn" onClick={onPlayAgain}>
            再来一局
          </button>
          <button className="result-btn secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
