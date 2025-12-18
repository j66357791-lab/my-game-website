// src/pages/DollCenterPage.js - 严格按照策划案
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

  // 强制刷新用户数据 - 解决数据同步问题
  const forceRefreshUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('https://tianchuang.onrender.com/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('用户数据刷新成功:', result.data);
        // 强制更新context中的数据
        refreshData(result.data);
        return result.data;
      } else {
        console.error('用户数据刷新失败:', result.message);
      }
    } catch (error) {
      console.error('强制刷新用户数据出错:', error);
    }
    return null;
  }, [refreshData]);

  // 加载VIP数据
  const loadVipData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/vip/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('VIP数据加载成功:', result.data);
        setVipData(result.data);
      } else {
        console.log('没有VIP数据，设置默认值');
        setVipData({
          isActive: false,
          remainingDays: 0,
          dailyStarcoin: 0,
          canClaimDaily: false,
          lastClaimDate: null
        });
      }
    } catch (error) {
      console.error('加载VIP数据失败:', error);
      setVipData({
        isActive: false,
        remainingDays: 0,
        dailyStarcoin: 0,
        canClaimDaily: false,
        lastClaimDate: null
      });
    }
  }, []);

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

  // 加载合成数据
  const loadSynthesisData = useCallback(() => {
    setSynthesisData({
      availableMaterials: [],
      recipes: []
    });
  }, []);

  useEffect(() => {
    // 页面加载时强制刷新数据
    forceRefreshUserData();
    
    if (activeTab !== 'home') {
      loadBossData();
      loadVipData();
      loadSynthesisData();
    }
  }, [activeTab, forceRefreshUserData, loadBossData, loadVipData, loadSynthesisData]);

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

  // VIP购买处理 - 严格按照策划案
  const handleVipPurchase = async (cardType) => {
    const cardPrices = {
      monthly: 1980,    // 积分
      quarterly: 5666,  // 积分
      yearly: 20999     // 积分
    };

    const cardDays = {
      monthly: 30,
      quarterly: 90,
      yearly: 360
    };

    const dailyRewards = {
      monthly: 66,
      quarterly: 88,
      yearly: 128
    };

    const price = cardPrices[cardType];
    
    if (points < price) {
      setError(`积分不足！需要${price}积分`);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('https://tianchuang.onrender.com/api/vip/purchase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cardType,
          price,
          days: cardDays[cardType],
          dailyStarcoin: dailyRewards[cardType]
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`购买成功！获得${cardDays[cardType]}天VIP特权，每日可领取${dailyRewards[cardType]}星源币`);
        // 强制刷新数据
        await forceRefreshUserData();
        await loadVipData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('购买失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // VIP每日领取星源币 - 严格按照策划案
  const handleClaimVipReward = async () => {
    if (!vipData || !vipData.isActive) {
      setError('您还没有开通VIP特权');
      return;
    }

    if (!vipData.canClaimDaily) {
      setError('今日已领取，请明天再来');
      return;
    }

    if (vipData.remainingDays <= 0) {
      setError('VIP已过期，请续费');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('https://tianchuang.onrender.com/api/vip/claim-daily', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        alert(`领取成功！获得${result.data.starcoin}星源币，VIP剩余${result.data.remainingDays}天`);
        // 强制刷新数据
        await forceRefreshUserData();
        await loadVipData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('领取失败: ' + error.message);
    } finally {
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
      setError(`星源币不足！需要${cost}星源币\n请开通VIP每日领取`);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('https://tianchuang.onrender.com/api/gacha/draw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          cost
        })
      });

      const result = await response.json();
      if (result.success) {
        const dolls = result.data.dolls;
        if (type === 'single') {
          const doll = dolls[0];
          alert(`抽取成功！获得${doll.emoji} ${doll.name}(${doll.element})`);
        } else {
          const dollNames = dolls.map(doll => `${doll.emoji} ${doll.name}(${doll.element})`).join(', ');
          alert(`抽取成功！获得: ${dollNames}`);
        }
        
        // 强制刷新数据
        await forceRefreshUserData();
        await fetchUserDolls();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('抽取失败: ' + error.message);
    } finally {
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
      const token = localStorage.getItem('token');
      
      const response = await fetch('https://tianchuang.onrender.com/api/boss/challenge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        alert(`挑战成功！造成${result.data.damage}点伤害，获得${result.data.reward}积分`);
        
        // 更新Boss血量
        setBossData(prev => ({
          ...prev,
          currentHp: Math.max(0, prev.currentHp - result.data.damage),
          recentChallenges: [
            { playerName: user?.username || '你', damage: result.data.damage, time: '刚刚' },
            ...prev.recentChallenges.slice(0, 4)
          ]
        }));
        
        // 强制刷新用户数据
        await forceRefreshUserData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('挑战失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 渲染首页 - 添加刷新按钮
  const renderHomePage = () => (
    <div className="home-page">
      {/* 刷新按钮 */}
      <div className="refresh-section">
        <button 
          className="refresh-btn"
          onClick={() => {
            forceRefreshUserData();
            loadVipData();
          }}
          disabled={loading}
        >
          {loading ? '刷新中...' : '🔄 刷新数据'}
        </button>
      </div>

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

  // 渲染VIP页面 - 严格按照策划案，无虚假功能
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
          </div>
        ) : (
          <div className="vip-inactive-info">
            <p>积分购买VIP，每日领取星源币！</p>
          </div>
        )}
        
        {vipData?.isActive && (
          <button 
            className={`claim-vip-btn ${vipData.canClaimDaily ? 'available' : 'disabled'}`}
            onClick={handleClaimVipReward}
            disabled={loading || !vipData.canClaimDaily}
          >
            {loading ? '领取中...' : vipData.canClaimDaily ? '⭐ 领取今日星源币' : '✅ 今日已领取'}
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
            </div>
            <div className="card-badge">超值优惠</div>
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

  // 渲染抽取页面
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

  // 渲染Boss挑战页面
  const renderBossPage = () => (
    <div className="boss-page">
      {!bossData ? (
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>加载Boss数据中...</p>
        </div>
      ) : (
        <>
          <div className="boss-card">
            <div className="boss-header">
              <div className="boss-info">
                <h2>🐉 {bossData.name}</h2>
                <div className="boss-level">Lv.{bossData.level}</div>
              </div>
              <div className="boss-reward">
                <span>💰 奖励池</span>
                <div className="reward-amount">{bossData.rewardPool}积分</div>
              </div>
            </div>

            <div className="boss-hp-section">
              <div className="hp-label">Boss血量</div>
              <div className="hp-bar-container">
                <div className="hp-bar">
                  <div 
                    className="hp-fill" 
                    style={{ width: `${(bossData.currentHp / bossData.maxHp) * 100}%` }}
                  />
                </div>
                <span className="hp-text">
                  {bossData.currentHp.toLocaleString()}/{bossData.maxHp.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="boss-stats">
              <div className="boss-stat">
                <span>⚔️ 参与人数</span>
                <strong>{bossData.participants.toLocaleString()}</strong>
              </div>
              <div className="boss-stat">
                <span>⏰ 剩余时间</span>
                <strong>{bossData.remainingTime}</strong>
              </div>
              <div className="boss-stat">
                <span>🏆 最后击杀</span>
                <strong>{bossData.lastKiller || '无'}</strong>
              </div>
            </div>

            <div className="boss-skills">
              <h3>Boss技能</h3>
              <div className="skills-list">
                {bossData.skills?.map((skill, index) => (
                  <div key={index} className="skill-item">
                    <span className="skill-icon">{skill.icon}</span>
                    <div className="skill-info">
                      <div className="skill-name">{skill.name}</div>
                      <div className="skill-desc">{skill.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              className="challenge-btn"
              onClick={handleChallengeBoss}
              disabled={loading || bossData.currentHp <= 0}
            >
              {loading ? '挑战中...' : bossData.currentHp <= 0 ? 'Boss已被击败' : '⚔️ 挑战Boss'}
            </button>
          </div>

          {/* 挑战记录 */}
          <div className="challenge-records">
            <h3>📜 挑战记录</h3>
            <div className="records-list">
              {bossData.recentChallenges?.map((record, index) => (
                <div key={index} className="record-item">
                  <span className="record-player">{record.playerName}</span>
                  <span className="record-damage">造成{record.damage}伤害</span>
                  <span className="record-time">{record.time}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // 其他页面渲染函数保持不变...
  const renderSynthesisPage = () => (
    <div className="synthesis-page">
      <div className="synthesis-section">
        <div className="synthesis-rules-card">
          <h3>🔨 合成规则</h3>
          <div className="rules-list">
            <div className="rule-item">
              <span className="rule-icon">📋</span>
              <span>本体 + 2个同属性同等级材料</span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">⬆️</span>
              <span>结果：等级+1，属性不变</span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">💎</span>
              <span>成功率：100%</span>
            </div>
          </div>
        </div>

        <div className="synthesis-area-modern">
          <div className="synthesis-slots">
            <div className="slot-main">
              <div className="slot-label">本体</div>
              <div className="slot-box main">+</div>
            </div>
            <div className="slot-materials">
              <div className="slot-label">材料</div>
              <div className="slot-box material">+</div>
              <div className="slot-box material">=</div>
            </div>
          </div>
          
          <div className="synthesis-result">
            <div className="result-box">🎁</div>
            <div className="result-label">合成结果</div>
          </div>

          <button className="synthesis-btn-modern">
            🔨 开始合成
          </button>
        </div>
      </div>
    </div>
  );

  const renderBackpackPage = () => (
    <div className="backpack-page">
      <div className="backpack-stats">
        <div className="stat-card primary">
          <div className="stat-icon">🧸</div>
          <div className="stat-info">
            <div className="stat-number">{dolls.length}</div>
            <div className="stat-label">娃娃总数</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">⚔️</div>
          <div className="stat-info">
            <div className="stat-number">{deployedDolls.length}/5</div>
            <div className="stat-label">出战中</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <div className="stat-number">{todayTotalOutput.toFixed(1)}</div>
            <div className="stat-label">今日产出</div>
          </div>
        </div>
      </div>

      <div className="dolls-grid-modern">
        {dolls.map((doll) => (
          <div key={doll.id} className={`doll-card-modern ${doll.status === 'active' ? 'deployed' : ''}`}>
            <div className="doll-header">
              <div className="doll-emoji-large">{doll.emoji}</div>
              {doll.status === 'active' && (
                <div className="deployed-badge">出战中</div>
              )}
            </div>
            <div className="doll-body">
              <h4 className="doll-name-modern">{doll.name}</h4>
              <div className="doll-stats">
                <span className="doll-level">Lv.{doll.level}</span>
                <span className="doll-output">⭐ {parseFloat(doll.output || 0).toFixed(1)}/天</span>
              </div>
              {doll.status === 'active' ? (
                <div className="doll-remaining">剩余 {doll.daysLeft || 30} 天</div>
              ) : (
                <div className="doll-status">未出战</div>
              )}
            </div>
            <div className="doll-actions">
              {doll.status === 'active' ? (
                <button className="action-btn-modern recall">
                  召回
                </button>
              ) : (
                <button className="action-btn-modern deploy">
                  出战
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProductionPage = () => (
    <div className="production-page">
      <div className="production-overview">
        <div className="overview-card">
          <div className="overview-icon">📊</div>
          <div className="overview-info">
            <div className="overview-title">今日总产出</div>
            <div className="overview-value">{todayTotalOutput.toFixed(1)} 星源币</div>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="overview-icon">⚔️</div>
          <div className="overview-info">
            <div className="overview-title">出战位</div>
            <div className="overview-value">{deployedDolls.length}/5</div>
          </div>
        </div>
      </div>

      <div className="production-list">
        <h3>📈 产出明细</h3>
        {deployedDolls.map((doll) => (
          <div key={doll.id} className="production-item-modern">
            <div className="production-doll">
              <span className="doll-emoji">{doll.emoji}</span>
              <div className="doll-info">
                <div className="doll-name">{doll.name}</div>
                <div className="doll-level">Lv.{doll.level}</div>
              </div>
            </div>
            <div className="production-output">
              <div className="output-amount">+{parseFloat(doll.output || 0).toFixed(1)}/天</div>
              <div className="output-remaining">剩余{doll.daysLeft || 30}天</div>
            </div>
          </div>
        ))}
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
      case 'backpack':
        return renderBackpackPage();
      case 'boss':
        return renderBossPage();
      case 'synthesis':
        return renderSynthesisPage();
      case 'vip':
        return renderVipPage();
      case 'gacha':
        return renderGachaPage();
      case 'production':
        return renderProductionPage();
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
