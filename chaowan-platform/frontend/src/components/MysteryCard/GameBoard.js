// frontend/src/components/MysteryCard/GameBoard.js
import React, { useState, useEffect } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import { useUser } from '../../contexts/UserContext';
import BetButton from './BetButton';
import CountdownTimer from './CountdownTimer';
import ProgressBar from './ProgressBar';
import ResultModal from './ResultModal';
import HelpModal from './HelpModal';
import './GameBoard.css';

const GameBoard = ({ gameState }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [showHelp, setShowHelp] = useState(false);
  const { wsService } = useMysteryCard();
  const { user } = useUser();

  // 计算最大可投注额 (总积分的10%)
  const maxBetLimit = user.points ? Math.floor(user.points * 0.1) : 0;

  // 如果游戏状态为空，显示等待
  if (!gameState || !gameState.currentPhase) {
    return (
      <div className="game-board">
        <div className="connection-status">
          <span className="status-text">等待游戏数据...</span>
        </div>
      </div>
    );
  }

  // 渲染单个卡牌
  // 根据 revealStep 控制是否显示：east(1), south(2), west(3), north(4), lord(5)
  const renderCard = (cardValue, position) => {
    const isRevealed = (() => {
      if (gameState.currentPhase === 'SETTLEMENT') return true; // 结算阶段全显示
      
      if (gameState.currentPhase === 'REVEALING') {
        if (position === 'lord' && gameState.revealStep >= 5) return true;
        if (position === 'east' && gameState.revealStep >= 1) return true;
        if (position === 'south' && gameState.revealStep >= 2) return true;
        if (position === 'west' && gameState.revealStep >= 3) return true;
        if (position === 'north' && gameState.revealStep >= 4) return true;
      }
      return false;
    })();

    // 这里使用 IconSlot 组件，如果没有该组件可自行替换为 div
    // 假设 IconSlot 接收 value (点数) 和 position (位置)
    return (
      <div className={`card-slot ${isRevealed ? 'revealed' : 'hidden'}`}>
        {isRevealed ? (
          <div className="card-face">{cardValue}</div> // 替换为你的 IconSlot 组件
        ) : (
          <div className="card-back">?</div>
        )}
      </div>
    );
  };

  const handleBet = (general) => {
    if (gameState.currentPhase !== 'BETTING') {
      alert('当前不在下注阶段');
      return;
    }

    // 前端快速校验
    if (!user.points || user.points < betAmount) {
      alert('积分不足！');
      return;
    }

    if (betAmount > maxBetLimit) {
      alert(`下注失败：单次下注不能超过总积分的10% (最大可投 ${maxBetLimit})`);
      return;
    }

    console.log(`💰 对${general}下注${betAmount}`);
    if (wsService) {
      wsService.placeBet(general, betAmount);
    } else {
      alert('网络连接中断，请刷新页面');
    }
  };

  return (
    <div className="game-board">
      {/* 游戏头部 */}
      <div className="game-header">
        <h1>神秘卡牌对战</h1>
        <CountdownTimer timeRemaining={gameState.timeRemaining} />
        <div className="game-info">
          <span>第{gameState.roundNumber}轮</span>
          <span className="phase-tag">{gameState.currentPhase}</span>
          <span className="balance-tag">积分: {user.points}</span>
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
          {['east', 'south', 'west', 'north'].map(position => {
            // 获取该位置的总下注额
            const totalPosBet = gameState.totalBetsByPosition?.[position] || 0;
            
            return (
              <div key={position} className="general-card" data-position={
                position === 'east' ? '东' : 
                position === 'south' ? '南' : 
                position === 'west' ? '西' : '北'
              }>
                {/* 卡牌显示 */}
                {renderCard(gameState.generalsCards[position], position)}
                
                {/* 【优化点4】实时显示该位置总投注金额 */}
                <div className="total-bets-display">
                  总池: {totalPosBet}
                </div>

                {/* 下注按钮 */}
                {gameState.currentPhase === 'BETTING' && (
                  <BetButton 
                    position={position}
                    amount={betAmount}
                    onBet={() => handleBet(position)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 下注面板 */}
        <div className="bet-panel">
          <div className="bet-controls">
            <div className="bet-amount-control">
              <label>下注金额:</label>
              <input 
                type="number" 
                value={betAmount} 
                onChange={(e) => setBetAmount(Number(e.target.value))}
                min="1"
                max={user.points}
                disabled={gameState.currentPhase !== 'BETTING'}
              />
            </div>
            
            {/* 【优化点2】显示10%限制提示 */}
            <div className="bet-limit-info">
              限额 (10%): {maxBetLimit}
            </div>
          </div>
          
          <ProgressBar totalBets={gameState.totalBets} />
        </div>
      </div>

      {/* 结果弹窗 */}
      {(gameState.currentPhase === 'SETTLEMENT' && gameState.lastSettlement) && (
        <ResultModal 
          settlement={gameState.lastSettlement}
          onClose={() => {/* 可以在这里关闭弹窗逻辑 */}}
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
