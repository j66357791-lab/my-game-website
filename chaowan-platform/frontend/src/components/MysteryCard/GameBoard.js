// frontend/src/components/MysteryCard/GameBoard.js - 修复React Hooks错误版
import React, { useState, useEffect } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import { useUser } from '../../contexts/UserContext';
import BetButton from './BetButton';
import CountdownTimer from './CountdownTimer';
import ProgressBar from './ProgressBar';
import './GameBoard.css';

const GameBoard = ({ gameState }) => {
  // ================= 状态定义 =================
  const [betAmount, setBetAmount] = useState(10);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementData, setSettlementData] = useState(null);

  const { wsService } = useMysteryCard();
  const { user } = useUser();

  // 计算 10% 限制
  const maxBetLimit = user?.points ? Math.floor(user.points * 0.1) : 0;

  // ================= 【关键修复】移到最顶层的 useEffect =================
  // React Hooks 必须在每次渲染时以相同的顺序调用，不能放在条件判断之后
  useEffect(() => {
    if (gameState?.currentPhase === 'SETTLEMENT' && gameState?.lastSettlement) {
      setSettlementData(gameState.lastSettlement);
      setShowSettlement(true);
    } else if (gameState?.currentPhase !== 'SETTLEMENT') {
      // 当游戏阶段离开结算时，关闭弹窗（防止卡住）
      setShowSettlement(false);
    }
  }, [gameState]);

  // ================= 渲染逻辑 =================

  // 如果 gameState 为空，显示等待（现在放在 useEffect 之后是安全的）
  if (!gameState) {
    return (
      <div className="game-board">
        <div className="connection-status">
          <span className="status-text">等待游戏数据...</span>
        </div>
      </div>
    );
  }

  // 安全获取 generalsCards，防止崩溃
  const generalsCards = gameState.generalsCards || { east: null, south: null, west: null, north: null };

  // 渲染单个卡牌
  const renderCard = (cardValue, position) => {
    const isRevealed = (() => {
      if (gameState.currentPhase === 'SETTLEMENT') return true;
      
      if (gameState.currentPhase === 'REVEALING') {
        if (position === 'lord' && gameState.revealStep >= 5) return true;
        if (position === 'east' && gameState.revealStep >= 1) return true;
        if (position === 'south' && gameState.revealStep >= 2) return true;
        if (position === 'west' && gameState.revealStep >= 3) return true;
        if (position === 'north' && gameState.revealStep >= 4) return true;
      }
      return false;
    })();

    return (
      <div className={`card-slot ${isRevealed ? 'revealed' : 'hidden'}`}>
        {isRevealed ? (
          <div className="card-face">{cardValue}</div>
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

    if (!user.points || user.points < betAmount) {
      alert('积分不足！');
      return;
    }

    // 严格 10% 限制
    if (betAmount > maxBetLimit) {
      alert(`下注失败：单次下注不能超过总积分的10% (最大可投 ${maxBetLimit})`);
      return;
    }

    if (wsService) {
      wsService.placeBet(general, betAmount);
    } else {
      alert('网络连接中断，请刷新页面');
    }
  };

  const handleSettlementClose = () => {
    setShowSettlement(false);
    setSettlementData(null);
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
            const totalPosBet = gameState.totalBetsByPosition?.[position] || 0;
            const cardValue = generalsCards[position];
            
            return (
              <div key={position} className="general-card" data-position={
                position === 'east' ? '东' : 
                position === 'south' ? '南' : 
                position === 'west' ? '西' : '北'
              }>
                {/* 卡牌显示 */}
                {renderCard(cardValue, position)}
                
                {/* 实时显示该位置总投注金额 */}
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
                max={maxBetLimit}
                disabled={gameState.currentPhase !== 'BETTING'}
              />
            </div>
            
            {/* 显示10%限制提示 */}
            <div className="bet-limit-info">
              限额 (10%): {maxBetLimit}
            </div>
          </div>
          
          <ProgressBar totalBets={gameState.totalBets} />
        </div>
      </div>

      {/* 结算弹窗 */}
      {showSettlement && settlementData && (
        <div className="settlement-overlay">
          <div className="settlement-modal">
            <h2>结算结果</h2>
            <div className="settlement-results">
              {settlementData.results && settlementData.results.map((result, index) => (
                <div key={index} className={`settlement-item ${result.result}`}>
                  <div className="position-label">
                    {result.general === 'east' ? '东' : 
                     result.general === 'south' ? '南' : 
                     result.general === 'west' ? '西' : '北'}战将 ({result.generalStar}点) vs 领主({result.lordStar}点)
                  </div>
                  <div className="result-info">
                    {result.result === 'win' && (
                      <div className="win">
                        🎉 获胜！投入{result.amount}，获得{result.winAmount}积分
                      </div>
                    )}
                    {result.result === 'lose' && (
                      <div className="lose">
                        ❌ 失败！投入{result.amount}，损失{result.amount * result.lordStar}积分
                      </div>
                    )}
                    {result.result === 'draw' && (
                      <div className="draw">
                        🤝 平局！返还本金{result.amount}积分
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="settlement-total">
              本轮总计：{settlementData.totalWinAmount > 0 ? `+${settlementData.totalWinAmount}` : '无收益'} 积分
            </div>
            <button className="close-button" onClick={handleSettlementClose}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
