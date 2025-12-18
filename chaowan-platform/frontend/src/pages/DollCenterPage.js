// src/pages/DollCenterPage.js - 现代化设计版
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './DollCenter.css';

const DollCenterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'backpack');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { 
    points, 
    dolls, 
    user,
    refreshData,
    fetchUserDolls
  } = useUser();

  // Tab配置 - 现代化设计
  const tabs = [
    { id: 'backpack', name: '背包', icon: '🎒', color: '#667eea' },
    { id: 'boss', name: 'Boss', icon: '⚔️', color: '#ff6b6b' },
    { id: 'synthesis', name: '合成', icon: '🔨', color: '#4ecdc4' },
    { id: 'vip', name: 'VIP', icon: '💎', color: '#f39c12' },
    { id: 'gacha', name: '抽取', icon: '🎲', color: '#e74c3c' },
    { id: 'production', name: '产出', icon: '📊', color: '#27ae60' }
  ];

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

  // 切换Tab
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    navigate(`/doll-center?tab=${tabId}`);
  }, [navigate]);

  // 娃娃操作
  const handleDeployDoll = useCallback(async (dollId) => {
    if (deployedDolls.length >= 5) {
      alert('出战位已满！请先召回其他娃娃。');
      return;
    }
    
    try {
      setLoading(true);
      // 这里应该调用API部署娃娃
      console.log('部署娃娃:', dollId);
      await fetchUserDolls();
    } catch (error) {
      setError('部署娃娃失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [deployedDolls.length, fetchUserDolls]);

  const handleRecallDoll = useCallback(async (dollId) => {
    try {
      setLoading(true);
      console.log('召回娃娃:', dollId);
      await fetchUserDolls();
    } catch (error) {
      setError('召回娃娃失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [fetchUserDolls]);

  // 渲染Tab内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'backpack':
        return (
          <div className="modern-tab-content">
            {/* 统计卡片 */}
            <div className="stats-cards">
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

            {/* 娃娃网格 */}
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
                      <button 
                        className="action-btn-modern recall"
                        onClick={() => handleRecallDoll(doll.id)}
                        disabled={loading}
                      >
                        召回
                      </button>
                    ) : (
                      <button 
                        className="action-btn-modern deploy"
                        onClick={() => handleDeployDoll(doll.id)}
                        disabled={loading}
                      >
                        出战
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'boss':
        return (
          <div className="modern-tab-content">
            <div className="boss-section">
              <div className="boss-card-modern">
                <div className="boss-header">
                  <div className="boss-info">
                    <h3>🐉 千羽 Boss</h3>
                    <div className="boss-level">Lv.1</div>
                  </div>
                  <div className="boss-reward">
                    <span>💰 奖励</span>
                    <div className="reward-amount">88.8-188.8元</div>
                  </div>
                </div>
                
                <div className="boss-hp-section">
                  <div className="hp-label">Boss血量</div>
                  <div className="hp-bar-container">
                    <div className="hp-bar">
                      <div className="hp-fill" style={{ width: '85%' }} />
                    </div>
                    <span className="hp-text">85,430/100,000</span>
                  </div>
                </div>

                <div className="boss-stats">
                  <div className="boss-stat">
                    <span>⚔️ 参与人数</span>
                    <strong>1,234</strong>
                  </div>
                  <div className="boss-stat">
                    <span>⏰ 剩余时间</span>
                    <strong>2小时</strong>
                  </div>
                </div>

                <button className="challenge-btn-modern">
                  ⚔️ 挑战Boss
                </button>
              </div>
            </div>
          </div>
        );

      case 'synthesis':
        return (
          <div className="modern-tab-content">
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

      case 'vip':
        return (
          <div className="modern-tab-content">
            <div className="vip-section">
              <div className="vip-status-card">
                <div className="vip-header">
                  <div className="vip-badge">👑 VIP特权</div>
                  <div className="vip-status">已激活</div>
                </div>
                <div className="vip-info">
                  <div className="vip-days">
                    <span>剩余天数</span>
                    <strong>28天</strong>
                  </div>
                  <div className="vip-benefits">
                    <span>每日领取</span>
                    <strong>66星源币</strong>
                  </div>
                </div>
                <button className="claim-vip-btn">
                  💎 立即领取
                </button>
              </div>

              <div className="vip-cards-grid">
                <div className="vip-card-modern monthly">
                  <div className="card-header">
                    <span className="card-icon">📅</span>
                    <h4>月卡</h4>
                  </div>
                  <div className="card-price">¥19.8</div>
                  <div className="card-duration">30天</div>
                  <button className="purchase-btn">购买</button>
                </div>
                
                <div className="vip-card-modern yearly">
                  <div className="card-header">
                    <span className="card-icon">👑</span>
                    <h4>年卡</h4>
                  </div>
                  <div className="card-price">¥198</div>
                  <div className="card-duration">360天</div>
                  <div className="card-badge">限时8折</div>
                  <button className="purchase-btn">购买</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'gacha':
        return (
          <div className="modern-tab-content">
            <div className="gacha-section">
              <div className="gacha-balance-card">
                <div className="balance-header">
                  <span className="balance-icon">⭐</span>
                  <span className="balance-label">星源币余额</span>
                </div>
                <div className="balance-amount">
                  {user?.starcoin?.toLocaleString() || '0'}
                </div>
              </div>

              <div className="gacha-machines">
                <div className="gacha-machine single">
                  <div className="machine-header">
                    <span className="machine-icon">🎁</span>
                    <h4>单次抽取</h4>
                  </div>
                  <div className="machine-cost">500 星源币</div>
                  <button className="gacha-btn-modern single">
                    🎲 抽取
                  </button>
                </div>

                <div className="gacha-machine multi">
                  <div className="machine-header">
                    <span className="machine-icon">🎊</span>
                    <h4>十连抽</h4>
                  </div>
                  <div className="machine-cost">4,500 星源币</div>
                  <div className="machine-badge">省500</div>
                  <button className="gacha-btn-modern ten">
                    🎊 十连抽
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'production':
        return (
          <div className="modern-tab-content">
            <div className="production-section">
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="doll-center-modern">
      {/* 现代化Tab导航 */}
      <div className="tab-navigation-modern">
        <div className="tab-scroll">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item-modern ${activeTab === tab.id ? 'active' : ''}`}
              style={{ '--tab-color': tab.color }}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="tab-icon-modern">{tab.icon}</span>
              <span className="tab-name-modern">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="content-area-modern">
        {error && (
          <div className="error-toast">
            <span>❌ {error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        
        {loading ? (
          <div className="loading-modern">
            <div className="loading-spinner"></div>
            <span>加载中...</span>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
};

export default DollCenterPage;
