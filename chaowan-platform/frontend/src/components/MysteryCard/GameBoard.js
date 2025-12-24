import React, { useState, useEffect, useRef } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import { useUser } from '../../contexts/UserContext';
import BetButton from './BetButton';
import CountdownTimer from './CountdownTimer';
import ProgressBar from './ProgressBar';
import './GameBoard.css';

const CHIPS = [
  { value: 10, color: '#4CAF50', label: '10' },
  { value: 100, color: '#2196F3', label: '100' },
  { value: 1000, color: '#FF9800', label: '1k' },
  { value: 5000, color: '#E91E63', label: '5k' }
];

const GameBoard = ({ gameState: externalGameState }) => {
  const [selectedChip, setSelectedChip] = useState(CHIPS[0].value);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementData, setSettlementData] = useState(null);
  
  // 🔧 动画状态
  const [flyingChips, setFlyingChips] = useState([]);
  const [visibleChips, setVisibleChips] = useState({ east: [], south: [], west: [], north: [] });

  const { gameState, lastSettlement } = useMysteryCard();
  const { user, updateUser } = useUser();
  const { wsService } = useMysteryCard();

  const currentGameState = externalGameState || gameState;

  const hasUpdatedRef = useRef(false);
  const settlementHandledRef = useRef(false);
  const chipButtonRefs = useRef({});

  // 🔧 处理动画事件 (零轮询，纯事件驱动)
  useEffect(() => {
    if (!wsService) return;
    
    const listenerId = wsService.addListener((message) => {
      // 保持原有的结算逻辑
      if (message.type === 'SETTLEMENT') {
        const results = message.payload;
        setLastSettlement(results);
        setSettlementData(results);
        setShowSettlement(true);
        settlementHandledRef.current = true;
        
        if (results.newBalance !== undefined && user && typeof user === 'object') {
          updateUser({ points: results.newBalance });
        }
      } 
      else if (message.type === 'GAME_STATE') {
        if (currentGameState?.currentPhase === 'BETTING' && settlementHandledRef.current) {
          setShowSettlement(false);
          setSettlementData(null);
          settlementHandledRef.current = false;
          hasUpdatedRef.current = false;
          // 新一轮开始，清理筹码堆
          setVisibleChips({ east: [], south: [], west: [], north: [] });
        }
      }
      // 🔧 新增：监听下注动画
      else if (message.type === 'BET_ANIMATION') {
        const { direction, amount } = message.payload;
        const chipConfig = CHIPS.find(c => c.value === amount) || CHIPS[0];
        triggerChipAnimation(direction, chipConfig);
      }
      else if (message.type === 'BET_SUCCESS') {
        if (message.payload.newBalance !== undefined) {
           updateUser({ points: message.payload.newBalance });
        }
      }
    });
    
    return () => wsService.removeListener(listenerId);
  }, [wsService, currentGameState, user, updateUser]);

  // 🔧 触发动画
  const triggerChipAnimation = (direction, chipConfig) => {
    const startElem = chipButtonRefs.current[chipConfig.value];
    const endElem = document.getElementById(`cell-${direction}`);
    
    if (!startElem || !endElem) return;

    const startRect = startElem.getBoundingClientRect();
    const endRect = endElem.getBoundingClientRect();
    
    // 计算位移 (目标中心 - 起始中心)
    const deltaX = endRect.left - startRect.left + (endRect.width / 2) - 20;
    const deltaY = endRect.top - startRect.top + (endRect.height / 2) - 20;

    const newChip = {
      id: Date.now() + Math.random(),
      direction,
      color: chipConfig.color,
      startX: startRect.left,
      startY: startRect.top,
      deltaX,
      deltaY
    };

    setFlyingChips(prev => [...prev, newChip]);

    // 动画结束后的回调
    setTimeout(() => {
      setFlyingChips(prev => prev.filter(c => c.id !== newChip.id));
      setVisibleChips(prev => ({
        ...prev,
        [direction]: [...(prev[direction] || []), { color: chipConfig.color }]
      }));
    }, 600); // 对应 CSS 动画时间
  };

  const handleBet = (general) => {
    if (currentGameState?.currentPhase !== 'BETTING') {
      // alert('当前不在下注阶段'); // 建议用 toast，这里为了保持原有逻辑暂不删，但可以静默
      return;
    }

    // 不再校验 user.points，因为后端会校验
    const chipConfig = CHIPS.find(c => c.value === selectedChip);
    
    // 前端乐观动画
    triggerChipAnimation(general, chipConfig);
    
    if (wsService) {
      wsService.placeBet(general, selectedChip);
    }
  };

  const handleSettlementClose = () => {
    setShowSettlement(false);
    setSettlementData(null);
    settlementHandledRef.current = false;
  };

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
  const betLimit = currentGameState.betLimit || 999999;

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
          <span className="limit-tag" style={{color: '#ffd700'}}>
            限额: {betLimit === 999999 ? '∞' : betLimit}
          </span>
        </div>
      </div>

      {/* 游戏主区域 */}
      <div className="game-main">
        {/* 领主卡牌 */}
        <div className="lord-card-area">
          <div className="card-label">领主卡牌</div>
          {renderCard(currentGameState.lordCard, 'lord')}
        </div>

        {/* 战将区域 */}
        <div className="generals-area">
          {['east', 'south', 'west', 'north'].map(position => {
            const totalPosBet = currentGameState.totalBetsByPosition?.[position] || 0;
            const cardValue = generalsCards[position];
            
            return (
              <div key={position} 
                   id={`cell-${position}`}
                   className={`general-card ${currentGameState.currentPhase === 'BETTING' ? 'betting' : ''}`} 
                   data-position={
                    position === 'east' ? '东' : 
                    position === 'south' ? '南' : 
                    position === 'west' ? '西' : '北'
                  }
                   onClick={() => handleBet(position)}
              >
                {/* 静态筹码堆 */}
                <div className="chips-stack">
                  {visibleChips[position]?.map((chip, idx) => (
                    <div 
                      key={idx} 
                      className="static-chip" 
                      style={{ 
                        backgroundColor: chip.color, 
                        transform: `translate(${(idx%3)*2}px, ${-(Math.floor(idx/3)*2)}px)` 
                      }} 
                    />
                  ))}
                </div>

                <div className="total-bets-display">
                  总池: {totalPosBet}
                </div>
                
                {renderCard(cardValue, position)}
                
                {/* 移除了原有的 BetButton，点击整个区域下注 */}
              </div>
            );
          })}
        </div>

        {/* 下注面板 (改为筹码选择) */}
        <div className="bet-panel">
          <div className="chips-selector">
            {CHIPS.map(chip => (
              <button
                key={chip.value}
                ref={el => chipButtonRefs.current[chip.value] = el}
                className={`chip-select-btn ${selectedChip === chip.value ? 'active' : ''}`}
                style={{ backgroundColor: chip.color }}
                onClick={() => setSelectedChip(chip.value)}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <ProgressBar totalBets={currentGameState.totalBets} />
        </div>
      </div>

      {/* 结算弹窗 */}
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
                        ❌ 失败！投入{result.amount}，损失{result.amount * (result.lordStar || 1)}积分
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

      {/* 飞行筹码容器 */}
      {flyingChips.map(chip => (
        <div
          key={chip.id}
          className="flying-chip"
          style={{
            left: chip.startX,
            top: chip.startY,
            backgroundColor: chip.color,
            '--tx': `${chip.deltaX}px`,
            '--ty': `${chip.deltaY}px`
          }}
        />
      ))}
    </div>
  );
};

export default GameBoard;
