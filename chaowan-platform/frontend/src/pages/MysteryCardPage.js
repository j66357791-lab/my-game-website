// frontend/src/pages/MysteryCardPage.js - 添加调试信息
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useMysteryCard } from '../contexts/MysteryCardContext';
import GameBoard from '../components/MysteryCard/GameBoard';
import WebSocketService from '../services/websocketService';
import './MysteryCardPage.css';

const MysteryCardPage = () => {
  const { user, token } = useUser();
  const { gameState, setWebSocketService, startGame } = useMysteryCard();
  const [wsService, setWsServiceInstance] = useState(null);
  const navigate = useNavigate();

  // 🔧 添加调试信息
  useEffect(() => {
    console.log('🔍 MysteryCardPage - 用户状态:', { user: !!user, token: !!token });
    console.log('🔍 MysteryCardPage - token值:', token);
    
    if (!user) {
      console.log('🚪 用户未登录，重定向到登录页');
      navigate('/login');
      return;
    }

    if (!token) {
      console.error('❌ 没有找到token，无法连接游戏');
      console.log('🔍 localStorage中的token:', localStorage.getItem('token'));
      // 不要直接重定向，给用户一个提示
      return;
    }

    // 创建WebSocket连接
    console.log('🔗 创建WebSocket连接，token:', token.substring(0, 10) + '...');
    const ws = new WebSocketService(token);
    setWsServiceInstance(ws);
    setWebSocketService(ws);
    
    // 连接WebSocket
    ws.connect();

    // 页面卸载时断开连接
    return () => {
      console.log('🔌 断开WebSocket连接');
      ws.disconnect();
    };
  }, [user, token, navigate, setWebSocketService]);

  // 尝试自动开始游戏
  useEffect(() => {
    if (wsService && wsService.isConnected() && !gameState.isGameActive) {
      console.log('🎮 尝试开始游戏...');
      setTimeout(() => {
        startGame();
      }, 1000);
    }
  }, [wsService, gameState.isGameActive, startGame]);

  // 游戏操作处理函数
  const handleBet = (general, amount) => {
    console.log('💰 下注:', general, amount);
  };

  const handleLockBets = () => {
    console.log('🔒 锁定下注');
  };

  const handleRevealCards = () => {
    console.log('👁️ 揭示卡牌');
  };

  const handleSettleRound = () => {
    console.log('💰 结算本轮');
  };

  const handleStartNewRound = () => {
    console.log('🔄 开始新轮次');
  };

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在验证用户身份...</p>
      </div>
    );
  }

  // 🔧 处理没有token的情况
  if (!token) {
    return (
      <div className="loading-container">
        <div className="error-message">
          <h3>❌ 连接游戏失败</h3>
          <p>没有找到有效的登录凭证</p>
          <p>请重新登录后再试</p>
          <button onClick={() => navigate('/login')} className="retry-button">
            重新登录
          </button>
        </div>
      </div>
    );
  }

  if (!gameState.isConnected) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在连接游戏服务器...</p>
      </div>
    );
  }

  return (
    <div className="mystery-card-page">
      <div className="game-container">
        <GameBoard 
          gameState={gameState} 
          onBet={handleBet}
          onStartNewRound={handleStartNewRound}
          onLockBets={handleLockBets}
          onRevealCards={handleRevealCards}
          onSettleRound={handleSettleRound}
        />
      </div>
    </div>
  );
};

export default MysteryCardPage;
