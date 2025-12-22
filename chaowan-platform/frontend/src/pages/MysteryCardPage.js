// frontend/src/pages/MysteryCardPage.js - 移除Sidebar
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useMysteryCard } from '../contexts/MysteryCardContext';
import GameBoard from '../components/MysteryCard/GameBoard';
// 移除Sidebar导入
import WebSocketService from '../services/websocketService';
import './MysteryCardPage.css';

const MysteryCardPage = () => {
  const { user, token } = useUser();
  const { gameState, placeBet, startNewRound, lockBets, revealCards, settleRound } = useMysteryCard();
  const [wsService, setWsService] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      const ws = new WebSocketService(token);
      ws.connect();
      setWsService(ws);

      return () => {
        ws.disconnect();
      };
    }
  }, [token]);

  const handleBet = (general, amount) => {
    if (gameState.currentPhase === 'BETTING') {
      placeBet(general, amount);
      if (wsService) {
        wsService.sendMessage({
          type: 'BET',
          payload: { general, amount }
        });
      }
    }
  };

  const handleLockBets = () => {
    if (gameState.currentPhase === 'BETTING') {
      lockBets();
      if (wsService) {
        wsService.sendMessage({ type: 'LOCK_BETS' });
      }
    }
  };

  const handleRevealCards = () => {
    if (gameState.currentPhase === 'LOCKING') {
      revealCards();
      if (wsService) {
        wsService.sendMessage({ type: 'REVEAL_CARDS' });
      }
    }
  };

  const handleSettleRound = () => {
    if (gameState.currentPhase === 'REVEALING') {
      settleRound();
      if (wsService) {
        wsService.sendMessage({ type: 'SETTLE_ROUND' });
      }
    }
  };

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

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
        {/* 移除Sidebar，只保留GameBoard */}
        <GameBoard 
          gameState={gameState} 
          onBet={handleBet}
          onStartNewRound={startNewRound}
          onLockBets={handleLockBets}
          onRevealCards={handleRevealCards}
          onSettleRound={handleSettleRound}
        />
      </div>
    </div>
  );
};

export default MysteryCardPage;
