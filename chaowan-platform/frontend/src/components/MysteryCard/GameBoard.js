import React, { useState, useEffect, useRef } from 'react';
import { useMysteryCard } from '../../contexts/MysteryCardContext';
import { useUser } from '../../contexts/UserContext';
import CountdownTimer from './CountdownTimer';
import ProgressBar from './ProgressBar';
import TaskCenter from './TaskCenter'; // 🔧 新增：任务中心组件
import './GameBoard.css';

// 🔊 音效管理器 (保持不变)
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
  playBet() { this.playTone(1200, 'sine', 0.1, 0.1); setTimeout(() => this.playTone(1800, 'sine', 0.1, 0.1), 50); }
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
  playWin() {
    this.playTone(523.25, 'triangle', 0.3, 0.2);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.3, 0.2), 100);
    setTimeout(() => this.playTone(783.99, 'triangle', 0.4, 0.2), 200);
  }
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
  
  // 🔧 状态：历史记录
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [showTrend, setShowTrend] = useState(false);
  const [trendData, setTrendData] = useState([]);
  const [userTotalBetThisRound, setUserTotalBetThisRound] = useState(0);
  const [flyingChips, setFlyingChips] = useState([]);
  const [visibleChips, setVisibleChips] = useState({ east: [], south: [], west: [], north: [] });
  const [leaderStatus, setLeaderStatus] = useState(null);
  const [isUserLeader, setIsUserLeader] = useState(false);
  const [isUserInQueue, setIsUserInQueue] = useState(false);
  
  // 🔧 新增：任务中心状态
  const [showTaskCenter, setShowTaskCenter] = useState(false);

  const { gameState, lastSettlement, setLastSettlement, wsService } = useMysteryCard();
  // 🔧 修改：解构 updateTodayWins
  const { user, updateUser, updateTodayWins } = useUser();
  const currentGameState = externalGameState || gameState;
  const lastRoundRef = useRef(0);
  const chipButtonRefs = useRef({});

  // 🔧 1. 监听轮次变化，重置筹码和下注记录
  useEffect(() => {
    if (!currentGameState) return;
    if (currentGameState.roundNumber !== lastRoundRef.current) {
      lastRoundRef.current = currentGameState.roundNumber;
      setVisibleChips({ east: [], south: [], west: [], north: [] });
      setShowSettlement(false);
      setSettlementData(null);
      setUserTotalBetThisRound(0);
    }
  }, [currentGameState]);

  // 🔧 2. 监听 WebSocket 消息
  useEffect(() => {
    if (!wsService) return;
    
    const listenerId = wsService.addListener((message) => {
      if (message.type === 'SETTLEMENT') {
        const results = message.payload;
        setSettlementData(results);
        setShowSettlement(true);
        setLastSettlement(results);
        if (results.newBalance !== undefined) updateUser({ points: results.newBalance });
        const hasWin = results.results?.some(r => r.result === 'win');
        if (hasWin) soundManager.playWin(); else soundManager.playLose();

        // 🔥 新增：计算本轮赢取的金额，并更新每日任务进度
        if (results.results && results.results.length > 0) {
          const roundWin = results.results.reduce((sum, r) => {
            // 只累加获胜的金额 (winAmount 通常代表纯利润)
            return sum + (r.result === 'win' ? (r.winAmount || 0) : 0);
          }, 0);

          if (roundWin > 0) {
            console.log(`📊 本轮赢取 ${roundWin} 积分，更新任务进度`);
            updateTodayWins(roundWin);
          }
        }
      }
      else if (message.type === 'HISTORY') {
        setHistoryList(message.payload);
        setShowHistory(true);
      }
      else if (message.type === 'LEADER_STATUS') {
        setLeaderStatus(message.payload);
        checkUserLeaderStatus(message.payload, user?._id);
      }
      else if (message.type === 'GAME_HISTORY_DATA') {
        setTrendData(message.payload);
        setShowTrend(true);
      }
      else if (message.type === 'ERROR') {
        alert(message.message);
      }
      else if (message.type === 'BET_ANIMATION') {
        const { direction, amount } = message.payload;
        const chipConfig = CHIPS.find(c => c.value === amount) || CHIPS[0];
        triggerChipAnimation(direction, chipConfig);
      }
      else if (message.type === 'BET_SUCCESS') {
        const { amount } = message.payload;
        setUserTotalBetThisRound(prev => prev + amount);
        if (message.payload.newBalance !== undefined) updateUser({ points: message.payload.newBalance });
      }
    });
    return () => wsService.removeListener(listenerId);
  }, [wsService, user, updateUser, setLastSettlement, updateTodayWins]); // 🔧 新增依赖项

  const checkUserLeaderStatus = (status, userId) => {
    if (!status || !userId) return;
    const isLeader = status.currentLeader?.userId === userId && status.currentLeader?.type === 'USER';
    const inQueue = status.leaderQueue?.find(q => q.userId === userId);
    setIsUserLeader(isLeader);
    setIsUserInQueue(!!inQueue);
  };

  const triggerChipAnimation = (direction, chipConfig) => {
    soundManager.playFly();
    const startElem = chipButtonRefs.current[chipConfig.value];
    const endElem = document.getElementById(`cell-${direction}`);
    if (!startElem || !endElem) return;
    const startRect = startElem.getBoundingClientRect();
    const endRect = endElem.getBoundingClientRect();
    const deltaX = endRect.left - startRect.left + (endRect.width / 2) - 20;
    const deltaY = endRect.top - startRect.top + (endRect.height / 2) - 20;
    const newChip = { id: Date.now() + Math.random(), direction, color: chipConfig.color, startX: startRect.left, startY: startRect.top, deltaX, deltaY };
    setFlyingChips(prev => [...prev, newChip]);
    setTimeout(() => {
      setFlyingChips(prev => prev.filter(c => c.id !== newChip.id));
      setVisibleChips(prev => ({ ...prev, [direction]: [...(prev[direction] || []), { color: chipConfig.color }] }));
    }, 600);
  };

  const handleBet = (general) => {
    if (currentGameState?.currentPhase !== 'BETTING') return;
    
    // 🔧 1. 禁用领主下注
    if (isUserLeader) return; 

    // 🔧 2. 校验本局下注总额 (自身积分10%)
    const limit = Math.floor(user.points * 0.1);
    if (userTotalBetThisRound + selectedChip > limit) {
      alert(`本局累计下注已达上限 (${userTotalBetThisRound}/${limit})`);
      return;
    }

    soundManager.playBet();
    const chipConfig = CHIPS.find(c => c.value === selectedChip);
    triggerChipAnimation(general, chipConfig);
    if (wsService) wsService.placeBet(general, selectedChip);
  };

  const handleApplyLeader = () => { if (wsService) wsService.sendMessage({ type: 'APPLY_LEADER' }); };
  const handleRequestDown = () => { if (wsService) wsService.sendMessage({ type: 'REQUEST_DOWN' }); };
  const handleGetHistory = () => { if (wsService) wsService.getHistory(); };
  const handleGetTrend = () => { if (wsService) wsService.sendMessage({ type: 'GET_GAME_HISTORY' }); };

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
    return (<div className={`card-slot ${isRevealed ? 'revealed' : 'hidden'}`}>{isRevealed ? <div className="card-face">{cardValue}</div> : <div className="card-back">?</div>}</div>);
  };

  if (!currentGameState) return <div className="connection-status">等待游戏数据...</div>;

  const generalsCards = currentGameState.generalsCards || { east: null, south: null, west: null, north: null };
  const betLimit = currentGameState.betLimit || 999999;

  // 🔧 判断是否显示申请下庄按钮 (当了庄且超过3局且未申请)
  const showDownBtn = isUserLeader && leaderStatus?.currentLeader?.roundCount >= 3 && !leaderStatus?.currentLeader?.requestedDown;

  return (
    <div className="game-board">
      <div className="game-header">
        <h1>神秘卡牌对战</h1>
        <div className="header-actions">
          <button className="icon-btn" onClick={handleGetTrend} title="走势图">📈</button>
          <button className="icon-btn" onClick={handleGetHistory} title="历史记录">📜</button>
          {/* 🔧 新增：任务中心按钮 */}
          <button 
            className="task-center-button"
            onClick={() => setShowTaskCenter(true)}
            title="任务中心"
          >
            📋
          </button>
        </div>
        <CountdownTimer timeRemaining={currentGameState.timeRemaining} />
        <div className="game-info">
          <span>第{currentGameState.roundNumber}轮</span>
          <span className="phase-tag">{currentGameState.currentPhase}</span>
          <span className="balance-tag">积分: {user.points}</span>
          <span className="limit-tag">限额: {betLimit === 999999 ? '∞' : betLimit}</span>
          <span className="bet-status-tag">本局下注: {userTotalBetThisRound}</span>
        </div>
      </div>

      <div className="leader-control-panel">
        {isUserLeader ? (
          <div className="leader-status active">
            <span>👑 您是领主 (第{leaderStatus?.currentLeader?.roundCount}轮)</span>
            {showDownBtn && <button className="btn-down" onClick={handleRequestDown}>申请下庄</button>}
            {leaderStatus?.currentLeader?.requestedDown && <span style={{color:'orange',marginLeft:'10px'}}>👋 下局退位</span>}
          </div>
        ) : isUserInQueue ? (
          <div className="leader-status queue"><span>⏳ 排队中...</span></div>
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
                   className={`general-card ${currentGameState.currentPhase === 'BETTING' ? 'betting' : ''} ${isUserLeader ? 'disabled' : ''}`} 
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

      {/* 走势图弹窗 */}
      {showTrend && (
        <div className="settlement-overlay">
          <div className="trend-modal">
            <div className="modal-header">
              <h2>近十期走势</h2>
              <button className="close-button" onClick={() => setShowTrend(false)}>×</button>
            </div>
            <div className="trend-container">
              <div className="trend-header">
                <div className="axis-label">方位</div>
                <div className="trend-axis">
                  {[1,2,3,4,5,6,7,8,9,10].map(num => <div key={num} className="axis-num">{num}</div>)}
                </div>
              </div>
              {/* 领主行 */}
              <div className="trend-row">
                <div className="row-label">领主</div>
                <div className="trend-track">
                  {trendData.map((round, idx) => (
                    <div key={round._id} className="trend-dot lord" style={{ left: `${round.lordCard * 10}%` }}>
                      {round.lordCard}
                    </div>
                  ))}
                </div>
              </div>
              {/* 战将行 */}
              {['east', 'south', 'west', 'north'].map(pos => (
                <div key={pos} className="trend-row">
                  <div className="row-label">{pos === 'east' ? '东' : pos === 'south' ? '南' : pos === 'west' ? '西' : '北'}</div>
                  <div className="trend-track">
                    {trendData.map((round, idx) => {
                      const val = round.generalsCards[pos];
                      const lord = round.lordCard;
                      const isWin = val > lord;
                      const colorClass = isWin ? 'win' : (val < lord ? 'lose' : 'draw');
                      return (
                        <div key={round._id} className={`trend-dot ${colorClass}`} style={{ left: `${val * 10}%` }}>
                          {val}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSettlement && settlementData && (
        <div className="settlement-overlay">
          <div className="settlement-modal">
            <div className="modal-header"><h2>结算结果</h2><button className="close-button" onClick={() => setShowSettlement(false)}>×</button></div>
            <div className="settlement-results">
              {settlementData.results && settlementData.results.map((result, index) => (
                <div key={index} className={`settlement-item ${result.result}`}>
                  <div className="position-label">{result.general === 'east' ? '东' : result.general === 'south' ? '南' : result.general === 'west' ? '西' : '北'} ({result.generalStar}点) vs 领主({result.lordStar}点)</div>
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

      {showHistory && (
        <div className="settlement-overlay">
          <div className="settlement-modal">
            <div className="modal-header"><h2>游戏记录</h2><button className="close-button" onClick={() => setShowHistory(false)}>×</button></div>
            <div className="history-list">
              {historyList.length === 0 ? <div style={{textAlign:'center', padding:'20px'}}>暂无记录</div> : 
                historyList.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <span>{item.description}</span>
                      <span className={item.amount > 0 ? 'win' : 'lose'}>{item.amount > 0 ? '+' : ''}{item.amount}</span>
                    </div>
                    <div style={{fontSize:'12px', color:'#999', marginTop:'5px'}}>{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* 任务中心弹窗 */}
      {showTaskCenter && (
        <div className="task-center-overlay">
          <TaskCenter onClose={() => setShowTaskCenter(false)} />
        </div>
      )}

      {flyingChips.map(chip => (
        <div key={chip.id} className="flying-chip" style={{ left: chip.startX, top: chip.startY, backgroundColor: chip.color, '--tx': `${chip.deltaX}px`, '--ty': `${chip.deltaY}px` }} />
      ))}
    </div>
  );
};

export default GameBoard;
