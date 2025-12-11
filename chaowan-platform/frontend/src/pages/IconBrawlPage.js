// frontend/src/pages/IconBrawlPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './IconBrawlPage.css';
import gameService from '../services/gameService';
import { useUserData } from '../hooks/useUserData';
import Sidebar from '../components/IconBrawl/Sidebar';
import EffectsEngine from '../components/IconBrawl/EffectsEngine';
import ProgressBar from '../components/IconBrawl/ProgressBar';
import CountdownTimer from '../components/IconBrawl/CountdownTimer';
import BetButton from '../components/IconBrawl/BetButton';
import IconSlot from '../components/IconBrawl/IconSlot';
import ResultModal from '../components/IconBrawl/ResultModal';
import ThemeSelector from '../components/IconBrawl/ThemeSelector';

const ICONS = {
  heart: { symbol: '❤️', color: '#FF4757', name: '爱心' },
  burger: { symbol: '🍔', color: '#FFA502', name: '汉堡' },
  chest: { symbol: '🎁', color: '#FFD700', name: '宝箱' },
  cola: { symbol: '🥤', color: '#3498DB', name: '可乐' },
  car: { symbol: '🚗', color: '#2ECC71', name: '汽车' },
  fridge: { symbol: '🧊', color: '#74B9FF', name: '冰箱' }
};

const THEMES = {
  classic: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    primaryColor: '#667eea'
  },
  dark: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    cardBg: 'rgba(30, 30, 46, 0.95)',
    primaryColor: '#e94560'
  },
  ocean: {
    background: 'linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)',
    cardBg: 'rgba(255, 255, 255, 0.9)',
    primaryColor: '#0093E9'
  }
};

export default function IconBrawlPage() {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [bets, setBets] = useState({});
  const [myBets, setMyBets] = useState({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [result, setResult] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [showResultModal, setShowResultModal] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const effectsRef = useRef(null);
  const { user, updatePoints } = useUserData();

  // 获取游戏状态
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await gameService.getCurrentGame();
        setGame(res.session);
        
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
        
        if (res.session.status === 'finished' && res.session.result_icons) {
          setResult(res.session);
          setShowResultModal(true);
        }
      } catch (error) {
        console.error('获取游戏状态失败:', error);
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
    if (game?.status !== 'betting' || isPlacingBet) {
      return;
    }

    const currentBet = myBets[icon] || 0;
    const amount = prompt(
      `下注积分 (${ICONS[icon].name})\n当前下注: ${currentBet}\n可用积分: ${user.points}`,
      '10'
    );
    
    if (!amount || isNaN(amount) || amount < 10) {
      effectsRef.current?.showToast('最小下注10积分', 'error');
      return;
    }

    const betAmount = parseInt(amount);
    if (betAmount > 10000) {
      effectsRef.current?.showToast('单图标最大下注10000积分', 'error');
      return;
    }

    if (betAmount > user.points) {
      effectsRef.current?.showToast('积分不足', 'error');
      return;
    }

    setIsPlacingBet(true);
    try {
      await gameService.placeBet({
        session_id: game.session_id,
        bets: [{ icon, amount: betAmount }]
      });
      
      updatePoints(-betAmount);
      setMyBets(prev => ({ ...prev, [icon]: (prev[icon] || 0) + betAmount }));
      
      effectsRef.current?.showCurrencyAnimation(-betAmount);
      effectsRef.current?.showToast(`下注成功！${ICONS[icon].name} +${betAmount}`, 'success');
    } catch (error) {
      effectsRef.current?.showToast(error.response?.data?.error || '下注失败', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const getStatusText = () => {
    if (!game) return '准备中...';
    switch (game.status) {
      case 'betting': return `下注中`;
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

  const theme = THEMES[currentTheme];

  return (
    <div className="icon-brawl-container" style={{ background: theme.background }}>
      <EffectsEngine ref={effectsRef} />
      
      {/* 顶部区域 (20%) */}
      <div className="game-header" style={{ background: theme.cardBg }}>
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/game-center')}>
            ← 返回
          </button>
          <ThemeSelector currentTheme={currentTheme} onChange={setCurrentTheme} />
        </div>
        
        <div className="header-center">
          <div className="game-info">
            <span className="session-id">局号: {game?.session_id?.slice(-6) || '------'}</span>
            <CountdownTimer 
              timeLeft={timeLeft} 
              gameStatus={game?.status}
              onTimeWarning={(type) => effectsRef.current?.playSound(type)}
            />
          </div>
          <ProgressBar 
            progress={game?.status === 'betting' ? (25 - timeLeft) / 25 * 100 : 100}
            status={game?.status}
          />
        </div>
        
        <div className="header-right">
          <div className="pot-info">
            奖池: {game?.total_pot || 0}
          </div>
          <div className="user-points">
            积分: {user?.points || 0}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            📊
          </button>
        </div>
      </div>

      {/* 中央区域 (60%) - 3x2网格 */}
      <div className="game-board" style={{ background: theme.cardBg }}>
        <div className="status-text">{getStatusText()}</div>
        
        <div className="icon-grid">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <IconSlot
              key={i}
              index={i}
              game={game}
              result={result}
              onReveal={(icon) => effectsRef.current?.playCardReveal(i, icon)}
            />
          ))}
        </div>
      </div>

      {/* 底部区域 (20%) - 1x6按钮 */}
      <div className="betting-panel" style={{ background: theme.cardBg }}>
        <div className="bet-buttons-row">
          {Object.entries(ICONS).map(([key, icon]) => (
            <BetButton
              key={key}
              icon={icon}
              totalBet={bets[key] || 0}
              myBet={myBets[key] || 0}
              disabled={game?.status !== 'betting' || isPlacingBet}
              onClick={() => handleBet(key)}
              theme={theme}
            />
          ))}
        </div>
      </div>

      {/* 侧边栏 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        game={game}
        user={user}
      />

      {/* 结果弹窗 */}
      <ResultModal
        show={showResultModal}
        result={result}
        myBets={myBets}
        isWin={checkWin()}
        onClose={() => setShowResultModal(false)}
        onPlayAgain={() => {
          setShowResultModal(false);
          setResult(null);
        }}
      />
    </div>
  );
}
