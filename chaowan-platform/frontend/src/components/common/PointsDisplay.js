// src/components/common/PointsDisplay.js
import React from 'react';
import { useUser } from '../../contexts/UserContext';
import './PointsDisplay.css';

const PointsDisplay = ({ showCash = false, size = 'medium' }) => {
  const { points, cashBalance } = useUser();

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'points-small';
      case 'large': return 'points-large';
      default: return 'points-medium';
    }
  };

  return (
    <div className={`points-display ${getSizeClass()}`}>
      <div className="points-item">
        <span className="points-icon">💎</span>
        <span className="points-value">{points.toLocaleString()}</span>
        <span className="points-label">积分</span>
      </div>
      {showCash && (
        <div className="points-item">
          <span className="points-icon">💵</span>
          <span className="points-value">¥{cashBalance.toLocaleString()}</span>
          <span className="points-label">现金</span>
        </div>
      )}
    </div>
  );
};

export default PointsDisplay;

// src/components/common/DollCard.js
import React from 'react';
import { useUserData } from '../../hooks/useUserData';
import './DollCard.css';

const DollCard = ({ doll, showRecycle = false, onRecycle }) => {
  const { recycleDoll } = useUserData();

  const handleRecycle = async () => {
    if (window.confirm(`确认回收娃娃"${doll.name}"？获得${Math.floor(0.5 * doll.daysLeft)}积分`)) {
      try {
        await recycleDoll(doll.id);
        if (onRecycle) onRecycle(doll);
      } catch (error) {
        alert('回收失败: ' + error.message);
      }
    }
  };

  return (
    <div className="doll-card">
      <div className="doll-emoji">{doll.emoji}</div>
      <div className="doll-info">
        <h4>{doll.name}</h4>
        <p>Lv.{doll.level}</p>
        <p>产出: +{doll.output}/天</p>
        <p>剩余: {doll.daysLeft}天</p>
      </div>
      {showRecycle && (
        <button className="recycle-btn" onClick={handleRecycle}>
          ♻️ 回收 ({Math.floor(0.5 * doll.daysLeft)}积分)
        </button>
      )}
    </div>
  );
};

export default DollCard;
