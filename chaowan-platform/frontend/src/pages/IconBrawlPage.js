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

// 图标组合概率配置
const COMBINATION_TYPES = {
  TRIPLE: { probability: 0.15, multiplier: 5 },      // 完全相同 5倍
  ALL_DIFFERENT: { probability: 0.30, multiplier: 2 }, // 完全不同 2倍
  PAIR: { probability: 0.55, multiplier: 1.5 }       // 两个相同 1.5倍
};

// 生成随机图标组合
const generateIconCombination = () => {
  const random = Math.random();
  const iconKeys = Object.keys(ICONS);
  
  if (random < COMBINATION_TYPES.TRIPLE.probability) {
    // 完全相同
    const icon = iconKeys[Math.floor(Math.random() * iconKeys.length)];
    return [icon, icon, icon];
  } else if (random < COMBINATION_TYPES.TRIPLE.probability + COMBINATION_TYPES.ALL_DIFFERENT.probability) {
    // 完全不同
    const shuffled = [...iconKeys].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  } else {
    // 两个相同
    const pairIcon = iconKeys[Math.floor(Math.random() * iconKeys.length)];
    const remainingIcons = iconKeys.filter(icon => icon !== pairIcon);
    const singleIcon = remainingIcons[Math.floor(Math.random() * remainingIcons.length)];
    return [pairIcon, pairIcon, singleIcon].sort(() => Math.random() - 0.5);
  }
};

// 判断组合类型
const getCombinationType = (icons) => {
  if (!icons || !Array.isArray(icons) || icons.length !== 3) {
    return { type: 'UNKNOWN', name: '未知', multiplier: 0 };
  }
  
  const [first, second, third] = icons;
  if (first === second && second === third) {
    return { type: 'TRIPLE', name: '三连', multiplier: COMBINATION_TYPES.TRIPLE.multiplier };
  }
  if (first !== second && second !== third && first !== third) {
    return { type: 'ALL_DIFFERENT', name: '全不同', multiplier: COMBINATION_TYPES.ALL_DIFFERENT.multiplier };
  }
  return { type: 'PAIR', name: '对子', multiplier: COMBINATION_TYPES.PAIR.multiplier };
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
  const [timeLeft, setTimeLeft] = useState(35);
  const [result, setResult] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [showResultModal, setShowResultModal] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [revealingIcons, setRevealingIcons] = useState([null, null, null]);
  const [gameHistory, setGameHistory] = useState([]);
  const [currentSessionNumber, setCurrentSessionNumber] = useState(1);
  const [currentGameIcons, setCurrentGameIcons] = useState([null, null, null]);
  const [quickBetAmount, setQuickBetAmount] = useState(10);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const effectsRef = useRef(null);
  const { user, updatePoints } = useUserData();

  // 初始化游戏历史（从localStorage读取）
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

  // 保存游戏历史到localStorage
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
    setResult(null);
    setShowResultModal(false);
    setShowBetPanel(false);
  };

  // 获取游戏状态
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await gameService.getCurrentGame();
        setGame(res.session);
        
        // 如果是新游戏，重置状态
        if (res.session && (!game || res.session.session_id !== game.session_id)) {
          startNewGame();
        }
        
        const allBets = {};
        const userBets = {};
        
        if (res.bets && Array.isArray(res.bets)) {
          res.bets.forEach(bet => {
            if (bet.icon_type) {
              allBets[bet.icon_type] = (allBets[bet.icon_type] || 0) + (bet.bet_amount || 0);
              if (bet.user_id === user?.id) {
                userBets[bet.icon_type] = (userBets[bet.icon_type] || 0) + (bet.bet_amount || 0);
              }
            }
          });
        }
        
        setBets(allBets);
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
      
      // 图标翻转时间点 - 使用预先生成的图标
      if (remaining <= 32 && remaining > 30 && revealingIcons[0] === null) {
        // 30-32秒：第一个图标翻转
        const newIcons = [...currentGameIcons];
        newIcons[0] = generateIconCombination()[0];
        setCurrentGameIcons(newIcons);
        setRevealingIcons(newIcons);
        effectsRef.current?.playCardReveal(0, newIcons[0]);
      } else if (remaining <= 34 && remaining > 32 && revealingIcons[1] === null) {
        // 32-34秒：第二个图标翻转
        const newIcons = [...currentGameIcons];
        newIcons[1] = generateIconCombination()[1];
        setCurrentGameIcons(newIcons);
        setRevealingIcons(newIcons);
        effectsRef.current?.playCardReveal(1, newIcons[1]);
      } else if (remaining <= 35 && remaining > 34 && revealingIcons[2] === null) {
        // 34-35秒：第三个图标翻转 + 结算
        const newIcons = [...currentGameIcons];
        newIcons[2] = generateIconCombination()[2];
        setCurrentGameIcons(newIcons);
        setRevealingIcons(newIcons);
        effectsRef.current?.playCardReveal(2, newIcons[2]);
        
        // 即时结算
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

  // 处理游戏结算
  const handleGameResult = async (icons) => {
    try {
      const combination = getCombinationType(icons);
      const winningIcons = [...new Set(icons)];
      
      // 计算用户输赢
      let totalWin = 0;
      let totalLoss = 0;
      
      if (myBets && typeof myBets === 'object') {
        Object.entries(myBets).forEach(([icon, amount]) => {
          if (winningIcons.includes(icon)) {
            totalWin += (amount || 0) * combination.multiplier;
          } else {
            totalLoss += (amount || 0);
          }
        });
      }
      
      const netResult = totalWin - totalLoss;
      
      // 更新用户积分
      if (netResult !== 0) {
        updatePoints(netResult);
        effectsRef.current?.showCurrencyAnimation(netResult);
        
        if (netResult > 0) {
          effectsRef.current?.showToast(`🎉 恭喜获胜！赢得 ${netResult} 积分`, 'success');
          effectsRef.current?.createParticles('win', window.innerWidth / 2, window.innerHeight / 2);
        } else {
          effectsRef.current?.showToast(`😔 很遗憾，损失 ${Math.abs(netResult)} 积分`, 'error');
        }
      }
      
      // 更新游戏历史 - 使用真实的局号
      const newHistoryItem = {
        sessionId: game?.session_id || `G${Date.now()}`,
        sessionNumber: currentSessionNumber,
        icons: icons,
        combination: combination,
        timestamp: new Date(),
        myBets: myBets || {},
        result: netResult
      };
      
      const updatedHistory = [newHistoryItem, ...gameHistory.slice(0, 9)];
      setGameHistory(updatedHistory);
      saveGameHistory(updatedHistory);
      setCurrentSessionNumber(currentSessionNumber + 1);
      
      // 显示结果弹窗
      setResult({
        ...game,
        result_icons: icons,
        combination: combination,
        netResult: netResult
      });
      setShowResultModal(true);
      
    } catch (error) {
      console.error('结算失败:', error);
    }
  };

  // 🔧 修改：单个图标下注处理
  const handleBet = async (icon) => {
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 25) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    const currentBet = (myBets && myBets[icon]) || 0;
    const amount = prompt(
      `下注积分 (${ICONS[icon]?.name || icon})\n当前下注: ${currentBet}\n可用积分: ${user?.points || 0}`,
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

    const totalCurrentBets = Object.values(myBets || {}).reduce((sum, amount) => sum + amount, 0);
    const totalAfterBet = totalCurrentBets - currentBet + betAmount;
    
    if (totalAfterBet > (user?.points || 0)) {
      effectsRef.current?.showToast('积分不足', 'error');
      return;
    }

    setIsPlacingBet(true);
    try {
      // 先更新本地状态，提升用户体验
      setMyBets(prev => ({ ...prev, [icon]: betAmount }));
      
      await gameService.placeBet({
        session_id: game?.session_id,
        bets: [{ icon, amount: betAmount }]
      });
      
      updatePoints(-(betAmount - currentBet));
      effectsRef.current?.showCurrencyAnimation(-(betAmount - currentBet));
      effectsRef.current?.showToast(`${ICONS[icon]?.name || icon} 下注成功！`, 'success');
    } catch (error) {
      // 回滚本地状态
      setMyBets(prev => ({ ...prev, [icon]: currentBet }));
      effectsRef.current?.showToast(error.response?.data?.error || '下注失败', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  };

  // 🔧 新增：快速下注处理
  const handleQuickBet = (icon, amount) => {
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 25) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    const currentBet = (myBets && myBets[icon]) || 0;
    const totalCurrentBets = Object.values(myBets || {}).reduce((sum, amount) => sum + amount, 0);
    const totalAfterBet = totalCurrentBets - currentBet + amount;
    
    if (totalAfterBet > (user?.points || 0)) {
      effectsRef.current?.showToast('积分不足', 'error');
      return;
    }

    setMyBets(prev => ({ ...prev, [icon]: currentBet + amount }));
  };

  // 🔧 新增：清除单个图标下注
  const clearBet = (icon) => {
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 25) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    setMyBets(prev => {
      const newBets = { ...prev };
      delete newBets[icon];
      return newBets;
    });
  };

  // 🔧 新增：提交所有下注
  const submitAllBets = async () => {
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 25) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    const bets = Object.entries(myBets || {})
      .filter(([icon, amount]) => amount > 0)
      .map(([icon, amount]) => ({ icon, amount }));

    if (bets.length === 0) {
      effectsRef.current?.showToast('请先选择要下注的图标', 'error');
      return;
    }

    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    
    if (totalBet > (user?.points || 0)) {
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
      setShowBetPanel(false);
    } catch (error) {
      effectsRef.current?.showToast(error.response?.data?.error || '下注失败', 'error');
    } finally {
      setIsPlacingBet(false);
    }
  };

  // 🔧 新增：清除所有下注
  const clearAllBets = () => {
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 25) {
      effectsRef.current?.showToast('下注时间已结束', 'error');
      return;
    }

    setMyBets({});
    effectsRef.current?.showToast('已清除所有下注', 'info');
  };

  const getStatusText = () => {
    if (!game) return '准备中...';
    if (timeLeft > 25) return '下注中';
    if (timeLeft > 30) return '锁定中';
    if (timeLeft > 0) return '开奖中';
    return '已结束';
  };

  const checkWin = () => {
    if (!result) return false;
    return (result.netResult || 0) > 0;
  };

  const getTotalMyBets = () => {
    return Object.values(myBets || {}).reduce((sum, amount) => sum + amount, 0);
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

      {/* 🔧 新增：下注信息面板 */}
      <div className="bet-info-panel" style={{ background: theme.cardBg }}>
        <div className="bet-summary">
          <div className="my-total-bet">
            我的下注: <span className="amount">{getTotalMyBets()}</span> 积分
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
              <h4>我的下注</h4>
              {Object.entries(myBets || {}).length > 0 ? (
                Object.entries(myBets).map(([icon, amount]) => (
                  <div key={icon} className="my-bet-item">
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
                <div className="no-bets">暂无下注</div>
              )}
            </div>

            <div className="bet-actions-panel">
              <button 
                className="submit-bets-btn"
                onClick={submitAllBets}
                disabled={isPlacingBet || getTotalMyBets() === 0}
              >
                {isPlacingBet ? '提交中...' : `确认下注 (${getTotalMyBets()}积分)`}
              </button>
              <button 
                className="clear-all-btn"
                onClick={clearAllBets}
                disabled={isPlacingBet || getTotalMyBets() === 0}
              >
                清除全部
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
              totalBet={(bets && bets[key]) || 0}
              myBet={(myBets && myBets[key]) || 0}
              disabled={game?.status !== 'betting' || isPlacingBet || timeLeft <= 25}
              onClick={() => handleBet(key)}
              onQuickBet={() => handleQuickBet(key, quickBetAmount)}
              theme={theme}
            />
          ))}
        </div>
      </div>

      {/* 侧边栏 - 包含历史记录 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        game={game}
        user={user}
        gameHistory={gameHistory}
        icons={ICONS}
      />

      {/* 结果弹窗 - 显示输赢 */}
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
          setShowBetPanel(false);
        }}
      />
    </div>
  );
}
