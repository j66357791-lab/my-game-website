// src/components/GlobalLoader.js
import React from 'react';
import './GlobalLoader.css';

const GlobalLoader = ({ text = '连接中...' }) => {
  return (
    <div className="global-loader-overlay">
      <div className="loader-content">
        <div className="loader-logo">🎮</div>
        <div className="loader-text">{text}</div>
        <div className="loader-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoader;
