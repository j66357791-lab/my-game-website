// src/pages/DollCenterPage.js - 确保组件名正确
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './DollCenter.css'; // ✅ 确保CSS文件名正确

// 安全的数字格式化函数
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return '0';
  }
  return num.toFixed(decimals);
};

const safeToLocaleString = (value, decimals = 0) => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return '0';
  }
  return num.toFixed(decimals).toLocaleString();
};

// ✅ 确保组件名是 DollCenterPage
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
    recycleDoll,
    fetchUserDolls
  } = useUser();

  // Tab配置
  const tabs = [
    { id: 'backpack', name: '背包', icon: '🎒' },
    { id: 'boss', name: 'Boss', icon: '⚔️' },
    { id: 'synthesis', name: '合成', icon: '🔨' },
    { id: 'vip', name: 'VIP', icon: '💎' },
    { id: 'gacha', name: '抽取', icon: '🎲' },
    { id: 'production', name: '产出', icon: '📊' }
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

  // Boss数据（模拟）
  const bossData = useMemo(() => ({
    name: '千羽',
    level: 1,
    currentHp: 85430,
    maxHp: 100000,
    participants: 1234,
    reward: '88.8-188.8元'
  }), []);

  // VIP数据（模拟）
  const vipData = useMemo(() => ({
    isActive: true,
    daysRemaining: 28,
    dailyStarcoin: 66,
    cards: [
      { type: 'monthly', price: 1980, duration: 30 },
      { type: 'quarterly', price: 5666, duration: 90 },
      { type: 'yearly', price: 20999, duration: 360 }
    ]
  }), []);

  // 切换Tab
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    navigate(`/doll-center?tab=${tabId}`); // ✅ 路径正确
  }, [navigate]);

  // 娃娃操作
  const handleDeployDoll = useCallback(async (dollId) => {
    try {
      if (deployedDolls.length >= 5) {
        alert('出战位已满！请先召回其他娃娃。');
        return;
      }
      
      console.log('部署娃娃:', dollId);
      await fetchUserDolls();
    } catch (error) {
      setError('部署娃娃失败: ' + error.message);
    }
  }, [deployedDolls.length, fetchUserDolls]);

  const handleRecallDoll = useCallback(async (dollId) => {
    try {
      console.log('召回娃娃:', dollId);
      await fetchUserDolls();
    } catch (error) {
      setError('召回娃娃失败: ' + error.message);
    }
  }, [fetchUserDolls]);

  // Boss挑战
  const handleChallengeBoss = useCallback(() => {
    navigate('/doll-center?tab=boss&action=challenge'); // ✅ 路径正确
  }, [navigate]);

  // VIP领取
  const handleClaimVipReward = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/vip-card/claim-daily-starcoin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`领取成功！获得${result.data.totalStarcoin}星源币`);
        refreshData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('领取失败: ' + error.message);
    }
  }, [refreshData]);

  // 抽取娃娃
  const handleGacha = useCallback(async (type) => {
    try {
      const starcoinCost = type === 'single' ? 500 : 5000;
      const userStarcoin = user?.starcoin || 0;
      
      if (userStarcoin < starcoinCost) {
        alert('星源币不足！');
        return;
      }
      
      console.log('抽取娃娃:', type);
      alert(`抽取成功！消耗${starcoinCost}星源币`);
      refreshData();
    } catch (error) {
      setError('抽取失败: ' + error.message);
    }
  }, [user?.starcoin, refreshData]);

  // 渲染Tab内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'backpack':
        return (
          <div className="tab-content backpack-tab">
            <div className="tab-header">
              <h3>🎒 我的娃娃</h3>
              <div className="filter-controls">
                <select className="filter-select">
                  <option>全部</option>
                  <option>已出战</option>
                  <option>未出战</option>
                </select>
                <select className="filter-select">
                  <option>最新</option>
                  <option>等级</option>
                  <option>产出</option>
                </select>
              </div>
            </div>
            
            <div className="dolls-stats">
              <span>总计：{dolls.length}个</span>
              <span>出战：{deployedDolls.length}个</span>
              <span>今日产出：{safeToLocaleString(todayTotalOutput)}星源币</span>
            </div>
            
            <div className="dolls-grid">
              {dolls.map((doll) => (
                <div key={doll.id} className={`doll-card ${doll.status === 'active' ? 'deployed' : ''}`}>
                  <div className="doll-emoji">{doll.emoji}</div>
                  <div className="doll-info">
                    <h4 className="doll-name">{doll.name}</h4>
                    <p className="doll-level">Lv.{doll.level}</p>
                    <p className="doll-output">产出：{safeToFixed(doll.output)}/天</p>
                    {doll.status === 'active' ? (
                      <p className="doll-remaining">剩余：{doll.daysLeft}天</p>
                    ) : (
                      <p className="doll-status">未出战</p>
                    )}
                  </div>
                  <div className="doll-actions">
                    {doll.status === 'active' ? (
                      <button 
                        className="action-btn recall"
                        onClick={() => handleRecallDoll(doll.id)}
                      >
                        召回
                      </button>
                    ) : (
                      <button 
                        className="action-btn deploy"
                        onClick={() => handleDeployDoll(doll.id)}
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
          <div className="tab-content boss-tab">
            <div className="boss-info">
              <h3>⚔️ Boss挑战</h3>
              <div className="boss-card">
                <div className="boss-header">
                  <h4>{bossData.name} Lv.{bossData.level}</h4>
                  <span className="boss-reward">奖励：{bossData.reward}</span>
                </div>
                <div className="boss-hp">
                  <div className="hp-bar">
                    <div 
                      className="hp-fill" 
                      style={{ width: `${(bossData.currentHp / bossData.maxHp) * 100}%` }}
                    />
                  </div>
                  <span className="hp-text">{bossData.currentHp.toLocaleString()}/{bossData.maxHp.toLocaleString()}</span>
                </div>
                <div className="boss-stats">
                  <span>参与人数：{bossData.participants.toLocaleString()}</span>
                </div>
                <button className="challenge-btn" onClick={handleChallengeBoss}>
                  挑战Boss
                </button>
              </div>
            </div>
          </div>
        );

      case 'synthesis':
        return (
          <div className="tab-content synthesis-tab">
            <div className="synthesis-header">
              <h3>🔨 合成工坊</h3>
              <div className="synthesis-rules">
                <p>合成规则：本体+2个同属性同等级材料</p>
                <p>结果：等级+1，属性不变</p>
              </div>
            </div>
            
            <div className="synthesis-area">
              <div className="material-selection">
                <h4>选择材料</h4>
                <div className="material-grid">
                  {availableDolls.map((doll) => (
                    <div key={doll.id} className="material-card">
                      <input type="checkbox" />
                      <div className="material-info">
                        <span className="material-emoji">{doll.emoji}</span>
                        <span className="material-name">{doll.name}</span>
                        <span className="material-level">Lv.{doll.level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="synthesis-slots">
                <h4>合成槽</h4>
                <div className="slots">
                  <div className="slot main-slot">本体</div>
                  <div className="slot material-slot">材料</div>
                  <div className="slot material-slot">材料</div>
                </div>
                <button className="synthesis-btn">开始合成</button>
              </div>
            </div>
          </div>
        );

      case 'vip':
        return (
          <div className="tab-content vip-tab">
            <div className="vip-header">
              <h3>💎 VIP特权</h3>
              <div className="vip-status">
                {vipData.isActive ? (
                  <div className="vip-active">
                    <span className="vip-badge">VIP尊享中</span>
                    <span className="vip-days">剩余{vipData.daysRemaining}天</span>
                    <span className="vip-daily">每日可领{vipData.dailyStarcoin}星源币</span>
                    <button className="claim-btn" onClick={handleClaimVipReward}>
                      立即领取
                    </button>
                  </div>
                ) : (
                  <div className="vip-inactive">
                    <span className="vip-badge">未开通VIP</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="vip-purchase">
              <h4>VIP卡购买</h4>
              <div className="vip-cards">
                {vipData.cards.map((card) => (
                  <div key={card.type} className="vip-card">
                    <h5>{card.type === 'monthly' ? '月卡' : card.type === 'quarterly' ? '季卡' : '年卡'}</h5>
                    <p className="vip-price">{card.price}积分</p>
                    <p className="vip-duration">{card.duration}天</p>
                    <button className="purchase-btn">购买</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'gacha':
        return (
          <div className="tab-content gacha-tab">
            <div className="gacha-header">
              <h3>🎲 抽取娃娃</h3>
              <div className="starcoin-display">
                <span className="starcoin-amount">{safeToLocaleString(user?.starcoin || 0)}</span>
                <span className="starcoin-label">星源币</span>
              </div>
            </div>
            
            <div className="gacha-area">
              <div className="gacha-info">
                <p>消耗：500星源币/次</p>
                <p>十连抽：5000星源币</p>
              </div>
              
              <div className="gacha-buttons">
                <button 
                  className="gacha-btn single"
                  onClick={() => handleGacha('single')}
                >
                  <span className="gacha-cost">500</span>
                  <span className="gacha-text">单次抽取</span>
                </button>
                <button 
                  className="gacha-btn ten"
                  onClick={() => handleGacha('ten')}
                >
                  <span className="gacha-cost">5000</span>
                  <span className="gacha-text">十连抽</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'production':
        return (
          <div className="tab-content production-tab">
            <div className="production-header">
              <h3>📊 产出管理</h3>
            </div>
            
            <div className="production-stats">
              <div className="stat-item">
                <span className="stat-label">出战位</span>
                <span className="stat-value">{deployedDolls.length}/5</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">今日总产出</span>
                <span className="stat-value">{safeToLocaleString(todayTotalOutput)}星源币</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">累计产出</span>
                <span className="stat-value">{safeToLocaleString(todayTotalOutput * 30)}星源币</span>
              </div>
            </div>
            
            <div className="production-list">
              <h4>出战娃娃列表</h4>
              {deployedDolls.map((doll) => (
                <div key={doll.id} className="production-item">
                  <div className="production-doll">
                    <span className="doll-emoji">{doll.emoji}</span>
                    <div className="doll-details">
                      <span className="doll-name">{doll.name}</span>
                      <span className="doll-level">Lv.{doll.level}</span>
                    </div>
                  </div>
                  <div className="production-info">
                    <span className="daily-output">{safeToFixed(doll.output)}/天</span>
                    <span className="remaining-days">剩余{doll.daysLeft}天</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="production-rules">
              <h4>产出规则</h4>
              <ul>
                <li>产出周期30天</li>
                <li>每日00:00发放</li>
                <li>离线产出计算</li>
                <li>到期后娃娃消失</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="doll-center-page">
      {/* Tab导航 */}
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab内容 */}
      <div className="tab-content-container">
        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}
        
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
};

// ✅ 确保导出正确的组件名
export default DollCenterPage;
