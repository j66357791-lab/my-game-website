// frontend/src/pages/MysteryCardPage.js - 修复重复连接
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useMysteryCard } from '../contexts/MysteryCardContext';
import GameBoard from '../components/MysteryCard/GameBoard';
import WebSocketService from '../services/websocketService';
import './MysteryCardPage.css';

const MysteryCardPage = ({ user, onUpdateUser, globalPoints, globalCash, globalDolls, syncUserData }) => {
  const { token } = useUser();
  const { gameState, setWebSocketService } = useMysteryCard();
  const navigate = useNavigate();
  const wsRef = useRef(null); // 🔧 关键：使用ref防止重复创建
  const isInitialized = useRef(false); // 🔧 防止重复初始化

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!token) {
      console.error('❌ 没有找到token，无法连接游戏');
      return;
    }

    // 🔧 关键修复：防止重复初始化
    if (isInitialized.current) {
      console.log('⚠️ WebSocket已初始化，跳过重复创建');
      return;
    }

    console.log('🔗 创建WebSocket连接');
    const ws = new WebSocketService(token);
    wsRef.current = ws;
    isInitialized.current = true;
    
    // 连接WebSocket
    ws.connect();
    setWebSocketService(ws);

    // 🔧 关键修复：正确的清理函数
    return () => {
      console.log('🔌 清理WebSocket连接');
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      isInitialized.current = false;
      setWebSocketService(null);
    };
  }, [user, token, navigate, setWebSocketService]); // 🔧 移除不必要的依赖

  // 保留原有的处理函数
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
