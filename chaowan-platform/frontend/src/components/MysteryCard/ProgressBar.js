// frontend/src/components/MysteryCard/ProgressBar.js
import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ totalBets, maxBets = 1000 }) => {
  const percentage = Math.min((totalBets / maxBets) * 100, 100);
  
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="progress-label">
        总下注: {totalBets} / {maxBets}
      </div>
    </div>
  );
};

export default ProgressBar;
