// TurtleRabbitRacePage.js - 修复版本
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { startRace, getRecentRaces, getRaceHistory, getRaceStats } from '../services/raceService';
import RaceModal from '../components/RaceModal/RaceModal';
import './TurtleRabbitRacePage.css';

const TurtleRabbitRacePage = () => {
  const { points, starcoin, refreshData } = useUser();
  
  // 状态管理
  const [betAmount, setBetAmount] = useState(100);
  const [betType, setBetType] = useState('points');
  const [betChoice, setBetChoice] = useState('');
  const [recentRaces, setRecentRaces] = useState([]);
  const [raceStats, setRaceStats] = useState({ turtleWinRate: 0, rabbitWinRate: 0 });
  const [isRacing, setIsRacing] = useState(false);
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [totalStats, setTotalStats] = useState({ totalInvested: 0, totalProfit: 0, winRate: 0 });
  const [currentRaceResult, setCurrentRaceResult] = useState(null);

  // 获取初始数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recentRes, statsRes, historyRes] = await Promise.all([
          getRecentRaces(),
          getRaceStats(),
          getRaceHistory({ limit: 100 })
        ]);
        
        if (recentRes.success) setRecentRaces(recentRes.data);
        if (statsRes.success) setRaceStats(statsRes.data);
        if (historyRes.success) {
          setUserHistory(historyRes.data.raceHistory);
          calculateTotalStats(historyRes.data.raceHistory);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };
    fetchData();
  }, []);

  // 计算总统计
  const calculateTotalStats = (history) => {
    const totalInvested = history.reduce((sum, record) => sum + record.betAmount, 0);
    const totalProfit = history.reduce((sum, record) => sum + record.balanceChange, 0);
    const winCount = history.filter(record => record.result === 'win').length;
    const winRate = history.length > 0 ? (winCount / history.length * 100).toFixed(2) : 0;
    
    setTotalStats({ totalInvested, totalProfit, winRate });
  };

  // 开始游戏
  const startGame = () => {
    if (!betChoice) {
      alert('请选择乌龟或兔子！');
      return;
    }
    
    const balance = betType === 'points' ? points : starcoin;
    if (balance < betAmount) {
      alert(`余额不足！需要${betAmount}${betType === 'points' ? '积分' : '星源币'}`);
      return;
    }

    // 确认弹窗
    const confirmMsg = `您选择${betChoice === 'turtle' ? '乌龟' : '兔子'}，投入${betAmount}${betType === 'points' ? '积分' : '星源币'}，当前余额${balance}，投入后剩余${balance - betAmount}`;
    if (!window.confirm(confirmMsg)) return;

    setShowRaceModal(true);
  };

  // 游戏完成回调
  const handleRaceComplete = (result) => {
    console.log('🏁 游戏完成，结果:', result);
    setCurrentRaceResult(result);
    setShowRaceModal(false);
    setShowSettlement(true);
    setIsRacing(false);
    
    // 刷新用户数据
    refreshData();
    
    // 更新数据
    setRecentRaces(prev => [{
      winner: result.winner,
      betAmount: result.betAmount,
      createdAt: new Date().toISOString()
    }, ...prev.slice(0, 9)]);
    
    setUserHistory(prev => {
      const newHistory = [result, ...prev];
      calculateTotalStats(newHistory);
      return newHistory;
    });
  };

  // 渲染结算弹窗
  const renderSettlementModal = () => {
    if (!showSettlement || !currentRaceResult) return null;

    const { result, winner, betChoice, rewardAmount, balanceChange } = currentRaceResult;
    const isWin = result === 'win';
    const currency = betType === 'points' ? '积分' : '星源币';

    return (
      <div className="settlement-modal">
        <div className="modal-content">
          <h3>{isWin ? '🎉 胜利！' : '😔 失败'}</h3>
          <p>您选择的是{betChoice === 'turtle' ? '乌龟' : '兔子'}</p>
          <p>这把{winner === 'turtle' ? '乌龟' : '兔子'}获得胜利</p>
          {isWin ? (
            <p>恭喜您获得{rewardAmount}{currency}</p>
          ) : (
            <p>很抱歉您这把没有获得奖励</p>
          )}
          <button onClick={() => setShowSettlement(false)}>确定</button>
        </div>
      </div>
    );
  };

  return (
    <div className="race-page">
      {/* 顶部区域 - 占比25% */}
      <div className="top-section">
        {/* 左侧 - 近十期结果 */}
        <div className="recent-results">
          <h4>近十期结果</h4>
          <div className="results-grid">
            {recentRaces.map((race, index) => (
              <div key={index} className="result-item">
                {race.winner === 'turtle' ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </div>

        {/* 中间 - 动态动画 */}
        <div className="race-animation">
          <div className="track">
            <div className="turtle-track">
              <div className="start-line"></div>
              <div className="finish-line"></div>
              <div className="turtle-runner">🐢</div>
            </div>
            <div className="rabbit-track">
              <div className="start-line"></div>
              <div className="finish-line"></div>
              <div className="rabbit-runner">🐰</div>
            </div>
          </div>
        </div>

        {/* 右侧 - 胜率统计 */}
        <div className="win-stats">
          <div className="turtle-win-rate">
            <div className="stat-item">
              <span>乌龟胜率</span>
              <span>{raceStats.turtleWinRate}%</span>
            </div>
          </div>
          <div className="rabbit-win-rate">
            <div className="stat-item">
              <span>兔子胜率</span>
              <span>{raceStats.rabbitWinRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 投注区域 - 占比75% */}
      <div className="betting-section">
        {/* 余额显示 */}
        <div className="balance-display">
          <div className="balance-item">
            <span className="currency-icon">🏆</span>
            <span className="amount">{points}</span>
            <span>积分</span>
          </div>
          <div className="balance-item">
            <span className="currency-icon">⭐</span>
            <span className="amount">{starcoin}</span>
            <span>星源币</span>
          </div>
        </div>

        {/* 投注控制 */}
        <div className="bet-controls">
          <div className="amount-control">
            <input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min="1" 
              max={betType === 'points' ? points : starcoin}
            />
            <span className="currency-label">{betType === 'points' ? '积分' : '星源币'}</span>
          </div>

          <div className="type-selector">
            <button 
              className={betType === 'points' ? 'active' : ''}
              onClick={() => setBetType('points')}
            >
              🏆 积分
            </button>
            <button 
              className={betType === 'starcoin' ? 'active' : ''}
              onClick={() => setBetType('starcoin')}
            >
              ⭐ 星源币
            </button>
          </div>

          <div className="choice-selector">
            <button 
              className={betChoice === 'turtle' ? 'active' : ''}
              onClick={() => setBetChoice('turtle')}
            >
              <span className="choice-icon">🐢</span>
              <span>选择乌龟</span>
            </button>
            <button 
              className={betChoice === 'rabbit' ? 'active' : ''}
              onClick={() => setBetChoice('rabbit')}
            >
              <span className="choice-icon">🐰</span>
              <span>选择兔子</span>
            </button>
          </div>

          <button 
            className="start-btn"
            onClick={startGame}
            disabled={isRacing}
          >
            {isRacing ? '游戏中...' : '开始赛跑'}
          </button>
        </div>

        {/* 预计收益 */}
        <div className="expected-return">
          <div className="return-item">
            <div className="label">预计可得</div>
            <div className="amount">{betAmount * 1.9}</div>
          </div>
          <div className="return-item">
            <div className="label">净收益</div>
            <div className="amount">{betAmount * 0.9}</div>
          </div>
        </div>

        {/* 功能按钮 */}
        <div className="action-buttons">
          <button onClick={() => setShowHistory(true)}>
            📜 历史记录
          </button>
          <button onClick={() => alert('游戏规则：选择乌龟或兔子，投入积分或星源币，猜中获得1.9倍奖励！')}>
            📖 游戏规则
          </button>
        </div>
      </div>

      {/* 赛跑动画弹窗 */}
      {showRaceModal && (
        <RaceModal
          isOpen={showRaceModal}
          onClose={() => setShowRaceModal(false)}
          betChoice={betChoice}
          betAmount={betAmount}
          betType={betType}
          onRaceComplete={handleRaceComplete}
        />
      )}

      {/* 结算弹窗 */}
      {renderSettlementModal()}

      {/* 历史记录弹窗 */}
      {showHistory && (
        <div className="history-modal">
          <div className="modal-content">
            <h3>游戏历史</h3>
            <div className="total-stats">
              <p>总投入: {totalStats.totalInvested}</p>
              <p>总盈利: {totalStats.totalProfit}</p>
              <p>总胜率: {totalStats.winRate}%</p>
            </div>
            <div className="history-list">
              {userHistory.map((record, index) => (
                <div key={index} className="history-item">
                  <span>第{userHistory.length - index}期</span>
                  <span>投入{record.betAmount}</span>
                  <span>获得{record.rewardAmount}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowHistory(false)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurtleRabbitRacePage;
