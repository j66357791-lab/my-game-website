// frontend/src/pages/TurtleRabbitRacePage.js - 修复版本
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { startRace, getRecentRaces, getRaceHistory } from '../services/raceService';
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

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取最近10次全局赛跑结果
        const recentResponse = await getRecentRaces();
        if (recentResponse.success) {
          setRaceHistory(recentResponse.data);
        }

        // 获取用户游戏历史
        const userHistoryResponse = await getRaceHistory({ limit: 50 });
        if (userHistoryResponse.success) {
          setUserRaceHistory(userHistoryResponse.data.raceHistory);
          
          // 计算统计数据
          const invested = userHistoryResponse.data.raceHistory.reduce((sum, record) => sum + record.betAmount, 0);
          const profit = userHistoryResponse.data.raceHistory.reduce((sum, record) => {
            return sum + record.balanceChange;
          }, 0);
          
          setTotalInvested(invested);
          setTotalProfit(profit);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
        // 如果API不可用，使用本地存储的历史记录
        const savedHistory = localStorage.getItem('raceHistory');
        if (savedHistory) {
          setRaceHistory(JSON.parse(savedHistory));
        }
      }
    };

    fetchData();
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

  // 🔧 修复：调用真实API开始游戏
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

    try {
      // 🔧 调用真实API
      const response = await startRace({
        betType,
        betAmount,
        betChoice
      });

      if (response.success) {
        // 🔧 修复：延长动画时间到12秒
        setTimeout(() => {
          setRaceResult(response.data);
          setIsRacing(false);
          
          // 更新统计数据
          const newTotalInvested = totalInvested + betAmount;
          const newTotalProfit = totalProfit + response.data.balanceChange;
          setTotalInvested(newTotalInvested);
          setTotalProfit(newTotalProfit);
          
          // 创建新的历史记录
          const newRecord = {
            ...response.data,
            createdAt: new Date().toISOString(),
            id: Date.now()
          };
          
          // 更新用户历史记录
          const newUserHistory = [newRecord, ...userRaceHistory];
          setUserRaceHistory(newUserHistory);
          
          // 更新全局历史记录
          const newRecentHistory = [{
            winner: response.data.winner,
            betAmount,
            createdAt: new Date().toISOString()
          }, ...raceHistory.slice(0, 9)];
          setRaceHistory(newRecentHistory);
          
          // 🔧 修复：使用async/await正确调用refreshData
          const refreshUserData = async () => {
            try {
              await refreshData();
            } catch (error) {
              console.error('刷新用户数据失败:', error);
            }
          };
          refreshUserData();
          
          // 2秒后关闭动画弹窗，显示结算
          setTimeout(() => {
            setShowRaceModal(false);
            setShowSettlementModal(true);
          }, 2000);
        }, 12000); // 🔧 延长到12秒
      }
    } catch (error) {
      console.error('游戏失败:', error);
      setIsRacing(false);
      setShowRaceModal(false);
      alert(error.message || '游戏失败，请重试');
    }
  }, [betAmount, betType, betChoice, points, starcoin, totalInvested, totalProfit, userRaceHistory, raceHistory, refreshData]);

  // 处理结算
  const handleSettlement = useCallback(() => {
    if (!raceResult) return;

    const { winner, result, rewardAmount, balanceChange, newBalance } = raceResult;
    
    if (result === 'win') {
      alert(`🎉 恭喜您，您猜中了这把${winner === 'turtle' ? '乌龟' : '兔子'}胜利！\n获得${rewardAmount} ${betType === 'points' ? '积分' : '星源币'}，净收益${balanceChange} ${betType === 'points' ? '积分' : '星源币'}`);
    } else {
      alert(`😔 很遗憾，您选择的${betChoice === 'turtle' ? '乌龟' : '兔子'}输了\n损失${Math.abs(balanceChange)} ${betType === 'points' ? '积分' : '星源币'}`);
    }

    setRaceResult(null);
    setShowSettlementModal(false);
  }, [raceResult, betAmount, betType, betChoice]);

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
            <span>净收益</span>
            <span className="reward-amount">
              {betAmount * 0.9} {betType === 'points' ? '积分' : '星源币'}
            </span>
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
                  {record.result === 'win' ? record.balanceChange : Math.abs(record.balanceChange)}
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
          onClose={() => {}}
          betChoice={betChoice}
          isRacing={isRacing}
          onRaceEnd={() => {}}
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
                    {raceResult.result === 'win' ? '🎉 恭喜您，您猜中了这把' : '😔 很遗憾，您这次输了'}
                    <strong>{raceResult.winner === 'turtle' ? '乌龟' : '兔子'}</strong>
                    {raceResult.result === 'win' ? `！\n获得${raceResult.rewardAmount} ${betType === 'points' ? '积分' : '星源币'}，净收益${raceResult.balanceChange} ${betType === 'points' ? '积分' : '星源币'}` : `！\n损失${Math.abs(raceResult.balanceChange)} ${betType === 'points' ? '积分' : '星源币'}`}
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
