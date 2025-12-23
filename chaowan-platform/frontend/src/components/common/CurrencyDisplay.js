// frontend/src/components/common/CurrencyDisplay.js
import React from 'react';
import { useUser } from '../../contexts/UserContext';
import './CurrencyDisplay.css'; // 你需要创建这个css文件

const CurrencyDisplay = () => {
  const { integral, starcoin, vipDaysLeft } = useUser();

  return (
    <div className="currency-display">
      <div className="currency-item">
        <span className="currency-icon">💎</span>
        <span>{integral}</span>
      </div>
      <div className="currency-item">
        <span className="currency-icon">⭐</span>
        <span>{starcoin}</span>
      </div>
      <div className="currency-item vip-status">
        <span className="currency-icon">👑</span>
        <span>{vipDaysLeft > 0 ? `${vipDaysLeft}天` : '未开通'}</span>
      </div>
    </div>
  );
};

export default CurrencyDisplay;
