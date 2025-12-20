// frontend/src/components/RaceModal/RaceModal.js - 改进版本
import React, { useState, useEffect } from 'react';
import './RaceModal.css';

const RaceModal = ({ 
  turtleSpeed, 
  rabbitSpeed, 
  onClose, 
  raceResult,
  betChoice,
  isRacing 
}) => {
  const [turtlePosition, setTurtlePosition] = useState(0);
  const [rabbitPosition, setRabbitPosition] = useState(0);
  const [racePhase, setRacePhase] = useState('starting'); // starting, middle, finishing, finished
  const [showWinner, setShowWinner] = useState(false);

  useEffect(() => {
    if (!isRacing) {
      setTurtlePosition(0);
      setRabbitPosition(0);
      setRacePhase('starting');
      setShowWinner(false);
      return;
    }

    let startTime = Date.now();
    let animationFrame;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / 8000; // 8秒总时长

      // 计算当前阶段
      if (elapsed < 2000) {
        setRacePhase('starting');
      } else if (elapsed < 6000) {
        setRacePhase('middle');
      } else if (elapsed < 8000) {
        setRacePhase('finishing');
      } else {
        setRacePhase('finished');
      }

      // 基础速度
      let turtleBaseSpeed = 0.35;
      let rabbitBaseSpeed = 0.4;

      // 2-4秒随机加速阶段
      if (elapsed >= 2000 && elapsed < 4000) {
        if (Math.random() < 0.5) {
          turtleBaseSpeed *= 2.5; // 乌龟加速
        } else {
          rabbitBaseSpeed *= 2.5; // 兔子加速
        }
      }

      // 6-8秒可能减速
      if (elapsed >= 6000 && elapsed < 8000) {
        if (Math.random() < 0.5) {
          const slowDownFactor = 0.3 + Math.random() * 0.3;
          if (Math.random() < 0.5) {
            turtleBaseSpeed *= slowDownFactor;
          } else {
            rabbitBaseSpeed *= slowDownFactor;
          }
        }
      }

      // 添加随机波动
      const turtleRandom = 0.8 + Math.random() * 0.4;
      const rabbitRandom = 0.8 + Math.random() * 0.4;

      // 计算新位置
      const newTurtlePos = Math.min(turtlePosition + turtleBaseSpeed * turtleRandom, 100);
      const newRabbitPos = Math.min(rabbitPosition + rabbitBaseSpeed * rabbitRandom, 100);

      setTurtlePosition(newTurtlePos);
      setRabbitPosition(newRabbitPos);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // 动画结束
        setShowWinner(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRacing, turtlePosition, rabbitPosition, onClose]);

  const getWinner = () => {
    if (raceResult) {
      return raceResult.winner;
    }
    return turtlePosition > rabbitPosition ? 'turtle' : 'rabbit';
  };

  const winner = getWinner();

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
                style={{ left: `${turtlePosition}%` }}
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
                style={{ left: `${rabbitPosition}%` }}
              >
                🐰
              </div>
            </div>
          </div>
        </div>

        {/* 比赛状态 */}
        <div className="race-status">
          {racePhase === 'starting' && '🚀 起跑阶段！'}
          {racePhase === 'middle' && '⚡ 中途加速！'}
          {racePhase === 'finishing' && '🏁 冲刺阶段！'}
          {racePhase === 'finished' && '🎉 比赛结束！'}
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
              style={{ width: `${Math.max(turtlePosition, rabbitPosition)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaceModal;
