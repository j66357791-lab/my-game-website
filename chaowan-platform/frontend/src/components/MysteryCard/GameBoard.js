// frontend/src/components/MysteryCard/GameBoard.js - 匹配后端逻辑
import React, { useState } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import { useUser } from '../../contexts/UserContext';
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
  const { wsService, placeBet } = useMysteryCard();
  const { user } = useUser();

  const renderCard = (cardValue, position) => {
    // 🔧 修复：匹配后端的卡牌显示逻辑
    if (gameState.currentPhase === 'REVEALING' || gameState.currentPhase === 'SETTLEMENT') {
      return <IconSlot value={cardValue} position={position} />;
    } else {
      return <IconSlot position={position} />;
    }
  };

  const handleBet = (general) => {
    if (gameState.canBet && gameState.currentPhase === 'BETTING') {
      // 🔧 检查用户积分是否足够
      if (user.points < betAmount) {
        alert('积分不足！');
        return;
      }

      console.log(`💰 对${general}下注${betAmount}`);
      const success = placeBet(general, betAmount);
      
      if (!success) {
        alert('下注失败，请检查网络连接');
      }
    } else {
      console.warn('⚠️ 现在不能下注');
    }
  };

  // 🔧 修复：简化操作按钮 - 后端自动控制游戏流程
  const getPhaseActions = () => {
    // 后端自动控制游戏阶段，前端只需要显示状态
    if (gameState.currentPhase === 'BETTING') {
      return (
        <div className="phase-info">
          <p>⏰ 下注时间剩余: {gameState.timeRemaining}秒</p>
        </div>
      );
    } else if (gameState.currentPhase === 'LOCKING') {
      return (
        <div className="phase-info">
          <p>🔒 下注已锁定，即将翻牌...</p>
        </div>
      );
    } else if (gameState.currentPhase === 'REVEALING') {
      return (
        <div className="phase-info">
          <p>👁️ 卡牌揭示中...</p>
        </div>
      );
    } else if (gameState.currentPhase === 'SETTLEMENT') {
      return (
        <div className="phase-info">
          <p>💰 本轮结算完成</p>
        </div>
      );
    }
    
    return null;
  };

  // 连接状态显示
  const ConnectionStatus = () => {
    const status = wsService?.getConnectionStatus() || 'disconnected';
    const getStatusInfo = () => {
      switch (status) {
        case 'connected':
          return { text: '已连接', color: '#4caf50', icon: '🟢' };
        case 'connecting':
          return { text: '连接中...', color: '#ff9800', icon: '🟡' };
        case 'disconnected':
          return { text: '未连接', color: '#f44336', icon: '🔴' };
        case 'error':
          return { text: '连接错误', color: '#f44336', icon: '❌' };
        default:
          return { text: '未知状态', color: '#9e9e9e', icon: '❓' };
      }
    };

    const statusInfo = getStatusInfo();

    return (
      <div 
        className="connection-status"
        style={{ borderColor: statusInfo.color }}
      >
        <span className="status-icon">{statusInfo.icon}</span>
        <span className="status-text">{statusInfo.text}</span>
      </div>
    );
  };

  if (!wsService) {
    return (
      <div className="game-board">
        <div className="connection-status">
          <span className="status-text">正在初始化连接...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="game-board">
      {/* 连接状态显示 */}
      <ConnectionStatus />

      {/* 游戏头部 */}
      <div className="game-header">
        <h1>神秘卡牌对战</h1>
        <CountdownTimer timeRemaining={gameState.timeRemaining} />
        <div className="game-info">
          <span>第{gameState.roundNumber}轮</span>
          <span>{gameState.currentPhase}</span>
          <span>积分: {user.points}</span>
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
              max={Math.min(user.points, 1000)}
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
