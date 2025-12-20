// frontend/src/components/RaceModal/RaceModal.js - 修复版本
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
  const [racePhase, setRacePhase] = useState('starting');
  const [showWinner, setShowWinner] = useState(false);
  const [winner, setWinner] = useState(null);
  
  const animationRef = useRef(null);
  const startTimeRef = useRef(0);
  const turtleSpeedRef = useRef(0.35);
  const rabbitSpeedRef = useRef(0.4);

  useEffect(() => {
    if (!isRacing) {
      // 重置状态
      setTurtlePosition(0);
      setRabbitPosition(0);
      setRacePhase('starting');
      setShowWinner(false);
      setWinner(null);
      turtleSpeedRef.current = 0.35;
      rabbitSpeedRef.current = 0.4;
      return;
    }

    startTimeRef.current = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = elapsed / 8000; // 8秒总时长

      // 更新阶段
      if (elapsed < 2000) {
        setRacePhase('starting');
      } else if (elapsed < 4000) {
        setRacePhase('middle-accelerate');
      } else if (elapsed < 6000) {
        setRacePhase('middle-normal');
      } else if (elapsed < 8000) {
        setRacePhase('finishing');
      }

      // 🔧 修复：平滑的速度变化逻辑
      let turtleSpeed = turtleSpeedRef.current;
      let rabbitSpeed = rabbitSpeedRef.current;

      // 2-4秒：随机加速（平滑过渡）
      if (elapsed >= 2000 && elapsed < 4000) {
        const accelerateProgress = (elapsed - 2000) / 2000; // 0到1的进度
        if (Math.random() < 0.01) { // 降低随机频率
          if (Math.random() < 0.5) {
            // 乌龟加速
            const targetSpeed = 0.35 * 2.5;
            turtleSpeed = turtleSpeed + (targetSpeed - turtleSpeed) * accelerateProgress * 0.02;
          } else {
            // 兔子加速
            const targetSpeed = 0.4 * 2.5;
            rabbitSpeed = rabbitSpeed + (targetSpeed - rabbitSpeed) * accelerateProgress * 0.02;
          }
        }
      }

      // 6-8秒：可能减速（平滑过渡）
      if (elapsed >= 6000 && elapsed < 8000) {
        const decelerateProgress = (elapsed - 6000) / 2000; // 0到1的进度
        if (Math.random() < 0.01) { // 降低随机频率
          if (Math.random() < 0.5) {
            // 乌龟减速
            const targetSpeed = 0.35 * 0.3;
            turtleSpeed = turtleSpeed + (targetSpeed - turtleSpeed) * decelerateProgress * 0.02;
          } else {
            // 兔子减速
            const targetSpeed = 0.4 * 0.3;
            rabbitSpeed = rabbitSpeed + (targetSpeed - rabbitSpeed) * decelerateProgress * 0.02;
          }
        }
      }

      // 添加微小的随机波动
      turtleSpeed += (Math.random() - 0.5) * 0.01;
      rabbitSpeed += (Math.random() - 0.5) * 0.01;

      // 确保速度在合理范围内
      turtleSpeed = Math.max(0.1, Math.min(turtleSpeed, 1.0));
      rabbitSpeed = Math.max(0.1, Math.min(rabbitSpeed, 1.0));

      // 更新速度引用
      turtleSpeedRef.current = turtleSpeed;
      rabbitSpeedRef.current = rabbitSpeed;

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
                  transition: 'left 0.1s linear' // 🔧 添加平滑过渡
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
                  transition: 'left 0.1s linear' // 🔧 添加平滑过渡
                }}
              >
                🐰
              </div>
            </div>
          </div>
        </div>

        {/* 比赛状态 */}
        <div className="race-status">
          {racePhase === 'starting' && '🚀 起跑阶段！'}
          {racePhase === 'middle-accelerate' && '⚡ 中途加速！'}
          {racePhase === 'middle-normal' && '🏃 稳定前进！'}
          {racePhase === 'finishing' && '🏁 冲刺阶段！'}
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
                transition: 'width 0.1s linear' // 🔧 添加平滑过渡
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaceModal;
