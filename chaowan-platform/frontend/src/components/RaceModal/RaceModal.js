// frontend/src/components/RaceModal/RaceModal.js - 简化版本
import React, { useState, useEffect, useRef } from 'react';
import './RaceModal.css';

const RaceModal = ({ 
  onClose, 
  betChoice,
  isRacing,
  onRaceEnd 
}) => {
  const [turtlePosition, setTurtlePosition] = useState(0);
  const [rabbitPosition, setRabbitPosition] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [winner, setWinner] = useState(null);
  
  const animationRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!isRacing) {
      // 重置状态
      setTurtlePosition(0);
      setRabbitPosition(0);
      setShowWinner(false);
      setWinner(null);
      return;
    }

    startTimeRef.current = Date.now();
    
    // 🔧 修复：简化动画逻辑，只使用起跑模式
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = elapsed / 12000; // 🔧 延长到12秒

      // 🔧 简化：平滑的速度变化，不显示多种模式
      let turtleSpeed = 0.3 + Math.random() * 0.2;
      let rabbitSpeed = 0.35 + Math.random() * 0.2;

      // 在中途随机加速（平滑过渡）
      if (elapsed > 4000 && elapsed < 8000) {
        if (Math.random() < 0.02) { // 降低随机频率
          if (Math.random() < 0.5) {
            turtleSpeed *= 1.8;
          } else {
            rabbitSpeed *= 1.8;
          }
        }
      }

      // 添加微小的随机波动
      turtleSpeed += (Math.random() - 0.5) * 0.02;
      rabbitSpeed += (Math.random() - 0.5) * 0.02;

      // 🔧 修复：平滑的位置更新
      setTurtlePosition(prev => {
        const newPos = Math.min(prev + turtleSpeed, 100);
        return newPos;
      });
      
      setRabbitPosition(prev => {
        const newPos = Math.min(prev + rabbitSpeed, 100);
        return newPos;
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // 动画结束，确定获胜者
        const finalWinner = turtlePosition > rabbitPosition ? 'turtle' : 'rabbit';
        setWinner(finalWinner);
        setShowWinner(true);
        
        // 通知父组件比赛结束
        if (onRaceEnd) {
          onRaceEnd(finalWinner);
        }
        
        // 2秒后自动关闭
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRacing, turtlePosition, rabbitPosition, onClose, onRaceEnd]);

  return (
    <div className="race-modal-overlay">
      <div className="race-modal-content">
        <h2>🏁 龟兔赛跑进行中 🏁</h2>
        
        <div className="race-arena">
          {/* 乌龟跑道 */}
          <div className="race-track turtle-track">
            <div className="track-label">🐢 乌龟跑道</div>
            <div className="track-line">
              <div 
                className="runner turtle-runner"
                style={{ 
                  left: `${turtlePosition}%`,
                  transition: 'left 0.1s linear'
                }}
              >
                🐢
              </div>
            </div>
          </div>

          {/* 兔子跑道 */}
          <div className="race-track rabbit-track">
            <div className="track-label">🐰 兔子跑道</div>
            <div className="track-line">
              <div 
                className="runner rabbit-runner"
                style={{ 
                  left: `${rabbitPosition}%`,
                  transition: 'left 0.1s linear'
                }}
              >
                🐰
              </div>
            </div>
          </div>
        </div>

        {/* 🔧 修复：简化状态显示，不显示多种模式 */}
        <div className="race-status">
          🏃 比赛进行中...
        </div>

        {/* 显示获胜者 */}
        {showWinner && (
          <div className="winner-display">
            <div className="winner-icon">
              {winner === 'turtle' ? '🐢' : '🐰'}
            </div>
            <div className="winner-text">
              {winner === 'turtle' ? '乌龟' : '兔子'}获胜！
            </div>
            {betChoice === winner && (
              <div className="win-text">🎉 恭喜您猜对了！</div>
            )}
          </div>
        )}

        {/* 进度条 */}
        <div className="race-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${Math.max(turtlePosition, rabbitPosition)}%`,
                transition: 'width 0.1s linear'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaceModal;
