// frontend/src/components/IconBrawl/ResultModal.js
import React from 'react';
import './ResultModal.css';

const ResultModal = ({ show, result, myBets, isWin, onClose, onPlayAgain }) => {
  if (!show) return null;

  // 🔧 添加空值检查
  const totalBet = myBets && typeof myBets === 'object' 
    ? Object.values(myBets).reduce((sum, amount) => sum + (amount || 0), 0)
    : 0;
  const netResult = result?.netResult || 0;

  return (
    <div className="result-modal-overlay" onClick={onClose}>
      <div className="result-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="result-header">
          <h2>
            {isWin ? '🎉 恭喜获胜！' : '😔 很遗憾，再接再厉！'}
          </h2>
          <div className="result-summary">
            <div className={`result-amount ${isWin ? 'win' : 'lose'}`}>
              {isWin ? '+' : ''}{netResult} 积分
            </div>
            <div className="result-details">
              <span>下注: {totalBet} 积分</span>
              <span>组合: {result?.combination?.name || '未知'}</span>
              <span>倍率: {result?.combination?.multiplier || 0}x</span>
            </div>
          </div>
        </div>
        
        <div className="result-body">
          <div className="result-icons">
            {result?.result_icons && result.result_icons.map((icon, index) => (
              <div key={index} className="result-icon">
                {icon}
              </div>
            ))}
          </div>
          
          <div className="result-info">
            <p>组合类型: {result?.combination?.name || '未知'}</p>
            <p>您的下注: {
              myBets && typeof myBets === 'object'
                ? Object.entries(myBets).map(([icon, amount]) => `${icon}(${amount || 0})`).join(', ')
                : '无下注'
            }</p>
            <p>净收益: {isWin ? '+' : ''}{netResult} 积分</p>
          </div>
        </div>
        
        <div className="result-footer">
          <button className="result-btn primary" onClick={onPlayAgain}>
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
