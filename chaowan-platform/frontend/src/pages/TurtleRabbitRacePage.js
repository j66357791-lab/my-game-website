// src/pages/TurtleRabbitRacePage.js
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
  const [betType, setBetType] = useState('turtle'); // 'turtle' or 'rabbit'
  const [raceHistory, setRaceHistory] = useState([]);
  const [isRacing, setIsRacing] = useState(false);
  const [raceResult, setRaceResult] = useState(null);
  const [showBetConfirm, setShowBetConfirm] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // 初始化历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem('raceHistory');
    if (savedHistory) {
      setRaceHistory(JSON.parse(savedHistory));
    }
  }, []);

  // 保存历史记录
  const saveRaceHistory = useCallback((newRecord) => {
    const updatedHistory = [newRecord, ...raceHistory].slice(0, 10);
    setRaceHistory(updatedHistory);
    localStorage.setItem('raceHistory', JSON.stringify(updatedHistory));
  }, [raceHistory]);

  // 开始游戏前的确认
  const confirmBet = useCallback(() => {
    const balance = betType === 'turtle' ? points : starcoin;
    const remaining = balance - betAmount;
    
    const confirmMessage = `您是否投入${betAmount} ${betType === 'turtle' ? '积分' : '星源币'}？\n您目前有${balance} ${betType === 'turtle' ? '积分' : '星源币'}，投入之后剩余${remaining} ${betType === 'turtle' ? '积分' : '星源币'}`;
    
    if (window.confirm(confirmMessage)) {
      setShowBetConfirm(false);
      startRace();
    }
  }, [betAmount, betType, points, starcoin]);

  // 开始游戏
  const startRace = useCallback(() => {
    if (betAmount < 1) {
      alert('投注金额最少为1');
      return;
    }

    // 检查余额
    const balance = betType === 'turtle' ? points : starcoin;
    if (balance < betAmount) {
      alert(`余额不足！需要 ${betAmount} ${betType === 'turtle' ? '积分' : '星源币'}`);
      return;
    }

    setIsRacing(true);
    setShowRaceModal(true);

    // 5-8秒后显示结果
    const raceDuration = 5000 + Math.random() * 3000;
    setTimeout(() => {
      const winner = Math.random() < 0.5 ? 'turtle' : 'rabbit';
      const result = {
        betType,
        betAmount,
        winner,
        timestamp: new Date().toISOString()
      };

      setRaceResult(result);
      saveRaceHistory(result);
      setIsRacing(false);
      setShowRaceModal(false);
      setShowSettlementModal(true);
    }, raceDuration);
  }, [betAmount, betType, points, starcoin, saveRaceHistory]);

  // 处理结算
  const handleSettlement = useCallback(() => {
    if (!raceResult) return;

    const { betType, betAmount, winner } = raceResult;
    const balance = betType === 'turtle' ? points : starcoin;
    
    if (winner === betType) {
      // 获胜
      const reward = Math.floor(betAmount * 1.9);
      const newBalance = balance + reward;
      
      updateUser({ 
        points: betType === 'turtle' ? newBalance : points,
        starcoin: betType === 'rabbit' ? newBalance : starcoin
      });
      
      refreshData({
        points: betType === 'turtle' ? newBalance : points,
        starcoin: betType === 'rabbit' ? newBalance : starcoin
      });
      
      alert(`恭喜您，您猜中了这把${winner === 'turtle' ? '乌龟' : '兔子'}胜利，恭喜您获得${reward} ${betType === 'turtle' ? '积分' : '星源币'}`);
    } else {
      // 失败
      const newBalance = balance - betAmount;
      
      updateUser({ 
        points: betType === 'turtle' ? newBalance : points,
        starcoin: betType === 'rabbit' ? newBalance : starcoin
      });
      
      refreshData({
        points: betType === 'turtle' ? newBalance : points,
        starcoin: betType === 'rabbit' ? newBalance : starcoin
      });
      
      alert(`别灰心，再来一次，很抱歉您这次损失了${betAmount} ${betType === 'turtle' ? '积分' : '星源币'}`);
    }

    setRaceResult(null);
    setShowSettlementModal(false);
  }, [raceResult, points, starcoin, updateUser, refreshData]);

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
            <div className="turtle-runner">🐢</div>
            <div className="rabbit-runner">🐰</div>
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
                max={betType === 'turtle' ? points : starcoin}
              />
              <span>{betType === 'turtle' ? '积分' : '星源币'}</span>
            </div>

            <div className="bet-type-selector">
              <button 
                className={`bet-type ${betType === 'turtle' ? 'active' : ''}`}
                onClick={() => setBetType('turtle')}
              >
                🐢 乌龟
              </button>
              <button 
                className={`bet-type ${betType === 'rabbit' ? 'active' : ''}`}
                onClick={() => setBetType('rabbit')}
              >
                🐰 兔子
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
              {betAmount * 1.9} {betType === 'turtle' ? '积分' : '星源币'}
            </span>
          </div>
          <div className="reward-item">
            <span>额外奖励</span>
            <span className="reward-amount">0</span>
          </div>
        </div>
      </div>

      {/* 投注确认弹窗 */}
      {showBetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>投注确认</h3>
            <div className="bet-confirm-info">
              <p>您是否投入 <strong>{betAmount}</strong> {betType === 'turtle' ? '积分' : '星源币'}？</p>
              <p>您目前有 <strong>{betType === 'turtle' ? points : starcoin}</strong> {betType === 'turtle' ? '积分' : '星源币'}</p>
              <p>投入之后剩余 <strong>{(betType === 'turtle' ? points : starcoin) - betAmount}</strong> {betType === 'turtle' ? '积分' : '星源币'}</p>
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
                    {raceResult.winner === betType ? '恭喜您，您猜中了这把' : '别灰心，再来一次，很抱歉您这次损失了'}
                    <strong>{raceResult.winner === 'turtle' ? '乌龟' : '兔子'}</strong>
                    {raceResult.winner === betType ? '胜利，恭喜您获得' : ''}
                    <strong>{raceResult.winner === betType ? Math.floor(raceResult.betAmount * 1.9) : raceResult.betAmount}</strong>
                    {raceResult.winner === betType ? '积分' : '积分'}
                  </p>
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
