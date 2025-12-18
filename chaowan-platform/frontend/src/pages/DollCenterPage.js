// src/pages/DollCenterPage.js - 首页宣传图设计
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './DollCenterPage.css';

const DollCenterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('home'); // 默认首页
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bossData, setBossData] = useState(null);
  const [vipData, setVipData] = useState(null);
  const [synthesisData, setSynthesisData] = useState(null);
  
  const { 
    points, 
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
      action: () => setActiveTab('backpack')
    },
    {
      id: 'boss',
      name: 'Boss挑战',
      icon: '⚔️',
      desc: '击败Boss赢取大奖',
      color: '#ff6b6b',
      gradient: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
      action: () => setActiveTab('boss')
    },
    {
      id: 'synthesis',
      name: '合成工坊',
      icon: '🔨',
      desc: '升级娃娃提升战力',
      color: '#4ecdc4',
      gradient: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
      action: () => setActiveTab('synthesis')
    },
    {
      id: 'vip',
      name: 'VIP特权',
      icon: '💎',
      desc: '尊享特权福利',
      color: '#f39c12',
      gradient: 'linear-gradient(135deg, #f39c12, #e67e22)',
      action: () => setActiveTab('vip')
    },
    {
      id: 'gacha',
      name: '幸运抽取',
      icon: '🎲',
      desc: '抽取稀有娃娃',
      color: '#e74c3c',
      gradient: 'linear-gradient(135deg, #e74c3c, #c0392b)',
      action: () => setActiveTab('gacha')
    },
    {
      id: 'production',
      name: '产出管理',
      icon: '📊',
      desc: '查看收益统计',
      color: '#27ae60',
      gradient: 'linear-gradient(135deg, #27ae60, #229954)',
      action: () => setActiveTab('production')
    }
  ];

  // 加载Boss数据
  const loadBossData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/boss/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setBossData(result.data);
      }
    } catch (error) {
      console.error('加载Boss数据失败:', error);
    }
  }, []);

  // 加载VIP数据
  const loadVipData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/vip/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setVipData(result.data);
      }
    } catch (error) {
      console.error('加载VIP数据失败:', error);
    }
  }, []);

  // 加载合成数据
  const loadSynthesisData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/synthesis/materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setSynthesisData(result.data);
      }
    } catch (error) {
      console.error('加载合成数据失败:', error);
    }
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

  // VIP购买处理
  const handleVipPurchase = async (cardType) => {
    const cardPrices = {
      monthly: 1980,
      quarterly: 5666,
      yearly: 20999
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
          price
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`购买成功！获得${cardType === 'monthly' ? '30' : cardType === 'quarterly' ? '90' : '360'}天VIP特权`);
        refreshData();
        loadVipData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('购买失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // VIP每日领取
  const handleClaimVipReward = async () => {
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
        alert(`领取成功！获得${result.data.starcoin}星源币`);
        refreshData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('领取失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 抽取娃娃
  const handleGacha = async (type) => {
    const costs = {
      single: 500,
      ten: 5000
    };

    const cost = costs[type];
    
    if (points < cost) {
      setError(`积分不足！需要${cost}积分`);
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
        const dollNames = dolls.map(doll => `${doll.emoji} ${doll.name}(${doll.element})`).join(', ');
        alert(`抽取成功！获得: ${dollNames}`);
        refreshData();
        fetchUserDolls();
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
        loadBossData();
        refreshData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('挑战失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 合成娃娃
  const handleSynthesis = async (mainDoll, materialDolls) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/synthesis/combine', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mainDoll,
          materialDolls
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`合成成功！获得${result.data.newDoll.emoji} ${result.data.newDoll.name} Lv.${result.data.newDoll.level}`);
        refreshData();
        fetchUserDolls();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('合成失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 渲染首页
  const renderHomePage = () => (
    <div className="home-page">
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
            onClick={() => setActiveTab('gacha')}
          >
            🎲 幸运抽取
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => setActiveTab('boss')}
          >
            ⚔️ 挑战Boss
          </button>
          <button 
            className="action-btn tertiary"
            onClick={() => setActiveTab('vip')}
          >
            💎 VIP特权
          </button>
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

  // 渲染VIP页面
  const renderVipPage = () => (
    <div className="vip-page">
      {!vipData ? (
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>加载VIP数据中...</p>
        </div>
      ) : (
        <>
          <div className="vip-status-card">
            <div className="vip-header">
              <div className="vip-badge">👑 VIP特权</div>
              <div className="vip-status">
                {vipData.isActive ? '已激活' : '未激活'}
              </div>
            </div>
            
            {vipData.isActive ? (
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
                <p>开通VIP，享受专属特权！</p>
              </div>
            )}
            
            {vipData.isActive && vipData.canClaimDaily && (
              <button 
                className="claim-vip-btn"
                onClick={handleClaimVipReward}
                disabled={loading}
              >
                {loading ? '领取中...' : '💎 立即领取'}
              </button>
            )}
          </div>

          <div className="vip-cards-section">
            <h3>💎 VIP卡购买</h3>
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

          {/* VIP特权说明 */}
          <div className="vip-privileges">
            <h3>🎁 VIP专属特权</h3>
            <div className="privileges-list">
              <div className="privilege-item">
                <span className="privilege-icon">💰</span>
                <div className="privilege-info">
                  <div className="privilege-name">每日星源币</div>
                  <div className="privilege-desc">每日可领取专属星源币奖励</div>
                </div>
              </div>
              <div className="privilege-item">
                <span className="privilege-icon">⭐</span>
                <div className="privilege-info">
                  <div className="privilege-name">产出加成</div>
                  <div className="privilege-desc">娃娃产出获得额外加成</div>
                </div>
              </div>
              <div className="privilege-item">
                <span className="privilege-icon">🎨</span>
                <div className="privilege-info">
                  <div className="privilege-name">专属外观</div>
                  <div className="privilege-desc">VIP专属头像框和特效</div>
                </div>
              </div>
              <div className="privilege-item">
                <span className="privilege-icon">🚀</span>
                <div className="privilege-info">
                  <div className="privilege-name">优先体验</div>
                  <div className="privilege-desc">新功能优先体验权限</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // 渲染抽取页面
  const renderGachaPage = () => (
    <div className="gacha-page">
      <div className="gacha-balance-card">
        <div className="balance-header">
          <span className="balance-icon">⭐</span>
          <span className="balance-label">积分余额</span>
        </div>
        <div className="balance-amount">{points.toLocaleString()}</div>
      </div>

      <div className="gacha-machines">
        <div className="gacha-machine single">
          <div className="machine-header">
            <span className="machine-icon">🎁</span>
            <h4>单次抽取</h4>
          </div>
          <div className="machine-cost">500 积分</div>
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
            disabled={loading || points < 500}
          >
            {loading ? '抽取中...' : '🎲 抽取'}
          </button>
        </div>

        <div className="gacha-machine multi">
          <div className="machine-header">
            <span className="machine-icon">🎊</span>
            <h4>十连抽</h4>
          </div>
          <div className="machine-cost">5000 积分</div>
          <div className="machine-desc">一次抽取5个娃娃</div>
          <div className="machine-badge">无额外福利</div>
          <button 
            className="gacha-btn-modern ten"
            onClick={() => handleGacha('ten')}
            disabled={loading || points < 5000}
          >
            {loading ? '抽取中...' : '🎊 十连抽'}
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

      {/* 抽取记录 */}
      <div className="gacha-history">
        <h3>📜 抽取记录</h3>
        <div className="history-list">
          {/* 这里可以显示最近的抽取记录 */}
          <div className="history-item">
            <span>暂无抽取记录</span>
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
