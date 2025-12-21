// components/RaceModal/RaceModal.js - 专门负责动画的完整版本
import React, { useState, useEffect, useRef } from 'react';
import './RaceModal.css';

const RaceModal = ({ 
  isOpen, 
  onClose, 
  betChoice, 
  betAmount, 
  betType,
  onRaceComplete 
}) => {
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isRacing, setIsRacing] = useState(false);
  const [raceResult, setRaceResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  
  const turtleRef = useRef(null);
  const rabbitRef = useRef(null);

  // 开始游戏流程
  useEffect(() => {
    if (isOpen) {
      startGameFlow();
    }
  }, [isOpen]);

  const startGameFlow = () => {
    setShowCountdown(true);
    setCountdown(3);
    setShowResult(false);
    setRaceResult(null);

    // 3秒倒计时
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          setTimeout(() => {
            startRace();
          }, 500);
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRace = async () => {
    setIsRacing(true);
    
    try {
      // 调用后端API
      const response = await fetch('https://tianchuang.onrender.com/api/race/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          betType,
          betAmount,
          betChoice
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRaceResult(data.data);
        
        // 根据结果设置动画
        setTimeout(() => {
          setupAnimation(data.data.winner);
        }, 100);
        
        // 5秒后显示结果
        setTimeout(() => {
          setShowResult(true);
          setIsRacing(false);
          onRaceComplete && onRaceComplete(data.data);
        }, 5000);
        
      } else {
        throw new Error(data.message || '游戏失败');
      }
    } catch (error) {
      console.error('游戏错误:', error);
      alert('游戏失败: ' + error.message);
      setIsRacing(false);
      onClose();
    }
  };

  const setupAnimation = (winner) => {
    const turtle = turtleRef.current;
    const rabbit = rabbitRef.current;
    
    if (!turtle || !rabbit) return;
    
    // 重置位置
    turtle.style.transition = 'none';
    rabbit.style.transition = 'none';
    turtle.style.left = '10px';
    rabbit.style.left = '10px';
    
    // 强制重排
    void turtle.offsetWidth;
    void rabbit.offsetWidth;
    
    // 设置动画
    turtle.style.transition = 'left 5s ease-in-out';
    rabbit.style.transition = 'left 5s ease-in-out';
    
    // 根据胜者调整速度
    if (winner === 'turtle') {
      // 乌龟获胜 - 乌龟稍快一些
      setTimeout(() => {
        turtle.style.left = 'calc(100% - 50px)';
        rabbit.style.left = 'calc(100% - 80px)';
      }, 100);
    } else {
      // 兔子获胜 - 兔子稍快一些
      setTimeout(() => {
        turtle.style.left = 'calc(100% - 80px)';
        rabbit.style.left = 'calc(100% - 50px)';
      }, 100);
    }
  };

  const handleClose = () => {
    if (showResult) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="race-modal-overlay">
      <div className="race-modal-content">
        {/* 倒计时 */}
        {showCountdown && (
          <div className="countdown-container">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}

        {/* 赛跑动画区域 */}
        <div className="race-track-container">
          <div className="race-info">
            <span>您选择: {betChoice === 'turtle' ? '🐢 乌龟' : '🐰 兔子'}</span>
            <span>投注: {betAmount} {betType === 'points' ? '积分' : '星源币'}</span>
          </div>
          
          <div className="race-track">
            {/* 乌龟跑道 */}
            <div className="track-line turtle-track">
              <div className="track-label">🐢</div>
              <div className="track-road">
                <div 
                  ref={turtleRef}
                  className="runner turtle-runner"
                >
                  🐢
                </div>
              </div>
            </div>
            
            {/* 兔子跑道 */}
            <div className="track-line rabbit-track">
              <div className="track-label">🐰</div>
              <div className="track-road">
                <div 
                  ref={rabbitRef}
                  className="runner rabbit-runner"
                >
                  🐰
                </div>
              </div>
            </div>
          </div>

          {/* 起跑线 */}
          <div className="start-line"></div>
          {/* 终点线 */}
          <div className="finish-line"></div>
        </div>

        {/* 结果显示 */}
        {showResult && raceResult && (
          <div className="race-result">
            <h3>
              {raceResult.result === 'win' ? '🎉 恭喜获胜！' : '😔 很遗憾'}
            </h3>
            <p>
              {raceResult.winner === 'turtle' ? '🐢 乌龟' : '🐰 兔子'}获得胜利
            </p>
            {raceResult.result === 'win' ? (
              <p className="win-text">
                获得 {raceResult.rewardAmount} {betType === 'points' ? '积分' : '星源币'}
              </p>
            ) : (
              <p className="lose-text">
                很抱歉您这把没有获得奖励
              </p>
            )}
            <button className="close-btn" onClick={handleClose}>
              确定
            </button>
          </div>
        )}

        {/* 比赛进行中提示 */}
        {isRacing && !showResult && (
          <div className="racing-indicator">
            🏁 比赛进行中...
          </div>
        )}
      </div>
    </div>
  );
};

export default RaceModal;
