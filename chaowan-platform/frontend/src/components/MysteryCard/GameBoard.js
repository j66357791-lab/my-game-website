// frontend/src/components/MysteryCard/GameBoard.js - 添加帮助按钮
import React, { useState } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import BetButton from './BetButton';
import CountdownTimer from './CountdownTimer';
import IconSlot from './IconSlot';
import ProgressBar from './ProgressBar';
import ResultModal from './ResultModal';
import HelpModal from './HelpModal'; // 导入帮助弹窗
import './GameBoard.css';

const GameBoard = ({ gameState, onBet, onStartNewRound, onLockBets, onRevealCards, onSettleRound }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [showHelp, setShowHelp] = useState(false); // 帮助弹窗状态

  const renderCard = (cardValue, position) => {
    if (gameState.currentPhase === 'REVEALING' || gameState.currentPhase === 'SETTLEMENT') {
      return <IconSlot value={cardValue} position={position} />;
    } else {
      return <IconSlot position={position} />;
    }
  };

  const handleBet = (general) => {
    if (gameState.currentPhase === 'BETTING') {
      onBet(general, betAmount);
    }
  };

  const getPhaseActions = () => {
    switch (gameState.currentPhase) {
      case 'BETTING':
        return (
          <button onClick={onLockBets} className="phase-button">
            锁定下注
          </button>
        );
      case 'LOCKING':
        return (
          <button onClick={onRevealCards} className="phase-button">
            揭示卡牌
          </button>
        );
      case 'REVEALING':
        return (
          <button onClick={onSettleRound} className="phase-button">
            结算本轮
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="game-board">
      {/* 顶部状态栏 */}
      <div className="game-header">
        <h1>神秘卡牌对战</h1>
        <CountdownTimer timeRemaining={gameState.timeRemaining} />
        <div className="game-info">
          <span>第{gameState.roundNumber}轮</span>
          <span>{gameState.currentPhase}</span>
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
              {gameState.currentPhase === 'BETTING' && (
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
      {(gameState.currentPhase === 'SETTLEMENT') && (
        <ResultModal 
          gameState={gameState}
          onStartNewRound={onStartNewRound}
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
