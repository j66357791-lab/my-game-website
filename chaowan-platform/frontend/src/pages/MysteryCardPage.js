// frontend/src/pages/MysteryCardPage.js - 保留你原有props结构
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useMysteryCard } from '../contexts/MysteryCardContext';
import GameBoard from '../components/MysteryCard/GameBoard';
import WebSocketService from '../services/websocketService';
import './MysteryCardPage.css';

const MysteryCardPage = ({ user, onUpdateUser, globalPoints, globalCash, globalDolls, syncUserData }) => {
  const { token } = useUser(); // 🔧 只从UserContext获取token
  const { gameState, setWebSocketService } = useMysteryCard();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!token) {
      console.error('❌ 没有找到token，无法连接游戏');
      return;
    }

    // 创建WebSocket连接
    console.log('🔗 创建WebSocket连接');
    const ws = new WebSocketService(token);
    setWebSocketService(ws);
    
    // 连接WebSocket
    ws.connect();

    // 页面卸载时断开连接
    return () => {
      console.log('🔌 断开WebSocket连接');
      ws.disconnect();
    };
  }, [user, token, navigate, setWebSocketService]);

  // 保留你原有的处理函数
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
