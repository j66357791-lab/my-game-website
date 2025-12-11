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

// 🔧 图标组合概率配置
const COMBINATION_TYPES = {
  TRIPLE: { probability: 0.15, multiplier: 5 },      // 完全相同 5倍
  ALL_DIFFERENT: { probability: 0.30, multiplier: 2 }, // 完全不同 2倍
  PAIR: { probability: 0.55, multiplier: 1.5 }       // 两个相同 1.5倍
};

// 🔧 生成随机图标组合
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

// 🔧 判断组合类型
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
  const effectsRef = useRef(null);
  const { user, updatePoints } = useUserData();

  // 获取游戏状态
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await gameService.getCurrentGame();
        setGame(res.session);
        
        // 🔧 添加空值检查
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
          setShowResultModal(true);
        }
      } catch (error) {
        console.error('获取游戏状态失败:', error);
      }
    };

    fetchGame();
    const interval = setInterval(fetchGame, 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // 🔧 修复：35秒游戏流程倒计时
  useEffect(() => {
    if (!game || game.status === 'finished') return;
    
    const timer = setInterval(() => {
      const elapsed = (Date.now() - new Date(game.start_time)) / 1000;
      const remaining = Math.max(0, 35 - elapsed);
      setTimeLeft(remaining);
      
      // 🔧 图标翻转时间点
      if (remaining <= 32 && remaining > 30 && revealingIcons[0] === null) {
        // 30-32秒：第一个图标翻转
        const icons = generateIconCombination();
        setRevealingIcons([icons[0], null, null]);
        effectsRef.current?.playCardReveal(0, icons[0]);
      } else if (remaining <= 34 && remaining > 32 && revealingIcons[1] === null) {
        // 32-34秒：第二个图标翻转
        const icons = generateIconCombination();
        setRevealingIcons([revealingIcons[0], icons[1], null]);
        effectsRef.current?.playCardReveal(1, icons[1]);
      } else if (remaining <= 35 && remaining > 34 && revealingIcons[2] === null) {
        // 34-35秒：第三个图标翻转 + 结算
        const icons = generateIconCombination();
        const finalIcons = [revealingIcons[0], revealingIcons[1], icons[2]];
        setRevealingIcons(finalIcons);
        effectsRef.current?.playCardReveal(2, icons[2]);
        
        // 即时结算
        setTimeout(() => {
          handleGameResult(finalIcons);
        }, 500);
      }
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 100);
    
    return () => clearInterval(timer);
  }, [game, revealingIcons]);

  // 🔧 处理游戏结算
  const handleGameResult = async (icons) => {
    try {
      const combination = getCombinationType(icons);
      const winningIcons = [...new Set(icons)];
      
      // 计算用户输赢
      let totalWin = 0;
      let totalLoss = 0;
      
      // 🔧 添加空值检查
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
      
      // 更新游戏历史
      const newHistoryItem = {
        sessionId: game?.session_id || 'unknown',
        icons: icons,
        combination: combination,
        timestamp: new Date(),
        myBets: myBets || {},
        result: netResult
      };
      
      setGameHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]); // 保留最近10期
      
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

  const handleBet = async (icon) => {
    if (game?.status !== 'betting' || isPlacingBet || timeLeft <= 25) {
      return;
    }

    const currentBet = (myBets && myBets[icon]) || 0;
    const amount = prompt(
      `下注积分 (${ICONS[icon]?.name || icon})\n当前下注: ${currentBet}\n可用积分: ${user?.points || 0}`,
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

    if (betAmount > (user?.points || 0)) {
      effectsRef.current?.showToast('积分不足', 'error');
      return;
    }

    setIsPlacingBet(true);
    try {
      await gameService.placeBet({
        session_id: game?.session_id,
        bets: [{ icon, amount: betAmount }]
      });
      
      updatePoints(-betAmount);
      setMyBets(prev => ({ ...prev, [icon]: ((prev && prev[icon]) || 0) + betAmount }));
      
      effectsRef.current?.showCurrencyAnimation(-betAmount);
      effectsRef.current?.showToast(`下注成功！${ICONS[icon]?.name || icon} +${betAmount}`, 'success');
    } catch (error) {
      effectsRef.current?.showToast(error.response?.data?.error || '下注失败', 'error');
    } finally {
      setIsPlacingBet(false);
    }
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
              {/* 🔧 局号格式：000001开始递增 */}
              第{String(game?.session_number || 1).padStart(6, '0')}期
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

      {/* 🔧 中央区域 (60%) - 1x3网格 */}
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
              theme={theme}
            />
          ))}
        </div>
      </div>

      {/* 🔧 侧边栏 - 包含历史记录 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        game={game}
        user={user}
        gameHistory={gameHistory || []}
        icons={ICONS}
      />

      {/* 🔧 结果弹窗 - 显示输赢 */}
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
          setMyBets({});
        }}
      />
    </div>
  );
}
