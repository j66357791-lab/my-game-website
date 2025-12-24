import React, { useState, useEffect, useRef } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import { useUser } from '../../contexts/UserContext';
import CountdownTimer from './CountdownTimer';
import ProgressBar from './ProgressBar';
import './GameBoard.css';

// ==================== 🔊 内置音效管理器 (无需外部文件) ====================
class SoundManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  playTone(freq, type, duration, vol = 0.1) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 金币/下注音效 (高音短促)
  playBet() {
    this.playTone(1200, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1800, 'sine', 0.1, 0.1), 50);
  }

  // 飞行音效 (滑音)
  playFly() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // 胜利音效 (大三和弦)
  playWin() {
    this.playTone(523.25, 'triangle', 0.3, 0.2); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.3, 0.2), 100); // E5
    setTimeout(() => this.playTone(783.99, 'triangle', 0.4, 0.2), 200); // G5
  }

  // 失败音效 (低频锯齿波)
  playLose() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }
}

const soundManager = new SoundManager();
// ==================== 音效结束 ====================

const CHIPS = [
  { value: 10, color: '#4CAF50', label: '10' },
  { value: 100, color: '#2196F3', label: '100' },
  { value: 1000, color: '#FF9800', label: '1k' },
  { value: 5000, color: '#E91E63', label: '5k' }
];

const GameBoard = ({ gameState: externalGameState }) => {
  const [selectedChip, setSelectedChip] = useState(CHIPS[0].value);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementData, setSettlementData] = useState(null);
  
  // 🔧 历史记录与弹窗状态
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  // 🔧 动画状态
  const [flyingChips, setFlyingChips] = useState([]);
  const [visibleChips, setVisibleChips] = useState({ east: [], south: [], west: [], north: [] });
  
  // 🔧 领主状态
  const [leaderStatus, setLeaderStatus] = useState(null); // { currentLeader, leaderQueue }
  const [isUserLeader, setIsUserLeader] = useState(false);
  const [isUserInQueue, setIsUserInQueue] = useState(false);

  const { gameState, lastSettlement, setLastSettlement, wsService } = useMysteryCard();
  const { user, updateUser } = useUser();

  const currentGameState = externalGameState || gameState;
  const lastRoundRef = useRef(0);
  const chipButtonRefs = useRef({});

  // 🔧 核心修复1：监听游戏状态变化，处理重置与积分
  useEffect(() => {
    if (!currentGameState) return;

    // 1. 检测轮次变更，清理筹码和结算弹窗
    if (currentGameState.roundNumber !== lastRoundRef.current) {
      console.log(`🔄 轮次变更: ${lastRoundRef.current} -> ${currentGameState.roundNumber}，清理界面`);
      lastRoundRef.current = currentGameState.roundNumber;
      setVisibleChips({ east: [], south: [], west: [], north: [] }); // 清理筹码
      setShowSettlement(false); // 关闭结算
      setSettlementData(null);
    }

    // 2. 处理结算消息
    if (currentGameState.currentPhase === 'SETTLEMENT' && currentGameState.results && !showSettlement) {
      const results = currentGameState.results; // 注意：这里可能是后端直接发的，也可能是 ws payload
      // 如果后端发的是 SETTLEMENT 消息类型，下面那个 useEffect 会处理
    }
  }, [currentGameState, showSettlement]);

  // 🔧 核心修复2：监听 WebSocket 消息
  useEffect(() => {
    if (!wsService) return;
    
    const listenerId = wsService.addListener((message) => {
      // 处理结算
      if (message.type === 'SETTLEMENT') {
        const results = message.payload;
        setSettlementData(results);
        setShowSettlement(true);
        setLastSettlement(results);
        
        // 更新积分
        if (results.newBalance !== undefined) {
          updateUser({ points: results.newBalance });
        }

        // 🔊 播放音效
        const hasWin = results.results?.some(r => r.result === 'win');
        if (hasWin) soundManager.playWin();
        else soundManager.playLose();
      }
      
      // 处理历史记录
      else if (message.type === 'HISTORY') {
        setHistoryList(message.payload);
        setShowHistory(true);
      }

      // 处理领主状态更新
      else if (message.type === 'LEADER_STATUS') {
        setLeaderStatus(message.payload);
        checkUserLeaderStatus(message.payload, user?._id);
      }

      // 处理错误
      else if (message.type === 'ERROR') {
        alert(message.message); // 简单弹窗提示错误
      }

      // 处理下注动画
      else if (message.type === 'BET_ANIMATION') {
        const { direction, amount } = message.payload;
        const chipConfig = CHIPS.find(c => c.value === amount) || CHIPS[0];
        triggerChipAnimation(direction, chipConfig);
      }
    });
    
    return () => wsService.removeListener(listenerId);
  }, [wsService, user, updateUser, setLastSettlement]);

  // 检查用户是否是领主或在排队
  const checkUserLeaderStatus = (status, userId) => {
    if (!status || !userId) return;
    const isLeader = status.currentLeader?.userId === userId && status.currentLeader?.type === 'USER';
    const inQueue = status.leaderQueue?.find(q => q.userId === userId);
    setIsUserLeader(isLeader);
    setIsUserInQueue(!!inQueue);
  };

  // 触发筹码动画
  const triggerChipAnimation = (direction, chipConfig) => {
    soundManager.playFly(); // 🔊 播放飞行音效
    const startElem = chipButtonRefs.current[chipConfig.value];
    const endElem = document.getElementById(`cell-${direction}`);
    
    if (!startElem || !endElem) return;

    const startRect = startElem.getBoundingClientRect();
    const endRect = endElem.getBoundingClientRect();
    
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

    setTimeout(() => {
      setFlyingChips(prev => prev.filter(c => c.id !== newChip.id));
      setVisibleChips(prev => ({
        ...prev,
        [direction]: [...(prev[direction] || []), { color: chipConfig.color }]
      }));
    }, 600);
  };

  // 下注逻辑
  const handleBet = (general) => {
    if (currentGameState?.currentPhase !== 'BETTING') {
      return;
    }

    // 🔧 核心修复3：前端校验自身积分10%限制
    const userMaxBet = Math.floor(user.points * 0.1);
    if (selectedChip > userMaxBet) {
      alert(`单次下注不能超过个人积分的10% (当前限额 ${userMaxBet})`);
      return;
    }

    soundManager.playBet(); // 🔊 播放下注音效
    const chipConfig = CHIPS.find(c => c.value === selectedChip);
    triggerChipAnimation(general, chipConfig);
    
    if (wsService) {
      wsService.placeBet(general, selectedChip);
    }
  };

  // 申请领主
  const handleApplyLeader = () => {
    if (wsService) wsService.sendMessage({ type: 'APPLY_LEADER' });
  };

  // 申请下庄
  const handleRequestDown = () => {
    if (wsService) wsService.sendMessage({ type: 'REQUEST_DOWN' });
  };

  // 获取历史
  const handleGetHistory = () => {
    if (wsService) wsService.getHistory();
  };

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
        {isRevealed ? <div className="card-face">{cardValue}</div> : <div className="card-back">?</div>}
      </div>
    );
  };

  if (!currentGameState) return <div className="connection-status">等待游戏数据...</div>;

  const generalsCards = currentGameState.generalsCards || { east: null, south: null, west: null, north: null };
  const betLimit = currentGameState.betLimit || 999999;

  return (
    <div className="game-board">
      {/* 头部：包含历史按钮 */}
      <div className="game-header">
        <h1>神秘卡牌对战</h1>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleGetHistory} aria-label="历史记录">📜</button>
        </div>
        <CountdownTimer timeRemaining={currentGameState.timeRemaining} />
        <div className="game-info">
          <span>第{currentGameState.roundNumber}轮</span>
          <span className="phase-tag">{currentGameState.currentPhase}</span>
          <span className="balance-tag">积分: {user.points}</span>
          <span className="limit-tag">限额: {betLimit === 999999 ? '∞' : betLimit}</span>
        </div>
      </div>

      {/* 🔧 领主控制区 */}
      <div className="leader-control-panel">
        {isUserLeader ? (
          <div className="leader-status active">
            <span>👑 您是当前领主</span>
            <button className="btn-down" onClick={handleRequestDown}>申请下庄</button>
          </div>
        ) : isUserInQueue ? (
          <div className="leader-status queue">
            <span>⏳ 排队中...</span>
          </div>
        ) : (
          <div className="leader-status normal">
            {!leaderStatus?.currentLeader || leaderStatus.currentLeader.type === 'SYSTEM' ? (
              <button className="btn-up" onClick={handleApplyLeader}>申请上庄 (需1w积分)</button>
            ) : (
              <span>当前领主: {leaderStatus.currentLeader.username}</span>
            )}
          </div>
        )}
      </div>

      {/* 游戏主区域 */}
      <div className="game-main">
        <div className="lord-card-area">
          <div className="card-label">领主卡牌</div>
          {renderCard(currentGameState.lordCard, 'lord')}
        </div>

        <div className="generals-area">
          {['east', 'south', 'west', 'north'].map(position => {
            const totalPosBet = currentGameState.totalBetsByPosition?.[position] || 0;
            const cardValue = generalsCards[position];
            return (
              <div key={position} id={`cell-${position}`}
                   className={`general-card ${currentGameState.currentPhase === 'BETTING' ? 'betting' : ''}`} 
                   data-position={position === 'east' ? '东' : position === 'south' ? '南' : position === 'west' ? '西' : '北'}
                   onClick={() => handleBet(position)}>
                <div className="chips-stack">
                  {visibleChips[position]?.map((chip, idx) => (
                    <div key={idx} className="static-chip" style={{ backgroundColor: chip.color, transform: `translate(${(idx%3)*2}px, ${-(Math.floor(idx/3)*2)}px)` }} />
                  ))}
                </div>
                <div className="total-bets-display">总池: {totalPosBet}</div>
                {renderCard(cardValue, position)}
              </div>
            );
          })}
        </div>

        <div className="bet-panel">
          <div className="chips-selector">
            {CHIPS.map(chip => (
              <button key={chip.value} ref={el => chipButtonRefs.current[chip.value] = el}
                      className={`chip-select-btn ${selectedChip === chip.value ? 'active' : ''}`}
                      style={{ backgroundColor: chip.color }}
                      onClick={() => setSelectedChip(chip.value)}>
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
              <button className="close-button" onClick={() => setShowSettlement(false)}>×</button>
            </div>
            <div className="settlement-results">
              {settlementData.results && settlementData.results.map((result, index) => (
                <div key={index} className={`settlement-item ${result.result}`}>
                  <div className="position-label">
                    {result.general === 'east' ? '东' : result.general === 'south' ? '南' : result.general === 'west' ? '西' : '北'} 
                    ({result.generalStar}点) vs 领主({result.lordStar}点)
                  </div>
                  <div className="result-info">
                    {result.result === 'win' && <div className="win">🎉 获得{result.winAmount}积分</div>}
                    {result.result === 'lose' && <div className="lose">❌ 损失{result.amount}积分</div>}
                    {result.result === 'draw' && <div className="draw">🤝 平局</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="settlement-total">最新余额: {settlementData.newBalance}</div>
          </div>
        </div>
      )}

      {/* 历史记录弹窗 */}
      {showHistory && (
        <div className="settlement-overlay"> {/* 复用遮罩样式 */}
          <div className="settlement-modal">
            <div className="modal-header">
              <h2>游戏记录</h2>
              <button className="close-button" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="history-list">
              {historyList.length === 0 ? <div style={{textAlign:'center', padding:'20px'}}>暂无记录</div> : 
                historyList.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <span>{item.description}</span>
                      <span className={item.amount > 0 ? 'win' : 'lose'}>{item.amount > 0 ? '+' : ''}{item.amount}</span>
                    </div>
                    <div style={{fontSize:'12px', color:'#999', marginTop:'5px'}}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {flyingChips.map(chip => (
        <div key={chip.id} className="flying-chip"
             style={{ left: chip.startX, top: chip.startY, backgroundColor: chip.color, '--tx': `${chip.deltaX}px`, '--ty': `${chip.deltaY}px` }} />
      ))}
    </div>
  );
};

export default GameBoard;
