// src/components/RaceModal/RaceModal.js
import React, { useState, useEffect } from 'react';
import './RaceModal.css';

const RaceModal = ({ raceResult, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    // 动画进度
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    // 随机决定胜者
    const winner = Math.random() < 0.5 ? 'turtle' : 'rabbit';
    setWinner(winner);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="race-modal-overlay">
      <div className="race-modal-content">
        <h2>龟兔赛跑</h2>
        
        <div className="race-track">
          <div className="runner turtle" style={{ left: `${progress * 0.5}%` }}>
            🐢
          </div>
          <div className="runner rabbit" style={{ left: `${progress}%` }}>
            🐰
          </div>
          <div className="finish-line">🏁</div>
        </div>

        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="race-info">
          <p>比赛进度: {progress}%</p>
          {winner && (
            <p>
              {winner === 'turtle' ? '🐢 乌龟' : '🐰 兔子'} 领先！
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaceModal;
