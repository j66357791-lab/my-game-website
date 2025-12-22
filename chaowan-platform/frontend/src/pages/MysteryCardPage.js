// frontend/src/pages/MysteryCardPage.js - 真正的游戏连接
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

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!token) {
      console.error('❌ 没有找到token，无法连接游戏');
      navigate('/login');
      return;
    }

    // 创建WebSocket连接
    const ws = new WebSocketService(token);
    setWsServiceInstance(ws);
    setWebSocketService(ws); // 设置到Context中
    
    // 连接WebSocket
    ws.connect();

    // 页面卸载时断开连接
    return () => {
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
    // 下注逻辑由Context处理
  };

  const handleLockBets = () => {
    console.log('🔒 锁定下注');
    // 锁定逻辑由Context处理
  };

  const handleRevealCards = () => {
    console.log('👁️ 揭示卡牌');
    // 揭示逻辑由Context处理
  };

  const handleSettleRound = () => {
    console.log('💰 结算本轮');
    // 结算逻辑由Context处理
  };

  const handleStartNewRound = () => {
    console.log('🔄 开始新轮次');
    // 新轮次逻辑由Context处理
  };

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在验证用户身份...</p>
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
