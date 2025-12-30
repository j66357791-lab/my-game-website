// components/RaceModal/RaceModal.js - 完整版本
import React, { useState, useEffect, useRef } from 'react';
import api from '../../config/api';
import './RaceModal.css';

const RaceModal = ({ 
  isOpen, 
  onClose, 
  betChoice, 
  betAmount, 
  betType,
  onRaceComplete,
  onCountdown 
}) => {
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isRacing, setIsRacing] = useState(false);
  const [raceResult, setRaceResult] = useState(null);
  
  const turtleRef = useRef(null);
  const rabbitRef = useRef(null);

  // 开始游戏流程
  useEffect(() => {
    if (isOpen) {
      startGameFlow();
    }
  }, [isOpen]);

  const startGameFlow = () => {
    console.log('🎮 开始游戏流程');
    setShowCountdown(true);
    setCountdown(3);
    setRaceResult(null);
    setIsRacing(false);

    // 触发倒计时音效
    onCountdown && onCountdown();

    // 3秒倒计时
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        console.log('⏰ 倒计时:', prev);
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          // 倒计时结束后直接开始赛跑
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
    console.log('🏁 开始赛跑');
    setIsRacing(true);
    
    try {
      // 调用后端API
      const response = await api.post('/race/start', {
        betType,
        betAmount,
        betChoice
      });
      
      if (response.success) {
        const result = response.data;
        console.log('🏁 后端返回结果:', result);
        
        setRaceResult(result);
        
        // 立即设置动画
        setTimeout(() => {
          setupAnimation(result.winner);
        }, 100);
        
        // 5秒后完成游戏
        setTimeout(() => {
          setIsRacing(false);
          console.log('🏁 游戏完成，调用回调');
          onRaceComplete && onRaceComplete(result);
        }, 5000);
        
      } else {
        throw new Error(response.message || '游戏失败');
      }
    } catch (error) {
      console.error('❌ 游戏错误:', error);
      alert('游戏失败: ' + error.message);
      setIsRacing(false);
      onClose();
    }
  };

  const setupAnimation = (winner) => {
    const turtle = turtleRef.current;
    const rabbit = rabbitRef.current;
    
    if (!turtle || !rabbit) {
      console.error('❌ 跑者元素不存在');
      return;
    }
    
    console.log('🎬 设置动画，胜者:', winner);
    
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
    
    // 根据胜者调整速度和最终位置
    if (winner === 'turtle') {
      // 乌龟获胜 - 乌龟稍快一些，先到达终点
      setTimeout(() => {
        turtle.style.left = 'calc(100% - 50px)';
        rabbit.style.left = 'calc(100% - 80px)';
        console.log('🐢 乌龟获胜动画开始');
      }, 100);
    } else {
      // 兔子获胜 - 兔子稍快一些，先到达终点
      setTimeout(() => {
        turtle.style.left = 'calc(100% - 80px)';
        rabbit.style.left = 'calc(100% - 50px)';
        console.log('🐰 兔子获胜动画开始');
      }, 100);
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 清理动画状态
      if (turtleRef.current) {
        turtleRef.current.style.transition = 'none';
      }
      if (rabbitRef.current) {
        rabbitRef.current.style.transition = 'none';
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="race-modal-overlay">
      <div className="race-modal-content">
        {/* 倒计时遮罩 */}
        {showCountdown && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}

        {/* 赛跑动画区域 */}
        <div className="race-track-container">
          {/* 游戏信息显示 */}
          <div className="race-info">
            <span>您选择: {betChoice === 'turtle' ? '🐢 乌龟' : '🐰 兔子'}</span>
            <span>投注: {betAmount} {betType === 'points' ? '积分' : '星源币'}</span>
          </div>
          
          {/* 赛道区域 */}
          <div className="race-track">
            {/* 乌龟跑道 - 上跑道 */}
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
            
            {/* 兔子跑道 - 下跑道 */}
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

          {/* 比赛进行中提示 */}
          {isRacing && (
            <div className="racing-indicator">
              🏁 比赛进行中...
            </div>
          )}

          {/* 调试信息 - 开发时使用 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="debug-info">
              <small>
                倒计时: {showCountdown ? countdown : '结束'} | 
                比赛中: {isRacing ? '是' : '否'} | 
                结果: {raceResult ? raceResult.winner : '等待中'}
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaceModal;
