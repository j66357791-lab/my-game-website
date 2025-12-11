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

// 生成随机图标组合
const generateIconCombination = () => {
  const iconKeys = Object.keys(ICONS);
  const result = [];
  
  for (let i = 0; i < 3; i++) {
    result.push(iconKeys[Math.floor(Math.random() * iconKeys.length)]);
  }
  
  return result;
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
  const [myBets, setMyBets] = useState({});
  const [pendingBets, setPendingBets] = useState({});
  const [timeLeft, setTimeLeft] = useState(35);
  const [result, setResult] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [showResultModal, setShowResultModal] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [revealingIcons, setRevealingIcons] = useState([null, null, null]);
  const [gameHistory, setGameHistory] = useState([]);
  const [currentSessionNumber, setCurrentSessionNumber] = useState(1);
  const [quickBetAmount, setQuickBetAmount] = useState(10);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [totalBets, setTotalBets] = useState({});
  const [currentGameIcons, setCurrentGameIcons] = useState([null, null, null]);
  const effectsRef = useRef(null);
  const { user, updatePoints, points: realPoints } = useUserData();

  // 初始化游戏历史
  useEffect(() => {
    const savedHistory = localStorage.getItem('iconBrawlHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setGameHistory(parsed);
        setCurrentSessionNumber(parsed.length + 1);
      } catch (error) {
        console.error('解析历史记录失败:', error);
      }
    }
  }, []);

  // 保存游戏历史
  const saveGameHistory = (history) => {
    try {
      localStorage.setItem('iconBrawlHistory', JSON.stringify(history));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  };

  // 开始新游戏时重置状态
  const startNewGame = () => {
    setRevealingIcons([null, null, null]);
    setCurrentGameIcons([null, null, null]);
    setMyBets({});
    setPendingBets({});
    setResult(null);
    setShowResultModal(false);
    setShowBetPanel(false);
    setTotalBets({});
  };

  // 获取显示积分（真实积分 - 待确认下注）
  const getDisplayPoints = () => {
    const pendingTotal = Object.values(pendingBets).reduce((sum, amount) => sum + amount, 0);
    return (realPoints || 0) - pendingTotal;
  };

  // 获取本局总下注（现在完全依赖后端数据）
  const getCurrentPot = () => {
    return Object.values(totalBets).reduce((sum, amount) => sum + amount, 0);
  };

  // 获取游戏状态
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await gameService.getCurrentGame();
        setGame(res.session);
        
        if (res.session && (!game || res.session.session_id !== game.session_id)) {
          startNewGame();
        }
        
        const allBets = res.bets || [];
        const updatedTotalBets = {};
        const userBets = {};
        
        allBets.forEach(bet => {
          updatedTotalBets[bet.icon_type] = (updatedTotalBets[bet.icon_type] || 0) + (bet.bet_amount || 0);
          if (bet.user_id === user?.id) {
            userBets[bet.icon_type] = (userBets[bet.icon_type] || 0) + (bet.bet_amount || 0);
          }
        });
        
        setTotalBets(updatedTotalBets);
        setMyBets(userBets);
        
        if (res.session?.status === 'finished' && res.session?.result_icons) {
          setResult(res.session);
          setRevealingIcons(res.session.result_icons);
          setCurrentGameIcons(res.session.result_icons);
          setShowResultModal(true);
        }
      } catch (error) {
        console.error('获取游戏状态失败:', error);
      }
    };

    fetchGame();
    const interval = setInterval(fetchGame, 1000);
    return () => clearInterval(interval);
  }, [user?.id, game?.session_id]);

  // 35秒游戏流程倒计时
  useEffect(() => {
    if (!game || game.status === 'finished') return;
    
    const timer = setInterval(() => {
      const elapsed = (Date.now() - new Date(game.start_time)) / 1000;
      const remaining = Math.max(0, 35 - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 32 && remaining > 30 && revealingIcons[0] === null) {
        const newIcons = [...currentGameIcons];
        newIcons[0] = generateIconCombination()[0];
        setCurrentGameIcons(newIcons);
        setRevealingIcons(newIcons);
        effectsRef.current?.playCardReveal(0, newIcons[0]);
      } else if (remaining <= 34 && remaining > 32 && revealingIcons[1] === null) {
        const newIcons = [...currentGameIcons];
        newIcons[1] = generateIconCombination()[1];
        setCurrentGameIcons(newIcons);
        setRevealingIcons(newIcons);
        effectsRef.current?.playCardReveal(1, newIcons[1]);
      } else if (remaining <= 35 && remaining > 34 && revealingIcons[2] === null) {
        const newIcons = [...currentGameIcons];
        newIcons[2] = generateIconCombination()[2];
        setCurrentGameIcons(newIcons);
        setRevealingIcons(newIcons);
        effectsRef.current?.playCardReveal(2, newIcons[2]);
        
        setTimeout(() => {
          handleGameResult(newIcons);
        }, 500);
      }
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 100);
    
    return () => clearInterval(timer);
  }, [game, revealingIcons, currentGameIcons]);

  // 修改：正确的结算机制
  const handleGameResult = async (icons) => {
    try {
      const winningIcons = [...new Set(icons)];
      const allParticipantBets = { ...totalBets };
      
      let totalLosingBets = 0;
      Object.entries(allParticipantBets).forEach(([icon, amount]) => {
        if (!winningIcons.includes(icon)) {
          totalLosingBets += amount;
        }
      });
      
      let totalWinningBets = 0;
      Object.entries(allParticipantBets).forEach(([icon, amount]) => {
        if (winningIcons.includes(icon)) {
          totalWinningBets += amount;
        }
      });
      
      let userNetResult = 0;
      
      Object.entries(myBets).forEach(([icon, amount]) => {
        if (winningIcons.includes(icon)) {
          const userShareInWinning = amount / totalWinningBets;
          const userReward = totalLosingBets * userShareInWinning;
          userNetResult += userReward;
        } else {
          userNetResult -= amount;
        }
      });
      
      if (userNetResult !== 0) {
        updatePoints(userNetResult);
        effectsRef.current?.showCurrencyAnimation(userNetResult);
        
        if (userNetResult > 0) {
          effectsRef.current?.showToast(`🎉 恭喜获胜！赢得 ${userNetResult} 积分`, 'success');
          effectsRef.current?.createParticles('win', window.innerWidth / 2, window.innerHeight / 2);
        } else {
          effectsRef.current?.showToast(`😔 很遗憾，损失 ${Math.abs(userNetResult)} 积分`, 'error');
        }
      }
      
      const newHistoryItem = {
        sessionId: game?.session_id || `G${Date.now()}`,
        sessionNumber: currentSessionNumber,
        icons: icons,
        timestamp: new Date(),
        myBets: myBets || {},
        result: userNetResult,
        totalPlayers: 101,
        totalPot: getCurrentPot(),
        winningIcons: winningIcons,
        totalLosingBets,
        totalWinningBets
      };
      
      const updatedHistory = [newHistoryItem, ...gameHistory.slice(0, 9)];
      setGameHistory(updatedHistory);
      saveGameHistory(updatedHistory);
      setCurrentSessionNumber(currentSessionNumber + 1);
      
      setResult({
        ...game,
        result_icons: icons,
        netResult: userNetResult,
        totalLosingBets,
        totalWinningBets,
        winningIcons: winningIcons
      });
      setShowResultModal(true);
      
    } catch (error) {
      console.error('结算失败:', error);
    }
  };

  // 下注处理
  const handleBet = async (icon) => {
    // 🔧 修复：将 25 改为 10
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 10) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    const currentBet = (pendingBets && pendingBets[icon]) || 0;
    const amount = prompt(
      `下注积分 (${ICONS[icon]?.name || icon})\n当前下注: ${currentBet}\n可用积分: ${getDisplayPoints()}`,
      quickBetAmount.toString()
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

    if (betAmount > getDisplayPoints()) {
      effectsRef.current?.showToast('积分不足', 'error');
      return;
    }

    setPendingBets(prev => ({ ...prev, [icon]: (prev[icon] || 0) + betAmount }));
    setTotalBets(prev => ({ ...prev, [icon]: (prev[icon] || 0) + betAmount }));
    
    effectsRef.current?.showToast(`${ICONS[icon]?.name || icon} 已添加到待确认下注`, 'info');
  };

  // 快速下注
  const handleQuickBet = (icon, amount) => {
    // 🔧 修复：将 25 改为 10
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 10) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    const currentBet = (pendingBets && pendingBets[icon]) || 0;
    const totalAfterBet = currentBet + amount;
    
    if (totalAfterBet > getDisplayPoints()) {
      effectsRef.current?.showToast('积分不足', 'error');
      return;
    }

    setPendingBets(prev => ({ ...prev, [icon]: totalAfterBet }));
    setTotalBets(prev => ({ ...prev, [icon]: (prev[icon] || 0) + amount }));
  };

  // 清除单个图标下注
  const clearBet = (icon) => {
    // 🔧 修复：将 25 改为 10
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 10) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    const betAmount = pendingBets[icon] || 0;
    
    setPendingBets(prev => {
      const newBets = { ...prev };
      delete newBets[icon];
      return newBets;
    });
    
    setTotalBets(prev => ({ ...prev, [icon]: (prev[icon] || 0) - betAmount }));
    
    effectsRef.current?.showToast(`已清除 ${ICONS[icon]?.name || icon} 的待确认下注`, 'info');
  };

  // 提交所有下注
  const submitAllBets = async () => {
    // 🔧 修复：将 25 改为 10
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 10) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    const bets = Object.entries(pendingBets || {})
      .filter(([icon, amount]) => amount > 0)
      .map(([icon, amount]) => ({ icon, amount }));

    if (bets.length === 0) {
      effectsRef.current?.showToast('请先选择要下注的图标', 'error');
      return;
    }

    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    
    if (totalBet > (realPoints || 0)) {
      effectsRef.current?.showToast('积分不足', 'error');
      return;
    }

    setIsPlacingBet(true);
    try {
      await gameService.placeBet({
        session_id: game?.session_id,
        bets: bets
      });
      
      updatePoints(-totalBet);
      effectsRef.current?.showCurrencyAnimation(-totalBet);
      effectsRef.current?.showToast(`下注成功！总下注 ${totalBet} 积分`, 'success');
      
      setMyBets(pendingBets);
      setPendingBets({});
      setShowBetPanel(false);
    } catch (error) {
      bets.forEach(({ icon, amount }) => {
        setTotalBets(prev => ({ ...prev, [icon]: (prev[icon] || 0) - amount }));
      });
      effectsRef.current?.showToast(error.response?.data?.error || '下注失败', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  };

  // 清除所有下注
  const clearAllBets = () => {
    // 🔧 修复：将 25 改为 10
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 10) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    Object.entries(pendingBets).forEach(([icon, amount]) => {
      setTotalBets(prev => ({ ...prev, [icon]: (prev[icon] || 0) - amount }));
    });

    setPendingBets({});
    effectsRef.current?.showToast('已清除所有待确认下注', 'info');
  };

  const getStatusText = () => {
    if (!game) return '准备中...';
    if (timeLeft > 10) return '下注中'; // 🔧 修复：将 25 改为 10
    if (timeLeft > 5) return '锁定中'; // 🔧 修复：将 30 改为 5 (35-30=5)
    if (timeLeft > 0) return '开奖中';
    return '已结束';
  };

  const checkWin = () => {
    if (!result) return false;
    return (result.netResult || 0) > 0;
  };

  const getTotalBets = () => {
    const confirmedTotal = Object.values(myBets).reduce((sum, amount) => sum + amount, 0);
    const pendingTotal = Object.values(pendingBets).reduce((sum, amount) => sum + amount, 0);
    return confirmedTotal + pendingTotal;
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
            <span className="session-id">
              第{String(currentSessionNumber).padStart(6, '0')}期
            </span>
            <CountdownTimer 
              timeLeft={timeLeft} 
              gameStatus={game?.status}
              onTimeWarning={(type) => effectsRef.current?.playSound(type)}
            />
          </div>
          <ProgressBar 
            progress={game?.status === 'betting' ? (35 - timeLeft) / 35 * 100 : 100}
            status={game?.status}
          />
        </div>
        
        <div className="header-right">
          <div className="pot-info">
            奖池: {getCurrentPot()}
          </div>
          <div className="user-points">
            积分: {getDisplayPoints()}
            {Object.keys(pendingBets).length > 0 && (
              <span className="pending-indicator">
                ({Object.values(pendingBets).reduce((sum, amount) => sum + amount, 0)}待确认)
              </span>
            )}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            📊
          </button>
        </div>
      </div>

      {/* 中央区域 (60%) - 1x3网格 */}
      <div className="game-board" style={{ background: theme.cardBg }}>
        <div className="status-text">{getStatusText()}</div>
        
        <div className="icon-grid">
          {[0, 1, 2].map(i => (
            <IconSlot
              key={i}
              index={i}
              icon={revealingIcons[i]}
              game={game}
              result={result}
              onReveal={(icon) => effectsRef.current?.playCardReveal(i, icon)}
            />
          ))}
        </div>
      </div>

      {/* 下注信息面板 */}
      <div className="bet-info-panel" style={{ background: theme.cardBg }}>
        <div className="bet-summary">
          <div className="my-total-bet">
            我的下注: <span className="amount">{getTotalBets()}</span> 积分
            {Object.keys(pendingBets).length > 0 && (
              <span className="pending-amount">
                (待确认: {Object.values(pendingBets).reduce((sum, amount) => sum + amount, 0)})
              </span>
            )}
          </div>
          <button 
            className="bet-panel-toggle"
            onClick={() => setShowBetPanel(!showBetPanel)}
          >
            {showBetPanel ? '收起' : '展开'} 下注面板
          </button>
        </div>

        {showBetPanel && (
          <div className="bet-details">
            <div className="quick-bet-section">
              <h4>快速下注</h4>
              <div className="quick-bet-amounts">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    className={`quick-amount-btn ${quickBetAmount === amount ? 'active' : ''}`}
                    onClick={() => setQuickBetAmount(amount)}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-bets-list">
              <h4>已确认下注</h4>
              {Object.entries(myBets || {}).length > 0 ? (
                Object.entries(myBets).map(([icon, amount]) => (
                  <div key={icon} className="my-bet-item confirmed">
                    <span className="bet-icon">{ICONS[icon]?.symbol}</span>
                    <span className="bet-name">{ICONS[icon]?.name}</span>
                    <span className="bet-amount">{amount}</span>
                  </div>
                ))
              ) : (
                <div className="no-bets">暂无已确认下注</div>
              )}
            </div>

            <div className="my-bets-list">
              <h4>待确认下注</h4>
              {Object.entries(pendingBets || {}).length > 0 ? (
                Object.entries(pendingBets).map(([icon, amount]) => (
                  <div key={icon} className="my-bet-item pending">
                    <span className="bet-icon">{ICONS[icon]?.symbol}</span>
                    <span className="bet-name">{ICONS[icon]?.name}</span>
                    <span className="bet-amount">{amount}</span>
                    <div className="bet-actions">
                      <button 
                        className="quick-add-btn"
                        onClick={() => handleQuickBet(icon, quickBetAmount)}
                      >
                        +{quickBetAmount}
                      </button>
                      <button 
                        className="clear-bet-btn"
                        onClick={() => clearBet(icon)}
                      >
                        清除
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-bets">暂无待确认下注</div>
              )}
            </div>

            <div className="bet-actions-panel">
              <button 
                className="submit-bets-btn"
                onClick={submitAllBets}
                disabled={isPlacingBet || Object.keys(pendingBets).length === 0}
              >
                {isPlacingBet ? '提交中...' : `确认下注 (${Object.values(pendingBets).reduce((sum, amount) => sum + amount, 0)}积分)`}
              </button>
              <button 
                className="clear-all-btn"
                onClick={clearAllBets}
                disabled={isPlacingBet || Object.keys(pendingBets).length === 0}
              >
                清除待确认
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部区域 (20%) - 1x6按钮 */}
      <div className="betting-panel" style={{ background: theme.cardBg }}>
        <div className="bet-buttons-row">
          {Object.entries(ICONS).map(([key, icon]) => (
            <BetButton
              key={key}
              icon={icon}
              totalBet={(totalBets && totalBets[key]) || 0}
              myBet={(myBets && myBets[key]) || 0}
              pendingBet={(pendingBets && pendingBets[key]) || 0}
              // 🔧 修复：将 25 改为 10
              disabled={game?.status !== 'betting' || isPlacingBet || timeLeft <= 10}
              onClick={() => handleBet(key)}
              onQuickBet={() => handleQuickBet(key, quickBetAmount)}
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
        gameHistory={gameHistory}
        icons={ICONS}
      />

      {/* 结果弹窗 */}
      <ResultModal
        show={showResultModal}
        result={result}
        myBets={myBets || {}}
        isWin={checkWin()}
        onClose={() => setShowResultModal(false)}
        onPlayAgain={() => {
          setShowResultModal(false);
          setResult(null);
          setRevealingIcons([null, null, null]);
          setCurrentGameIcons([null, null, null]);
          setMyBets({});
          setPendingBets({});
          setShowBetPanel(false);
        }}
      />
    </div>
  );
}
