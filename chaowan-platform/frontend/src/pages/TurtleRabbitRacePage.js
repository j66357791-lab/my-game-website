// frontend/src/pages/TurtleRabbitRacePage.js - 改进版本
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
  const [turtleSpeed, setTurtleSpeed] = useState(0);
  const [rabbitSpeed, setRabbitSpeed] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  // 获取最近赛跑结果和用户历史
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
            return sum + (record.result === 'win' ? record.rewardAmount - record.betAmount : -record.betAmount);
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
    setTurtleSpeed(0);
    setRabbitSpeed(0);

    // 8秒动画时间
    const raceDuration = 8000;
    const startTime = Date.now();

    // 动画循环
    const animationInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / raceDuration, 1);

      // 基础速度
      let currentTurtleSpeed = 0.3 + Math.random() * 0.2;
      let currentRabbitSpeed = 0.4 + Math.random() * 0.2;

      // 在50%时间点随机加速
      if (progress > 0.5 && Math.random() < 0.5) {
        if (Math.random() < 0.5) {
          currentTurtleSpeed *= 2;
        } else {
          currentRabbitSpeed *= 2;
        }
      }

      setTurtleSpeed(prev => Math.min(prev + currentTurtleSpeed, 100));
      setRabbitSpeed(prev => Math.min(prev + currentRabbitSpeed, 100));

      if (turtleSpeed >= 100 || rabbitSpeed >= 100) {
        clearInterval(animationInterval);
      }
    }, 100);

    // 调用后端API开始游戏
    try {
      const response = await startRace({
        betType,
        betAmount,
        betChoice
      });

      if (response.success) {
        // 清除动画
        clearInterval(animationInterval);
        
        // 更新用户数据
        await refreshData();
        
        // 设置游戏结果
        setRaceResult({
          ...response.data,
          betType,
          betAmount,
          betChoice
        });
        
        setIsRacing(false);
        setShowRaceModal(false);
        setShowSettlementModal(true);
        
        // 更新统计数据
        setTotalInvested(prev => prev + betAmount);
        const profit = response.data.result === 'win' ? response.data.rewardAmount - betAmount : -betAmount;
        setTotalProfit(prev => prev + profit);
        
        // 更新用户历史记录
        const newRecord = {
          ...response.data,
          createdAt: new Date()
        };
        setUserRaceHistory(prev => [newRecord, ...prev]);
        
        // 更新全局历史记录
        const newHistory = [{
          winner: response.data.winner,
          betAmount,
          createdAt: new Date()
        }, ...raceHistory.slice(0, 9)];
        setRaceHistory(newHistory);
      }
    } catch (error) {
      clearInterval(animationInterval);
      setIsRacing(false);
      setShowRaceModal(false);
      
      if (error.message?.includes('API端点不存在')) {
        alert('后端服务未部署，请联系管理员部署race路由');
      } else {
        alert(error.message || '游戏失败，请重试');
      }
    }
  }, [betAmount, betType, betChoice, points, starcoin, refreshData, raceHistory, turtleSpeed, rabbitSpeed]);

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
          <div className="race-track">
            <div className="turtle-runner" style={{ left: `${turtleSpeed}%` }}>🐢</div>
            <div className="rabbit-runner" style={{ left: `${rabbitSpeed}%` }}>🐰</div>
            <div className="finish-line">🏁</div>
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
          {userRaceHistory.map((record, index) => (
            <div key={index} className="history-record">
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
          ))}
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
          raceResult={raceResult}
          onClose={() => {}}
          turtleSpeed={turtleSpeed}
          rabbitSpeed={rabbitSpeed}
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
                    {raceResult.result === 'win' ? '恭喜您，您猜中了这把' : '别灰心，再来一次，很抱歉您这次损失了'}
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
