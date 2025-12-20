// frontend/src/pages/TurtleRabbitRacePage.js - 完整修复版本
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import RaceModal from '../components/RaceModal/RaceModal';
import './TurtleRabbitRacePage.css';

const TurtleRabbitRacePage = () => {
  const navigate = useNavigate();
  const { 
    points, 
    starcoin, 
    loading, 
    error, 
    setError,
    updateUser,
    refreshData
  } = useUser();

  const [showRaceModal, setShowRaceModal] = useState(false);
  const [betAmount, setBetAmount] = useState(100);
  const [betType, setBetType] = useState('points');
  const [betChoice, setBetChoice] = useState('turtle');
  const [raceHistory, setRaceHistory] = useState([]);
  const [userRaceHistory, setUserRaceHistory] = useState([]);
  const [isRacing, setIsRacing] = useState(false);
  const [raceResult, setRaceResult] = useState(null);
  const [showBetConfirm, setShowBetConfirm] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  // 初始化数据
  useEffect(() => {
    // 从本地存储加载数据
    const savedRecentHistory = localStorage.getItem('raceRecentHistory');
    const savedUserHistory = localStorage.getItem('raceUserHistory');
    const savedStats = localStorage.getItem('raceStats');

    if (savedRecentHistory) {
      setRaceHistory(JSON.parse(savedRecentHistory));
    } else {
      // 生成模拟的近十期数据
      const mockRecent = Array.from({ length: 10 }, (_, i) => ({
        winner: Math.random() < 0.5 ? 'turtle' : 'rabbit',
        betAmount: Math.floor(Math.random() * 500) + 50,
        createdAt: new Date(Date.now() - (9 - i) * 60000).toISOString()
      }));
      setRaceHistory(mockRecent);
      localStorage.setItem('raceRecentHistory', JSON.stringify(mockRecent));
    }

    if (savedUserHistory) {
      const history = JSON.parse(savedUserHistory);
      setUserRaceHistory(history);
      
      // 计算统计数据
      const invested = history.reduce((sum, record) => sum + record.betAmount, 0);
      const profit = history.reduce((sum, record) => {
        return sum + (record.result === 'win' ? record.rewardAmount - record.betAmount : -record.betAmount);
      }, 0);
      
      setTotalInvested(invested);
      setTotalProfit(profit);
    }

    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setTotalInvested(stats.totalInvested || 0);
      setTotalProfit(stats.totalProfit || 0);
    }
  }, []);

  // 保存数据到本地存储
  const saveToLocalStorage = useCallback((newHistory, newStats) => {
    localStorage.setItem('raceUserHistory', JSON.stringify(newHistory));
    localStorage.setItem('raceStats', JSON.stringify(newStats));
  }, []);

  // 开始游戏前的确认
  const confirmBet = useCallback(() => {
    const balance = betType === 'points' ? points : starcoin;
    const remaining = balance - betAmount;
    
    const confirmMessage = `您是否投入${betAmount} ${betType === 'points' ? '积分' : '星源币'}？\n您目前有${balance} ${betType === 'points' ? '积分' : '星源币'}，投入之后剩余${remaining} ${betType === 'points' ? '积分' : '星源币'}`;
    
    if (window.confirm(confirmMessage)) {
      setShowBetConfirm(false);
      startRaceAnimation();
    }
  }, [betAmount, betType, points, starcoin]);

  // 开始赛跑动画
  const startRaceAnimation = useCallback(async () => {
    if (betAmount < 1) {
      alert('投注金额最少为1');
      return;
    }

    const balance = betType === 'points' ? points : starcoin;
    if (balance < betAmount) {
      alert(`余额不足！需要 ${betAmount} ${betType === 'points' ? '积分' : '星源币'}`);
      return;
    }

    setIsRacing(true);
    setShowRaceModal(true);
    setRaceResult(null);

    // 8秒后结算
    setTimeout(() => {
      // 随机决定胜者
      const winner = Math.random() < 0.5 ? 'turtle' : 'rabbit';
      const isWin = betChoice === winner;
      
      // 计算奖励
      const rewardAmount = isWin ? Math.floor(betAmount * 1.9) : 0;
      const profit = isWin ? rewardAmount - betAmount : -betAmount;
      
      // 创建游戏结果
      const result = {
        winner,
        result: isWin ? 'win' : 'lose',
        rewardAmount,
        newBalance: balance + (isWin ? rewardAmount - betAmount : -betAmount),
        betType,
        betAmount,
        betChoice
      };
      
      setRaceResult(result);
      setIsRacing(false);
      
      // 更新统计数据
      const newTotalInvested = totalInvested + betAmount;
      const newTotalProfit = totalProfit + profit;
      setTotalInvested(newTotalInvested);
      setTotalProfit(newTotalProfit);
      
      // 创建新的历史记录
      const newRecord = {
        ...result,
        createdAt: new Date().toISOString(),
        id: Date.now()
      };
      
      // 更新用户历史记录
      const newUserHistory = [newRecord, ...userRaceHistory];
      setUserRaceHistory(newUserHistory);
      
      // 更新全局历史记录
      const newRecentHistory = [{
        winner,
        betAmount,
        createdAt: new Date().toISOString()
      }, ...raceHistory.slice(0, 9)];
      setRaceHistory(newRecentHistory);
      
      // 保存到本地存储
      saveToLocalStorage(newUserHistory, {
        totalInvested: newTotalInvested,
        totalProfit: newTotalProfit
      });
      
      localStorage.setItem('raceRecentHistory', JSON.stringify(newRecentHistory));
      
      // 2秒后关闭动画弹窗，显示结算
      setTimeout(() => {
        setShowRaceModal(false);
        setShowSettlementModal(true);
      }, 2000);
      
    }, 8000);
  }, [betAmount, betType, betChoice, points, starcoin, totalInvested, totalProfit, userRaceHistory, raceHistory, saveToLocalStorage]);

  // 处理结算
  const handleSettlement = useCallback(() => {
    if (!raceResult) return;

    const { winner, result, rewardAmount, newBalance } = raceResult;
    
    if (result === 'win') {
      alert(`恭喜您，您猜中了这把${winner === 'turtle' ? '乌龟' : '兔子'}胜利，恭喜您获得${rewardAmount} ${betType === 'points' ? '积分' : '星源币'}`);
    } else {
      alert(`别灰心，再来一次，很抱歉您这次损失了${betAmount} ${betType === 'points' ? '积分' : '星源币'}`);
    }

    setRaceResult(null);
    setShowSettlementModal(false);
  }, [raceResult, betAmount, betType]);

  // 格式化日期时间
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}年${month}月${day}日${hours}:${minutes}`;
  };

  return (
    <div className="turtle-rabbit-race-page">
      {/* 游戏主界面 */}
      <div className="game-container">
        {/* 近十期记录 */}
        <div className="history-section">
          <h3>近十期赛跑结果</h3>
          <div className="history-grid">
            {raceHistory.map((record, index) => (
              <div key={index} className="history-item">
                <span>{record.winner === 'turtle' ? '🐢' : '🐰'}</span>
                <span>{record.betAmount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 游戏区域 */}
        <div className="race-area">
          <div className="race-track-preview">
            <div className="track-preview-line">
              <span className="track-label">🐢 乌龟</span>
              <div className="track-dots">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="track-dot" />
                ))}
              </div>
            </div>
            <div className="track-preview-line">
              <span className="track-label">🐰 兔子</span>
              <div className="track-dots">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="track-dot" />
                ))}
              </div>
            </div>
          </div>

          {/* 投注区域 */}
          <div className="betting-section">
            <div className="bet-amount">
              <input 
                type="number" 
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                min="1"
                max={betType === 'points' ? points : starcoin}
              />
              <span>{betType === 'points' ? '积分' : '星源币'}</span>
            </div>

            <div className="bet-type-selector">
              <button 
                className={`bet-type ${betType === 'points' ? 'active' : ''}`}
                onClick={() => setBetType('points')}
              >
                🏆 积分
              </button>
              <button 
                className={`bet-type ${betType === 'starcoin' ? 'active' : ''}`}
                onClick={() => setBetType('starcoin')}
              >
                ⭐ 星源币
              </button>
            </div>

            <div className="bet-choice-selector">
              <button 
                className={`bet-choice ${betChoice === 'turtle' ? 'active' : ''}`}
                onClick={() => setBetChoice('turtle')}
              >
                <div className="choice-icon">🐢</div>
                <div className="choice-text">选择乌龟</div>
              </button>
              <button 
                className={`bet-choice ${betChoice === 'rabbit' ? 'active' : ''}`}
                onClick={() => setBetChoice('rabbit')}
              >
                <div className="choice-icon">🐰</div>
                <div className="choice-text">选择兔子</div>
              </button>
            </div>

            <button 
              className="start-race-btn"
              onClick={() => setShowBetConfirm(true)}
              disabled={isRacing}
            >
              {isRacing ? '游戏中...' : '开始赛跑'}
            </button>
          </div>
        </div>

        {/* 奖励显示 */}
        <div className="reward-section">
          <div className="reward-item">
            <span>预计可得</span>
            <span className="reward-amount">
              {betAmount * 1.9} {betType === 'points' ? '积分' : '星源币'}
            </span>
          </div>
          <div className="reward-item">
            <span>额外奖励</span>
            <span className="reward-amount">0</span>
          </div>
        </div>
      </div>

      {/* 游戏历史记录 */}
      <div className="game-history-section">
        <h3>我的游戏历史</h3>
        
        {/* 统计数据 */}
        <div className="history-stats">
          <div className="stat-item">
            <span className="stat-label">总投入</span>
            <span className="stat-value">{totalInvested} 积分</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">累计盈亏</span>
            <span className={`stat-value ${totalProfit >= 0 ? 'profit' : 'loss'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit} 积分
            </span>
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="history-list">
          {userRaceHistory.length === 0 ? (
            <div className="no-history">暂无游戏记录</div>
          ) : (
            userRaceHistory.map((record, index) => (
              <div key={record.id || index} className="history-record">
                <div className="record-period">
                  第{String(userRaceHistory.length - index).padStart(3, '0')}期
                </div>
                <div className="record-time">
                  {formatDateTime(record.createdAt)}
                </div>
                <div className="record-result">
                  <span className="winner-icon">
                    {record.winner === 'turtle' ? '🐢' : '🐰'}
                  </span>
                  <span className="winner-text">
                    {record.winner === 'turtle' ? '乌龟' : '兔子'}胜利
                  </span>
                </div>
                <div className={`record-profit ${record.result === 'win' ? 'profit' : 'loss'}`}>
                  {record.result === 'win' ? '+' : '-'}
                  {record.result === 'win' ? record.rewardAmount - record.betAmount : record.betAmount}
                  {record.betType === 'points' ? '积分' : '星源币'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 投注确认弹窗 */}
      {showBetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>投注确认</h3>
            <div className="bet-confirm-info">
              <p>您是否投入 <strong>{betAmount}</strong> {betType === 'points' ? '积分' : '星源币'}？</p>
              <p>您目前有 <strong>{betType === 'points' ? points : starcoin}</strong> {betType === 'points' ? '积分' : '星源币'}</p>
              <p>投入之后剩余 <strong>{(betType === 'points' ? points : starcoin) - betAmount}</strong> {betType === 'points' ? '积分' : '星源币'}</p>
              <p>您选择 <strong>{betChoice === 'turtle' ? '乌龟' : '兔子'}</strong></p>
            </div>
            <div className="modal-actions">
              <button onClick={confirmBet}>确认投注</button>
              <button onClick={() => setShowBetConfirm(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 赛跑动画弹窗 */}
      {showRaceModal && (
        <RaceModal 
          turtleSpeed={0}
          rabbitSpeed={0}
          onClose={() => {}}
          raceResult={raceResult}
          betChoice={betChoice}
          isRacing={isRacing}
        />
      )}

      {/* 结算弹窗 */}
      {showSettlementModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>游戏结算</h3>
            <div className="settlement-info">
              {raceResult && (
                <>
                  <p>
                    {raceResult.result === 'win' ? '🎉 恭喜您，您猜中了这把' : '😔 别灰心，再来一次，很抱歉您这次损失了'}
                    <strong>{raceResult.winner === 'turtle' ? '乌龟' : '兔子'}</strong>
                    {raceResult.result === 'win' ? `胜利，恭喜您获得${raceResult.rewardAmount} ${betType === 'points' ? '积分' : '星源币'}` : ''}
                  </p>
                  <p>当前余额：<strong>{raceResult.newBalance}</strong> {betType === 'points' ? '积分' : '星源币'}</p>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={handleSettlement}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurtleRabbitRacePage;
