// frontend/src/components/MysteryCard/GameBoard.js - 完整版
import React, { useState, useEffect, useRef } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import { useUser } from '../../contexts/UserContext';
import BetButton from './BetButton';
import CountdownTimer from './CountdownTimer';
import ProgressBar from './ProgressBar';
import HistoryChart from './HistoryChart'; // 🔧 新增：引入历史图表组件
import './GameBoard.css';

const GameBoard = ({ gameState: externalGameState }) => {
  // ================= 状态定义 =================
  const [betAmount, setBetAmount] = useState(10);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementData, setSettlementData] = useState(null);
  
  // 🔧 新增：历史记录弹窗相关状态
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { gameState, lastSettlement } = useMysteryCard();
  const { user, updateUser } = useUser();
  const { wsService } = useMysteryCard();

  // 使用外部 gameState 优先，如果没有则使用 Context 中的
  const currentGameState = externalGameState || gameState;

  // 计算 10% 限制
  const maxBetLimit = user?.points ? Math.floor(user.points * 0.1) : 0;

  // 🔧 使用 useRef 防止 useEffect 无限循环
  const hasUpdatedRef = useRef(false);
  const settlementHandledRef = useRef(false);

  // ================= 【关键修复】处理游戏状态变化 =================
  useEffect(() => {
    if (!currentGameState) return;

    // 🔧 1. 处理结算阶段
    if (currentGameState.currentPhase === 'SETTLEMENT' && currentGameState.results && !settlementHandledRef.current) {
      const results = currentGameState.results;
      setSettlementData(results);
      setShowSettlement(true);
      settlementHandledRef.current = true;

      // 只在积分真正变化时更新
      if (results.newBalance !== undefined && user && typeof user === 'object') {
        console.log(`[前端] 结算更新积分: ${user.points} -> ${results.newBalance}`);
        updateUser({ points: results.newBalance });
      }
    } 
    // 🔧 2. 处理新游戏开始（从结算到下注）
    else if (currentGameState.currentPhase === 'BETTING' && settlementHandledRef.current) {
      console.log('🎮 游戏进入新的一期！');
      setShowSettlement(false);
      setSettlementData(null);
      settlementHandledRef.current = false; // 重置标志
      hasUpdatedRef.current = false; // 重置更新标志
    }
    // 🔧 3. 处理其他阶段变化（防止卡住）
    else if (currentGameState.currentPhase !== 'SETTLEMENT') {
      setShowSettlement(false);
      setSettlementData(null);
      settlementHandledRef.current = false;
    }
  }, [currentGameState, user, updateUser]);

  // ================= 渲染逻辑 =================

  if (!currentGameState) {
    return (
      <div className="game-board">
        <div className="connection-status">
          <span className="status-text">等待游戏数据...</span>
        </div>
      </div>
    );
  }

  const generalsCards = currentGameState.generalsCards || { east: null, south: null, west: null, north: null };

  const renderCard = (cardValue, position) => {
    const isRevealed = (() => {
      if (currentGameState.currentPhase === 'SETTLEMENT') return true;
      
      if (currentGameState.currentPhase === 'REVEALING') {
        if (position === 'lord' && currentGameState.revealStep >= 5) return true;
        if (position === 'east' && currentGameState.revealStep >= 1) return true;
        if (position === 'south' && currentGameState.revealStep >= 2) return true;
        if (position === 'west' && currentGameState.revealStep >= 3) return true;
        if (position === 'north' && currentGameState.revealStep >= 4) return true;
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
    if (currentGameState.currentPhase !== 'BETTING') {
      alert('当前不在下注阶段');
      return;
    }

    if (!user.points || user.points < betAmount) {
      alert('积分不足！');
      return;
    }

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
    settlementHandledRef.current = false;
  };

  // 🔧 新增：获取历史记录
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('https://tianchuang.onrender.com/api/mystery-card/history');
      const data = await res.json();
      if (data.success) {
        setHistoryData(data.data);
      } else {
        alert('获取历史记录失败');
      }
    } catch (error) {
      console.error('获取历史失败', error);
      alert('获取历史记录失败');
    } finally {
      setLoadingHistory(false);
    }
  };

  // 🔧 新增：打开历史弹窗
  const handleOpenHistory = () => {
    setShowHistory(true);
    fetchHistory();
  };

  return (
    <div className="game-board">
      {/* 游戏头部 */}
      <div className="game-header">
        <h1>神秘卡牌对战</h1>
        <CountdownTimer timeRemaining={currentGameState.timeRemaining} />
        <div className="game-info">
          <span>第{currentGameState.roundNumber}轮</span>
          <span className="phase-tag">{currentGameState.currentPhase}</span>
          <span className="balance-tag">积分: {user.points}</span>
          
          {/* 🔧 新增：历史记录按钮 */}
          <button 
            onClick={handleOpenHistory}
            style={{
              marginLeft: '10px',
              padding: '4px 8px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📜 历史
          </button>
        </div>
      </div>

      {/* 游戏主区域 */}
      <div className="game-main">
        {/* 领主卡牌 */}
        <div className="lord-card-area">
          <div className="card-label">领主卡牌</div>
          {renderCard(currentGameState.lordCard, 'lord')}
        </div>

        {/* 战将卡牌区域 */}
        <div className="generals-area">
          {['east', 'south', 'west', 'north'].map(position => {
            const totalPosBet = currentGameState.totalBetsByPosition?.[position] || 0;
            const cardValue = generalsCards[position];
            
            return (
              <div key={position} className="general-card" data-position={
                position === 'east' ? '东' : 
                position === 'south' ? '南' : 
                position === 'west' ? '西' : '北'
              }>
                {renderCard(cardValue, position)}
                <div className="total-bets-display">
                  总池: {totalPosBet}
                </div>
                {currentGameState.currentPhase === 'BETTING' && (
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
                disabled={currentGameState.currentPhase !== 'BETTING'}
              />
            </div>
            <div className="bet-limit-info">
              限额 (10%): {maxBetLimit}
            </div>
          </div>
          <ProgressBar totalBets={currentGameState.totalBets} />
        </div>
      </div>

      {/* 美化：结算弹窗 */}
      {showSettlement && settlementData && (
        <div className="settlement-overlay">
          <div className="settlement-modal">
            <div className="modal-header">
              <h2>结算结果</h2>
              <button 
                className="close-button" 
                onClick={handleSettlementClose}
                aria-label="关闭"
              >
                ×
              </button>
            </div>
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
              本轮最新余额：<strong>{settlementData.newBalance}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 新增：历史记录弹窗 */}
      {showHistory && (
        <div className="settlement-overlay" style={{ zIndex: 10000 }}>
          <div className="settlement-modal" style={{ maxWidth: '95%', width: '500px' }}>
            <div className="modal-header">
              <h2>📜 开奖历史走势</h2>
              <button 
                className="close-button" 
                onClick={() => setShowHistory(false)}
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="settlement-results" style={{ padding: '10px 0' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  加载中...
                </div>
              ) : (
                <HistoryChart history={historyData} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
