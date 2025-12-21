import React, { useState, useEffect, useRef } from 'react';
import './RaceModal.css';

const RaceModal = ({ 
  onClose, 
  betChoice,
  isRacing,
  onRaceEnd,
  raceResult
}) => {
  const [turtlePosition, setTurtlePosition] = useState(0);
  const [rabbitPosition, setRabbitPosition] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [winner, setWinner] = useState(null);
  const [raceProgress, setRaceProgress] = useState(0);
  
  const animationRef = useRef(null);
  const startTimeRef = useRef(0);
  const trackLength = 1000;

  useEffect(() => {
    if (!isRacing) {
      setTurtlePosition(0);
      setRabbitPosition(0);
      setShowWinner(false);
      setWinner(null);
      setRaceProgress(0);
      return;
    }

    if (raceResult) {
      setWinner(raceResult.winner);
    }

    startTimeRef.current = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / 12000, 1);
      setRaceProgress(progress);

      let turtleSpeed = 0.4 + Math.random() * 0.3;
      let rabbitSpeed = 0.45 + Math.random() * 0.3;

      if (raceResult) {
        const targetWinner = raceResult.winner;
        
        if (progress < 0.3) {
          if (Math.random() < 0.5) {
            turtleSpeed *= 1.2;
          } else {
            rabbitSpeed *= 1.2;
          }
        } else if (progress < 0.7) {
          if (Math.random() < 0.3) {
            if (targetWinner === 'turtle') {
              turtleSpeed *= 1.5;
              rabbitSpeed *= 0.8;
            } else {
              turtleSpeed *= 0.8;
              rabbitSpeed *= 1.5;
            }
          }
        } else {
          if (targetWinner === 'turtle') {
            const currentTurtlePos = (turtlePosition / trackLength) * 100;
            const currentRabbitPos = (rabbitPosition / trackLength) * 100;
            
            if (currentTurtlePos <= currentRabbitPos) {
              turtleSpeed *= 2.0;
              rabbitSpeed *= 0.5;
            }
          } else {
            const currentTurtlePos = (turtlePosition / trackLength) * 100;
            const currentRabbitPos = (rabbitPosition / trackLength) * 100;
            
            if (currentRabbitPos <= currentTurtlePos) {
              turtleSpeed *= 0.5;
              rabbitSpeed *= 2.0;
            }
          }
        }
      } else {
        if (elapsed > 4000 && elapsed < 8000) {
          if (Math.random() < 0.02) {
            if (Math.random() < 0.5) {
              turtleSpeed *= 1.8;
            } else {
              rabbitSpeed *= 1.8;
            }
          }
        }
      }

      turtleSpeed += (Math.random() - 0.5) * 0.03;
      rabbitSpeed += (Math.random() - 0.5) * 0.03;

      setTurtlePosition(prev => {
        const newPos = Math.min(prev + turtleSpeed, trackLength);
        return newPos;
      });
      
      setRabbitPosition(prev => {
        const newPos = Math.min(prev + rabbitSpeed, trackLength);
        return newPos;
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        const finalWinner = raceResult ? raceResult.winner : (turtlePosition > rabbitPosition ? 'turtle' : 'rabbit');
        setWinner(finalWinner);
        setShowWinner(true);
        
        if (onRaceEnd) {
          onRaceEnd(finalWinner, raceResult);
        }
        
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
  }, [isRacing, turtlePosition, rabbitPosition, onClose, onRaceEnd, raceResult]);

  const turtleVisualPosition = (turtlePosition / trackLength) * 100;
  const rabbitVisualPosition = (rabbitPosition / trackLength) * 100;

  return (
    <div className="race-modal-overlay">
      <div className="race-modal-content">
        <h2>🏁 龟兔赛跑进行中 🏁</h2>
        
        <div className="race-progress-info">
          <span>比赛进度: {Math.round(raceProgress * 100)}%</span>
        </div>
        
        <div className="race-arena">
          <div className="race-track turtle-track">
            <div className="track-label">🐢 乌龟跑道</div>
            <div className="track-line">
              <div 
                className="runner turtle-runner"
                style={{ 
                  left: `${turtleVisualPosition}%`,
                  transition: 'left 0.1s linear'
                }}
              >
                🐢
              </div>
            </div>
          </div>

          <div className="race-track rabbit-track">
            <div className="track-label">🐰 兔子跑道</div>
            <div className="track-line">
              <div 
                className="runner rabbit-runner"
                style={{ 
                  left: `${rabbitVisualPosition}%`,
                  transition: 'left 0.1s linear'
                }}
              >
                🐰
              </div>
            </div>
          </div>
        </div>

        <div className="race-status">
          🏃 比赛进行中...
        </div>

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

        <div className="race-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${raceProgress * 100}%`,
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
