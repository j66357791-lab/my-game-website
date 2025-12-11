// src/pages/IconBrawlPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './IconBrawlPage.css';
import gameService from '../services/gameService';
import { useUserData } from '../hooks/useUserData';

const ICONS = {
  heart: { symbol: '❤️', color: '#FF4757', name: '爱心' },
  burger: { symbol: '🍔', color: '#FFA502', name: '汉堡' },
  chest: { symbol: '🎁', color: '#FFD700', name: '宝箱' },
  cola: { symbol: '🥤', color: '#3498DB', name: '可乐' },
  car: { symbol: '🚗', color: '#2ECC71', name: '汽车' },
  fridge: { symbol: '🧊', color: '#74B9FF', name: '冰箱' }
};

export default function IconBrawlPage() {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [bets, setBets] = useState({});
  const [myBets, setMyBets] = useState({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [result, setResult] = useState(null);
  const { user, updatePoints } = useUserData();

  // 获取游戏状态
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await gameService.getCurrentGame();
        setGame(res.session);
        
        // 处理所有下注
        const allBets = {};
        const userBets = {};
        
        res.bets.forEach(bet => {
          allBets[bet.icon_type] = (allBets[bet.icon_type] || 0) + bet.bet_amount;
          if (bet.user_id === user.id) {
            userBets[bet.icon_type] = (userBets[bet.icon_type] || 0) + bet.bet_amount;
          }
        });
        
        setBets(allBets);
        setMyBets(userBets);
        
        // 如果游戏结束，显示结果
        if (res.session.status === 'finished' && res.session.result_icons) {
          setResult(res.session);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchGame();
    const interval = setInterval(fetchGame, 1000);
    return () => clearInterval(interval);
  }, [user.id]);

  // 倒计时
  useEffect(() => {
    if (!game || game.status !== 'betting') return;
    
    const timer = setInterval(() => {
      const elapsed = (Date.now() - new Date(game.start_time)) / 1000;
      const remaining = Math.max(0, 25 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 100);
    
    return () => clearInterval(timer);
  }, [game]);

  const handleBet = async (icon) => {
    if (game?.status !== 'betting') {
      alert('当前不在下注阶段');
      return;
    }

    const currentBet = myBets[icon] || 0;
    const amount = prompt(
      `下注积分 (${ICONS[icon].name})\n当前下注: ${currentBet}\n可用积分: ${user.points}`,
      '10'
    );
    
    if (!amount || isNaN(amount) || amount < 10) {
      alert('最小下注10积分');
      return;
    }

    const betAmount = parseInt(amount);
    if (betAmount > 10000) {
      alert('单图标最大下注10000积分');
      return;
    }

    if (betAmount > user.points) {
      alert('积分不足');
      return;
    }

    try {
      await gameService.placeBet({
        session_id: game.session_id,
        bets: [{ icon, amount: betAmount }]
      });
      updatePoints(-betAmount);
      setMyBets(prev => ({ ...prev, [icon]: (prev[icon] || 0) + betAmount }));
    } catch (error) {
      alert(error.response?.data?.error || '下注失败');
    }
  };

  const getStatusText = () => {
    if (!game) return '准备中...';
    switch (game.status) {
      case 'betting': return `下注中 (${timeLeft.toFixed(1)}秒)`;
      case 'locked': return '锁定中...';
      case 'revealing': return '开奖中...';
      case 'finished': return '已结束';
      default: return '准备中...';
    }
  };

  const checkWin = () => {
    if (!result) return false;
    const winningIcons = result.winning_icons || [];
    return Object.keys(myBets).some(icon => winningIcons.includes(icon));
  };

  return (
    <div className="icon-brawl-container">
      {/* 返回按钮 */}
      <button className="back-btn" onClick={() => navigate('/game-center')}>
        ← 返回游戏中心
      </button>

      {/* 顶部信息区 */}
      <div className="game-header">
        <div className="timer">
          <span className={`status-text ${timeLeft <= 5 ? 'warning' : ''}`}>
            {getStatusText()}
          </span>
        </div>
        <div className="pot-info">
          奖池: {game?.total_pot || 0} 积分
        </div>
        <div className="user-points">
          我的积分: {user?.points || 0}
        </div>
      </div>

      {/* 游戏主区域 */}
      <div className="game-board">
        <div className="icon-grid">
          {[0, 1, 2].map(i => (
            <div key={i} className="icon-slot">
              {game?.status === 'revealing' && game.result_icons?.[i] ? (
                <div className="revealed-icon">
                  {ICONS[game.result_icons[i]]?.symbol}
                </div>
              ) : game?.status === 'finished' && result?.result_icons?.[i] ? (
                <div className="revealed-icon">
                  {ICONS[result.result_icons[i]]?.symbol}
                </div>
              ) : (
                <div className="unrevealed-icon">?</div>
              )}
            </div>
          ))}
        </div>

        {/* 结果显示 */}
        {result && (
          <div className={`result-display ${checkWin() ? 'win' : 'lose'}`}>
            {checkWin() ? '🎉 恭喜获胜！' : '😔 很遗憾，再接再厉！'}
          </div>
        )}
      </div>

      {/* 下注区域 */}
      <div className="betting-panel">
        {Object.entries(ICONS).map(([key, icon]) => (
          <button
            key={key}
            className="bet-button"
            style={{ backgroundColor: icon.color }}
            onClick={() => handleBet(key)}
            disabled={game?.status !== 'betting'}
          >
            <div className="icon-symbol">{icon.symbol}</div>
            <div className="icon-name">{icon.name}</div>
            <div className="bet-amount">
              总下注: {bets[key] || 0}
            </div>
            <div className="my-bet">
              我: {myBets[key] || 0}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
