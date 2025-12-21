// components/RaceModal/RaceModal.js - 完整代码
import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './RaceModal.css';

const RaceModal = () => {
  const [betType, setBetType] = useState('points');
  const [betAmount, setBetAmount] = useState(100);
  const [betChoice, setBetChoice] = useState('turtle');
  const [userBalance, setUserBalance] = useState({ points: 0, starcoin: 0 });
  const [recentRaces, setRecentRaces] = useState([]);
  const [winProbabilities, setWinProbabilities] = useState({
    turtle: 0,
    rabbit: 0
  });
  const [gameResult, setGameResult] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(false);

  // 获取用户余额
  const fetchUserBalance = async () => {
    try {
      const response = await api.getUser();
      if (response.success) {
        setUserBalance({
          points: response.data.user.points,
          starcoin: response.data.user.starcoin
        });
      }
    } catch (error) {
      console.error('❌ 获取用户余额失败:', error);
    }
  };

  // 获取赛跑统计
  const fetchRaceStats = async () => {
    try {
      const response = await api.get('/race/stats', { period: 100 });
      if (response.success) {
        setWinProbabilities({
          turtle: response.data.turtleWinRate,
          rabbit: response.data.rabbitWinRate
        });
      }
    } catch (error) {
      console.error('❌ 获取赛跑统计失败:', error);
      // 如果接口失败，使用本地计算
      fetchRaceData();
    }
  };

  // 获取赛跑数据
  const fetchRaceData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/race/history', { limit: 100 });
      const races = response.data?.data?.raceHistory || [];
      
      setRecentRaces(races);
      
      // 计算获胜概率
      const probabilities = calculateWinProbabilities(races);
      setWinProbabilities(probabilities);
      
      console.log('📊 获胜概率:', probabilities);
    } catch (error) {
      console.error('❌ 获取赛跑数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算获胜概率
  const calculateWinProbabilities = (races) => {
    const totalRaces = races.length;
    if (totalRaces === 0) {
      return { turtle: 0, rabbit: 0 };
    }

    const turtleWins = races.filter(race => race.winner === 'turtle').length;
    const rabbitWins = races.filter(race => race.winner === 'rabbit').length;

    return {
      turtle: ((turtleWins / totalRaces) * 100).toFixed(2),
      rabbit: ((rabbitWins / totalRaces) * 100).toFixed(2)
    };
  };

  // 游戏结束后自动刷新
  const handleGameEnd = (result) => {
    setGameResult(result);
    setAutoRefresh(true);
    
    // 2秒后自动刷新数据
    setTimeout(() => {
      fetchRaceStats();
      fetchUserBalance();
      setAutoRefresh(false);
      setGameResult(null);
    }, 2000);
  };

  // 开始游戏
  const startRaceGame = async () => {
    if (loading) return;
    
    const betData = {
      betType,
      betAmount,
      betChoice
    };

    try {
      setLoading(true);
      const response = await api.post('/race/start', betData);
      const result = response.data;
      
      if (result.success) {
        console.log('🎮 游戏结果:', result.data);
        handleGameEnd(result.data);
      } else {
        console.error('❌ 游戏失败:', result.message);
        alert(result.message || '游戏失败，请重试');
      }
    } catch (error) {
      console.error('❌ 游戏请求失败:', error);
      alert('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 渲染赛跑统计
  const renderRaceStats = () => {
    return (
      <div className="race-probabilities">
        <h3>📊 近100期赛跑统计</h3>
        <div className="probability-stats">
          <div className="probability-item">
            <div className="probability-label">🐢 乌龟获胜概率</div>
            <div className="probability-value">{winProbabilities.turtle}%</div>
          </div>
          <div className="probability-item">
            <div className="probability-label">🐰 兔子获胜概率</div>
            <div className="probability-value">{winProbabilities.rabbit}%</div>
          </div>
        </div>
        
        {autoRefresh && (
          <div className="refresh-indicator">
            🔄 正在刷新数据...
          </div>
        )}
      </div>
    );
  };

  // 渲染游戏结果
  const renderGameResult = () => {
    if (!gameResult) return null;
    
    return (
      <div className="game-result">
        <h3>🏁 游戏结果</h3>
        <div className="result-details">
          <div>胜者: {gameResult.winner === 'turtle' ? '🐢 乌龟' : '🐰 兔子'}</div>
          <div>你的选择: {gameResult.betChoice === 'turtle' ? '🐢 乌龟' : '🐰 兔子'}</div>
          <div className={`result-status ${gameResult.result === 'win' ? 'win' : 'lose'}`}>
            {gameResult.result === 'win' ? '✅ 恭喜获胜！' : '❌ 很遗憾，下次再试！'}
          </div>
          <div>投注金额: {gameResult.betAmount}</div>
          <div>奖励: {gameResult.rewardAmount}</div>
          <div>余额变化: {gameResult.balanceChange > 0 ? '+' : ''}{gameResult.balanceChange}</div>
        </div>
      </div>
    );
  };

  // 渲染投注界面
  const renderBetInterface = () => {
    return (
      <div className="bet-interface">
        <h3>🎮 龟兔赛跑</h3>
        
        <div className="balance-info">
          <div>积分: {userBalance.points}</div>
          <div>星源币: {userBalance.starcoin}</div>
        </div>

        <div className="bet-options">
          <div className="bet-type">
            <label>投注类型:</label>
            <select 
              value={betType} 
              onChange={(e) => setBetType(e.target.value)}
            >
              <option value="points">积分</option>
              <option value="starcoin">星源币</option>
            </select>
          </div>

          <div className="bet-amount">
            <label>投注金额:</label>
            <input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
              min="1"
              max={betType === 'points' ? userBalance.points : userBalance.starcoin}
            />
          </div>

          <div className="bet-choice">
            <label>选择:</label>
            <div className="choice-buttons">
              <button 
                className={`choice-btn ${betChoice === 'turtle' ? 'selected' : ''}`}
                onClick={() => setBetChoice('turtle')}
              >
                🐢 乌龟
              </button>
              <button 
                className={`choice-btn ${betChoice === 'rabbit' ? 'selected' : ''}`}
                onClick={() => setBetChoice('rabbit')}
              >
                🐰 兔子
              </button>
            </div>
          </div>

          <button 
            className="start-race-btn"
            onClick={startRaceGame}
            disabled={loading}
          >
            {loading ? '游戏中...' : '开始游戏'}
          </button>
        </div>
      </div>
    );
  };

  // 初始化数据
  useEffect(() => {
    fetchUserBalance();
    fetchRaceStats();
  }, []);

  return (
    <div className="race-game-container">
      {renderBetInterface()}
      {renderGameResult()}
      {renderRaceStats()}
    </div>
  );
};

export default RaceModal;
