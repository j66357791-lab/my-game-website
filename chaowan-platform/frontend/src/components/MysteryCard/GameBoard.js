// frontend/src/components/MysteryCard/GameBoard.js - 真实的游戏交互
import React, { useState } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import BetButton from './BetButton';
import CountdownTimer from './CountdownTimer';
import IconSlot from './IconSlot';
import ProgressBar from './ProgressBar';
import ResultModal from './ResultModal';
import HelpModal from './HelpModal';
import './GameBoard.css';

const GameBoard = ({ gameState, onBet, onStartNewRound, onLockBets, onRevealCards, onSettleRound }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [showHelp, setShowHelp] = useState(false);
  const { placeBet, lockBets, revealCards, startNewRound } = useMysteryCard();

  const renderCard = (cardValue, position) => {
    if (gameState.currentPhase === 'REVEALING' || gameState.currentPhase === 'SETTLEMENT') {
      return <IconSlot value={cardValue} position={position} />;
    } else {
      return <IconSlot position={position} />;
    }
  };

  const handleBet = (general) => {
    if (gameState.canBet && gameState.currentPhase === 'BETTING') {
      console.log(`💰 对${general}下注${betAmount}`);
      placeBet(general, betAmount);
    } else {
      console.warn('⚠️ 现在不能下注');
    }
  };

  const handleLockBets = () => {
    if (gameState.currentPhase === 'BETTING') {
      console.log('🔒 锁定下注');
      lockBets();
    }
  };

  const handleRevealCards = () => {
    if (gameState.currentPhase === 'LOCKING') {
      console.log('👁️ 揭示卡牌');
      revealCards();
    }
  };

  const handleStartNewRound = () => {
    if (gameState.currentPhase === 'SETTLEMENT') {
      console.log('🔄 开始新轮次');
      startNewRound();
    }
  };

  const getPhaseActions = () => {
    switch (gameState.currentPhase) {
      case 'BETTING':
        return (
          <button 
            onClick={handleLockBets} 
            className="phase-button"
            disabled={!gameState.canBet}
          >
            锁定下注
          </button>
        );
      case 'LOCKING':
        return (
          <button onClick={handleRevealCards} className="phase-button">
            揭示卡牌
          </button>
        );
      case 'SETTLEMENT':
        return (
          <button onClick={handleStartNewRound} className="phase-button">
            开始新轮次
          </button>
        );
      default:
        return null;
    }
  };

  // 显示连接状态
  if (!gameState.isConnected) {
    return (
      <div className="game-board">
        <div className="connection-status">
          <div className="loading-spinner"></div>
          <p>正在连接游戏服务器...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-board">
      {/* 连接状态指示器 */}
      <div className={`connection-indicator ${gameState.isConnected ? 'connected' : 'disconnected'}`}>
        {gameState.isConnected ? '🟢 已连接' : '🔴 未连接'}
      </div>

      {/* 游戏头部 */}
      <div className="game-header">
        <h1>神秘卡牌对战</h1>
        <CountdownTimer timeRemaining={gameState.timeRemaining} />
        <div className="game-info">
          <span>第{gameState.roundNumber}轮</span>
          <span>{gameState.currentPhase}</span>
          {gameState.error && (
            <span className="error-message">{gameState.error}</span>
          )}
        </div>
      </div>

      {/* 游戏主区域 */}
      <div className="game-main">
        {/* 领主卡牌 */}
        <div className="lord-card-area">
          <div className="card-label">领主卡牌</div>
          {renderCard(gameState.lordCard, 'lord')}
        </div>

        {/* 战将卡牌区域 */}
        <div className="generals-area">
          {['east', 'south', 'west', 'north'].map(position => (
            <div key={position} className="general-card" data-position={
              position === 'east' ? '东' : 
              position === 'south' ? '南' : 
              position === 'west' ? '西' : '北'
            }>
              {renderCard(gameState.generalsCards[position], position)}
              {gameState.canBet && gameState.currentPhase === 'BETTING' && (
                <BetButton 
                  position={position}
                  amount={betAmount}
                  onBet={() => handleBet(position)}
                />
              )}
            </div>
          ))}
        </div>

        {/* 下注面板 */}
        <div className="bet-panel">
          <div className="bet-amount">
            <label>下注金额:</label>
            <input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min="1"
              max="1000"
              disabled={!gameState.canBet}
            />
          </div>
          <ProgressBar totalBets={gameState.totalBets} />
        </div>

        {/* 阶段操作按钮 */}
        <div className="phase-actions">
          {getPhaseActions()}
        </div>
      </div>

      {/* 结果弹窗 */}
      {(gameState.currentPhase === 'SETTLEMENT' && gameState.results) && (
        <ResultModal 
          gameState={gameState}
          onStartNewRound={handleStartNewRound}
        />
      )}

      {/* 帮助按钮 */}
      <button 
        className="help-button" 
        onClick={() => setShowHelp(true)}
        title="游戏帮助"
      >
        ?
      </button>

      {/* 帮助弹窗 */}
      <HelpModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        gameState={gameState}
      />
    </div>
  );
};

export default GameBoard;
