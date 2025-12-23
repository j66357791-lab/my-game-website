// frontend/src/components/IconBrawl/ProgressBar.js
import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ progress, status }) => {
  const getProgressColor = () => {
    switch (status) {
      case 'betting': return '#4CAF50';
      case 'locked': return '#FF9800';
      case 'revealing': return '#2196F3';
      case 'finished': return '#9C27B0';
      default: return '#666';
    }
  };

  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar-fill"
        style={{ 
          width: `${progress}%`,
          backgroundColor: getProgressColor()
        }}
      />
    </div>
  );
};

export default ProgressBar;
