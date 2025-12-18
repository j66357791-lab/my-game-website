// src/pages/DollCenterPage.js - 修复货币体系
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './DollCenterPage.css';

const DollCenterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bossData, setBossData] = useState(null);
  const [vipData, setVipData] = useState(null);
  const [synthesisData, setSynthesisData] = useState(null);
  
  const { 
    points,           // 积分 - 主要货币
    starcoin,         // 星源币 - 抽取娃娃专用
    dolls, 
    user,
    refreshData,
    fetchUserDolls
  } = useUser();

  // 功能模块配置
  const featureModules = [
    {
      id: 'backpack',
      name: '娃娃背包',
      icon: '🎒',
      desc: '管理你的娃娃军团',
      color: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      action: () => handleModuleClick('backpack')
    },
    {
      id: 'boss',
      name: 'Boss挑战',
      icon: '⚔️',
      desc: '击败Boss赢取大奖',
      color: '#ff6b6b',
      gradient: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
      action: () => handleModuleClick('boss')
    },
    {
      id: 'synthesis',
      name: '合成工坊',
      icon: '🔨',
      desc: '升级娃娃提升战力',
      color: '#4ecdc4',
      gradient: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
      action: () => handleModuleClick('synthesis')
    },
    {
      id: 'vip',
      name: 'VIP特权',
      icon: '💎',
      desc: '积分购买，领取星源币',
      color: '#f39c12',
      gradient: 'linear-gradient(135deg, #f39c12, #e67e22)',
      action: () => handleModuleClick('vip')
    },
    {
      id: 'gacha',
      name: '幸运抽取',
      icon: '🎲',
      desc: '星源币抽取娃娃',
      color: '#e74c3c',
      gradient: 'linear-gradient(135deg, #e74c3c, #c0392b)',
      action: () => handleModuleClick('gacha')
    },
    {
      id: 'production',
      name: '产出管理',
      icon: '📊',
      desc: '查看收益统计',
      color: '#27ae60',
      gradient: 'linear-gradient(135deg, #27ae60, #229954)',
      action: () => handleModuleClick('production')
    }
  ];

  // 处理模块点击
  const handleModuleClick = (moduleId) => {
    console.log('点击模块:', moduleId);
    setActiveTab(moduleId);
  };

  // 加载Boss数据
  const loadBossData = useCallback(() => {
    setBossData({
      name: '千羽',
      level: 1,
      currentHp: 85430,
      maxHp: 100000,
      participants: 1234,
      rewardPool: 8888,
      remainingTime: '2小时',
      lastKiller: null,
      skills: [
        { icon: '🔥', name: '烈焰冲击', description: '造成大量火焰伤害' },
        { icon: '❄️', name: '冰霜护盾', description: '提升防御力' },
        { icon: '⚡', name: '雷电风暴', description: '范围攻击' }
      ],
      recentChallenges: [
        { playerName: '玩家123', damage: 1250, time: '2分钟前' },
        { playerName: '游戏王', damage: 980, time: '5分钟前' },
        { playerName: '新手村', damage: 750, time: '8分钟前' }
      ]
    });
  }, []);

  // 加载VIP数据
  const loadVipData = useCallback(() => {
    setVipData({
      isActive: false,
      remainingDays: 0,
      dailyStarcoin: 66,  // VIP每日可领取的星源币
      outputMultiplier: 1.2,
      canClaimDaily: false
    });
  }, []);

  // 加载合成数据
  const loadSynthesisData = useCallback(() => {
    setSynthesisData({
      availableMaterials: [],
      recipes: []
    });
  }, []);

  useEffect(() => {
    if (activeTab !== 'home') {
      loadBossData();
      loadVipData();
      loadSynthesisData();
    }
  }, [activeTab, loadBossData, loadVipData, loadSynthesisData]);

  // 计算数据
  const deployedDolls = useMemo(() => {
    return dolls.filter(doll => doll.status === 'active');
  }, [dolls]);

  const availableDolls = useMemo(() => {
    return dolls.filter(doll => doll.status !== 'active');
  }, [dolls]);

  const todayTotalOutput = useMemo(() => {
    return deployedDolls.reduce((sum, doll) => sum + (parseFloat(doll.output || 0) || 0), 0);
  }, [deployedDolls]);

  // VIP购买处理 - 使用积分
  const handleVipPurchase = async (cardType) => {
    const cardPrices = {
      monthly: 1980,    // 积分
      quarterly: 5666,  // 积分
      yearly: 20999     // 积分
    };

    const price = cardPrices[cardType];
    
    if (points < price) {
      setError(`积分不足！需要${price}积分`);
      return;
    }

    try {
      setLoading(true);
      
      // 模拟购买成功
      setTimeout(() => {
        alert(`购买成功！获得${cardType === 'monthly' ? '30' : cardType === 'quarterly' ? '90' : '360'}天VIP特权`);
        // 扣除积分
        refreshData({ points: points - price });
        loadVipData();
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      setError('购买失败: ' + error.message);
      setLoading(false);
    }
  };

  // VIP每日领取 - 领取星源币
  const handleClaimVipReward = async () => {
    try {
      setLoading(true);
      
      // 模拟领取成功
      setTimeout(() => {
        const dailyReward = vipData.dailyStarcoin;
        alert(`领取成功！获得${dailyReward}星源币`);
        // 增加星源币
        refreshData({ starcoin: (starcoin || 0) + dailyReward });
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      setError('领取失败: ' + error.message);
      setLoading(false);
    }
  };

  // 抽取娃娃 - 使用星源币
  const handleGacha = async (type) => {
    const costs = {
      single: 500,    // 星源币
      ten: 5000       // 星源币
    };

    const cost = costs[type];
    
    if ((starcoin || 0) < cost) {
      setError(`星源币不足！需要${cost}星源币\n请开通VIP每日领取，或通过其他方式获得`);
      return;
    }

    try {
      setLoading(true);
      
      // 模拟抽取结果
      setTimeout(() => {
        const elements = ['金', '木', '水', '火', '土'];
        const emojis = { '金': '⚡', '木': '🌿', '水': '💧', '火': '🔥', '土': '🗿' };
        
        if (type === 'single') {
          const element = elements[Math.floor(Math.random() * elements.length)];
          const doll = {
            emoji: emojis[element],
            name: `${element}元素娃娃`,
            element: element,
            level: 1
          };
          alert(`抽取成功！获得${doll.emoji} ${doll.name}(${doll.element})`);
        } else {
          // 十连抽获得5个娃娃
          const dolls = [];
          for (let i = 0; i < 5; i++) {
            const element = elements[Math.floor(Math.random() * elements.length)];
            dolls.push({
              emoji: emojis[element],
              name: `${element}元素娃娃`,
              element: element,
              level: 1
            });
          }
          const dollNames = dolls.map(doll => `${doll.emoji} ${doll.name}(${doll.element})`).join(', ');
          alert(`抽取成功！获得: ${dollNames}`);
        }
        
        // 扣除星源币
        refreshData({ starcoin: (starcoin || 0) - cost });
        fetchUserDolls();
        setLoading(false);
      }, 1500);
      
    } catch (error) {
      setError('抽取失败: ' + error.message);
      setLoading(false);
    }
  };

  // Boss挑战
  const handleChallengeBoss = async () => {
    if (!bossData) {
      setError('Boss数据加载中...');
      return;
    }

    if (bossData.currentHp <= 0) {
      setError('Boss已被击败，请等待下次刷新');
      return;
    }

    try {
      setLoading(true);
      
      // 模拟挑战结果
      setTimeout(() => {
        const damage = Math.floor(Math.random() * 2000) + 500;
        const reward = Math.floor(damage / 10);
        alert(`挑战成功！造成${damage}点伤害，获得${reward}积分`);
        
        // 更新Boss血量
        setBossData(prev => ({
          ...prev,
          currentHp: Math.max(0, prev.currentHp - damage),
          recentChallenges: [
            { playerName: user?.username || '你', damage, time: '刚刚' },
            ...prev.recentChallenges.slice(0, 4)
          ]
        }));
        
        // 增加积分
        refreshData({ points: points + reward });
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      setError('挑战失败: ' + error.message);
      setLoading(false);
    }
  };

  // 渲染首页
  const renderHomePage = () => (
    <div className="home-page">
      {/* 货币显示 */}
      <div className="currency-display">
        <div className="currency-item points">
          <span className="currency-icon">💰</span>
          <div className="currency-info">
            <span className="currency-label">积分</span>
            <span className="currency-amount">{points.toLocaleString()}</span>
          </div>
        </div>
        <div className="currency-item starcoin">
          <span className="currency-icon">⭐</span>
          <div className="currency-info">
            <span className="currency-label">星源币</span>
            <span className="currency-amount">{(starcoin || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 宣传横幅 */}
      <div className="hero-banner">
        <div className="hero-content">
          <h1>🧸 幻灵潮玩</h1>
          <p>收集娃娃，征战Boss，成为最强训练师！</p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{dolls.length}</span>
              <span className="stat-label">娃娃总数</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{deployedDolls.length}/5</span>
              <span className="stat-label">出战中</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{todayTotalOutput.toFixed(1)}</span>
              <span className="stat-label">今日产出</span>
            </div>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="floating-doll">🧸</div>
          <div className="floating-doll">🦄</div>
          <div className="floating-doll">🐉</div>
        </div>
      </div>

      {/* 功能模块网格 */}
      <div className="features-grid">
        {featureModules.map((module) => (
          <button
            key={module.id}
            className="feature-card"
            style={{ background: module.gradient }}
            onClick={module.action}
          >
            <div className="feature-icon">{module.icon}</div>
            <div className="feature-info">
              <h3>{module.name}</h3>
              <p>{module.desc}</p>
            </div>
            <div className="feature-arrow">→</div>
          </button>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="quick-actions">
        <h2>🚀 快速操作</h2>
        <div className="action-buttons">
          <button 
            className="action-btn primary"
            onClick={() => handleModuleClick('gacha')}
          >
            🎲 幸运抽取
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => handleModuleClick('boss')}
          >
            ⚔️ 挑战Boss
          </button>
          <button 
            className="action-btn tertiary"
            onClick={() => handleModuleClick('vip')}
          >
            💎 VIP特权
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染抽取页面 - 使用星源币
  const renderGachaPage = () => (
    <div className="gacha-page">
      <div className="gacha-balance-card">
        <div className="balance-header">
          <span className="balance-icon">⭐</span>
          <span className="balance-label">星源币余额</span>
        </div>
        <div className="balance-amount">{(starcoin || 0).toLocaleString()}</div>
        <div className="balance-tip">
          💡 开通VIP每日可领取星源币
        </div>
      </div>

      <div className="gacha-machines">
        <div className="gacha-machine single">
          <div className="machine-header">
            <span className="machine-icon">🎁</span>
            <h4>单次抽取</h4>
          </div>
          <div className="machine-cost">500 星源币</div>
          <div className="machine-desc">随机获得1级娃娃</div>
          <div className="element-preview">
            <span>金</span>
            <span>木</span>
            <span>水</span>
            <span>火</span>
            <span>土</span>
          </div>
          <button 
            className="gacha-btn-modern single"
            onClick={() => handleGacha('single')}
            disabled={loading || (starcoin || 0) < 500}
          >
            {loading ? '抽取中...' : '🎲 抽取'}
          </button>
        </div>

        <div className="gacha-machine multi">
          <div className="machine-header">
            <span className="machine-icon">🎊</span>
            <h4>十连抽</h4>
          </div>
          <div className="machine-cost">5000 星源币</div>
          <div className="machine-desc">一次抽取5个娃娃</div>
          <div className="machine-badge">无额外福利</div>
          <button 
            className="gacha-btn-modern ten"
            onClick={() => handleGacha('ten')}
            disabled={loading || (starcoin || 0) < 5000}
          >
            {loading ? '抽取中...' : '🎊 十连抽'}
          </button>
        </div>
      </div>

      {/* VIP推广卡片 */}
      <div className="vip-promo-card">
        <div className="promo-header">
          <span className="promo-icon">💎</span>
          <h3>星源币不足？</h3>
        </div>
        <div className="promo-content">
          <p>开通VIP，每日免费领取星源币！</p>
          <div className="promo-benefits">
            <span>• 月卡每日66星源币</span>
            <span>• 季卡每日88星源币</span>
            <span>• 年卡每日128星源币</span>
          </div>
          <button 
            className="promo-btn"
            onClick={() => setActiveTab('vip')}
          >
            💎 立即开通VIP
          </button>
        </div>
      </div>

      {/* 娃娃图鉴 */}
      <div className="doll-collection">
        <h3>📖 娃娃图鉴</h3>
        <div className="collection-grid">
          {['金', '木', '水', '火', '土'].map((element) => (
            <div key={element} className="collection-item">
              <div className={`element-icon ${element.toLowerCase()}`}>
                {getElementEmoji(element)}
              </div>
              <div className="element-name">{element}属性</div>
              <div className="element-desc">{getElementDesc(element)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 渲染VIP页面 - 积分购买
  const renderVipPage = () => (
    <div className="vip-page">
      <div className="vip-status-card">
        <div className="vip-header">
          <div className="vip-badge">👑 VIP特权</div>
          <div className="vip-status">
            {vipData?.isActive ? '已激活' : '未激活'}
          </div>
        </div>
        
        {vipData?.isActive ? (
          <div className="vip-info">
            <div className="vip-days">
              <span>剩余天数</span>
              <strong>{vipData.remainingDays}天</strong>
            </div>
            <div className="vip-benefits">
              <span>每日领取</span>
              <strong>{vipData.dailyStarcoin}星源币</strong>
            </div>
            <div className="vip-multiplier">
              <span>产出加成</span>
              <strong>x{vipData.outputMultiplier}</strong>
            </div>
          </div>
        ) : (
          <div className="vip-inactive-info">
            <p>积分购买VIP，每日领取星源币！</p>
          </div>
        )}
        
        {vipData?.isActive && vipData.canClaimDaily && (
          <button 
            className="claim-vip-btn"
            onClick={handleClaimVipReward}
            disabled={loading}
          >
            {loading ? '领取中...' : '⭐ 领取星源币'}
          </button>
        )}
      </div>

      <div className="vip-cards-section">
        <h3>💎 VIP卡购买（积分）</h3>
        <div className="vip-cards-grid">
          <div className="vip-card-modern monthly">
            <div className="card-header">
              <span className="card-icon">📅</span>
              <h4>月卡</h4>
            </div>
            <div className="card-price">1980积分</div>
            <div className="card-duration">30天</div>
            <div className="card-benefits">
              <span>• 每日66星源币</span>
              <span>• 产出x1.2倍</span>
              <span>• 专属头像框</span>
            </div>
            <button 
              className="purchase-btn"
              onClick={() => handleVipPurchase('monthly')}
              disabled={loading || points < 1980}
            >
              {loading ? '购买中...' : '购买'}
            </button>
          </div>
          
          <div className="vip-card-modern quarterly">
            <div className="card-header">
              <span className="card-icon">📆</span>
              <h4>季卡</h4>
            </div>
            <div className="card-price">5666积分</div>
            <div className="card-duration">90天</div>
            <div className="card-benefits">
              <span>• 每日88星源币</span>
              <span>• 产出x1.5倍</span>
              <span>• 专属特效</span>
            </div>
            <div className="card-badge">省280积分</div>
            <button 
              className="purchase-btn"
              onClick={() => handleVipPurchase('quarterly')}
              disabled={loading || points < 5666}
            >
              {loading ? '购买中...' : '购买'}
            </button>
          </div>
          
          <div className="vip-card-modern yearly">
            <div className="card-header">
              <span className="card-icon">👑</span>
              <h4>年卡</h4>
            </div>
            <div className="card-price">20999积分</div>
            <div className="card-duration">360天</div>
            <div className="card-benefits">
              <span>• 每日128星源币</span>
              <span>• 产出x2.0倍</span>
              <span>• 全部特权</span>
            </div>
            <div className="card-badge">限时8折</div>
            <button 
              className="purchase-btn"
              onClick={() => handleVipPurchase('yearly')}
              disabled={loading || points < 20999}
            >
              {loading ? '购买中...' : '购买'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 获取元素表情
  const getElementEmoji = (element) => {
    const emojis = {
      '金': '⚡',
      '木': '🌿',
      '水': '💧',
      '火': '🔥',
      '土': '🗿'
    };
    return emojis[element] || '❓';
  };

  // 获取元素描述
  const getElementDesc = (element) => {
    const descs = {
      '金': '高攻击力',
      '木': '高防御力',
      '水': '高回复力',
      '火': '高爆发力',
      '土': '高血量'
    };
    return descs[element] || '未知属性';
  };

  // 渲染内容
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomePage();
      case 'boss':
        return renderBossPage();
      case 'vip':
        return renderVipPage();
      case 'gacha':
        return renderGachaPage();
      default:
        return renderHomePage();
    }
  };

  return (
    <div className="doll-center-page">
      {error && (
        <div className="error-toast">
          <span>❌ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* 返回首页按钮 */}
      {activeTab !== 'home' && (
        <button 
          className="back-home-btn"
          onClick={() => setActiveTab('home')}
        >
          ← 返回首页
        </button>
      )}

      {renderContent()}
    </div>
  );
};

export default DollCenterPage;
