// src/pages/DollCenterPage.js - 修复无限循环版
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
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [selectedDolls, setSelectedDolls] = useState([]);
  const [baseDoll, setBaseDoll] = useState(null);
  
  // RPG相关状态
  const [selectedDeployDoll, setSelectedDeployDoll] = useState(null);
  const [deploySlot, setDeploySlot] = useState(null);
  const [filterElement, setFilterElement] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('level');
  const [showDollDetail, setShowDollDetail] = useState(null);
  
  const { 
    points,           
    starcoin,         
    dolls, 
    user,
    refreshData,
    fetchUserDolls
  } = useUser();

  // 功能模块配置
  const featureModules = [
    {
      id: 'deploy',
      name: '娃娃派遣',
      icon: '⚔️',
      desc: 'RPG养成战斗',
      color: '#9b59b6',
      gradient: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
      action: () => handleModuleClick('deploy')
    },
    {
      id: 'backpack',
      name: '娃娃背包',
      icon: '🎒',
      desc: '查看管理娃娃',
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
      desc: '积分购买，每日66星源币',
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

  const handleModuleClick = (moduleId) => {
    console.log('点击模块:', moduleId);
    setActiveTab(moduleId);
  };

  const getBaseHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const forceRefreshUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const timestamp = Date.now();
      const url = `https://tianchuang.on-render.com/api/auth/user?t=${timestamp}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getBaseHeaders()
      });
      
      const result = await response.json();
      if (result.success) {
        if (typeof refreshData === 'function') {
          refreshData(result.data);
        }
        setLastRefreshTime(Date.now());
        return result.data;
      }
    } catch (error) {
      console.error('强制刷新用户数据出错:', error);
      setError('数据刷新失败，请检查网络连接');
    }
    return null;
  }, [refreshData]);

  const loadVipData = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const url = `https://tianchuang.on-render.com/api/vip-cards/status?t=${timestamp}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getBaseHeaders()
      });
      
      const result = await response.json();
      if (result.success) {
        setVipData(result.data);
      } else {
        setVipData({
          isActive: false,
          monthlyCards: 0,
          quarterlyCards: 0,
          yearlyCards: 0,
          totalDailyStarcoin: 0,
          canClaimDaily: false,
          lastClaimDate: null
        });
      }
    } catch (error) {
      setVipData({
        isActive: false,
        monthlyCards: 0,
        quarterlyCards: 0,
        yearlyCards: 0,
        totalDailyStarcoin: 0,
        canClaimDaily: false,
        lastClaimDate: null
      });
    }
  }, []);

  // 🔥 修复：移除 [dolls] 依赖，防止无限循环
  const loadBossData = useCallback(async () => {
    try {
      // 移除了这里的 dolls 检查，直接请求，避免依赖 dolls
      const timestamp = Date.now();
      const url = `https://tianchuang.on-render.com/api/boss/status?t=${timestamp}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getBaseHeaders()
      });
      
      const result = await response.json();
      if (result.success && result.data.hasActiveBoss) {
        setBossData(result.data);
      } else {
        setBossData({
          hasActiveBoss: false,
          message: '当前没有Boss活动'
        });
      }
    } catch (error) {
      setBossData({
        hasActiveBoss: false,
        message: 'Boss挑战功能暂未开放'
      });
    }
  }, []);

  const loadSynthesisData = useCallback(() => {
    setSynthesisData({
      availableMaterials: [],
      recipes: []
    });
  }, []);

  // 🔥 修复：只依赖 activeTab，不再依赖函数，打破循环
  useEffect(() => {
    forceRefreshUserData();
    
    if (activeTab !== 'home') {
      loadBossData();
      loadVipData();
      loadSynthesisData();
    }
  }, [activeTab]); 

  // 计算娃娃战力
  const calculateDollPower = useCallback((doll) => {
    const basePower = doll.level * 100;
    const productionBonus = parseFloat(doll.productionPerDay || 0) * 2;
    const elementBonus = getElementPowerBonus(doll.name ? doll.name.split('-')[1] : '');
    return Math.floor(basePower + productionBonus + elementBonus);
  }, []);

  const getElementPowerBonus = (element) => {
    const bonuses = {
      '金': 50,
      '木': 30,
      '水': 20,
      '火': 40,
      '土': 35
    };
    return bonuses[element] || 0;
  };

  // 筛选和排序逻辑
  const filteredAndSortedDolls = useMemo(() => {
    let filtered = dolls || [];
    
    if (filterElement !== 'all') {
      filtered = filtered.filter(doll => {
        const element = doll.name ? doll.name.split('-')[1] : '';
        return element === filterElement;
      });
    }
    
    if (filterLevel !== 'all') {
      filtered = filtered.filter(doll => doll.level === parseInt(filterLevel));
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'power':
          return calculateDollPower(b) - calculateDollPower(a);
        case 'production':
          return parseFloat(b.productionPerDay || 0) - parseFloat(a.productionPerDay || 0);
        case 'level':
        default:
          return b.level - a.level;
      }
    });
    
    return filtered;
  }, [dolls, filterElement, filterLevel, sortBy, calculateDollPower]);

  const deployedDolls = useMemo(() => {
    return (dolls || []).filter(doll => doll.isDeployed);
  }, [dolls]);

  const availableDolls = useMemo(() => {
    return (dolls || []).filter(doll => !doll.isDeployed && !doll.isRecycled);
  }, [dolls]);

  const todayTotalOutput = useMemo(() => {
    return deployedDolls.reduce((sum, doll) => sum + (parseFloat(doll.productionPerDay || 0) || 0), 0);
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
      
      const response = await fetch('https://tianchuang.on-render.com/api/vip-cards/purchase', {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify({
          type: cardType
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`购买成功！获得${cardType}VIP特权`);
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

  // VIP每日领取星源币
  const handleClaimVipReward = async () => {
    if (!vipData || !vipData.isActive) {
      setError('您还没有开通VIP特权');
      return;
    }

    if (!vipData.canClaimDaily) {
      setError('今日已领取，请明天再来');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('https://tianchuang.on-render.com/api/vip-cards/claim-daily-starcoin', {
        method: 'POST',
        headers: getBaseHeaders()
      });

      const result = await response.json();
      if (result.success) {
        alert(`领取成功！获得${result.data.totalStarcoin}星源币`);
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

  // 幸运抽取功能 - 只使用星源币
  const handleLuckyDraw = async (type) => {
    const costs = {
      single: 500,
      ten: 5000
    };

    const cost = costs[type];
    
    if ((starcoin || 0) < cost) {
      setError(`星源币不足！需要${cost}星源币\n请开通VIP每日领取`);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('https://tianchuang.on-render.com/api/dolls/lucky-draw', {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify({ 
          drawType: type === 'single' ? 'single' : 'ten' 
        })
      });

      const result = await response.json();
      if (result.success) {
        if (type === 'single') {
          const reward = result.data.reward;
          alert(`抽取成功！获得${reward.emoji} ${reward.name}`);
        } else {
          const rewards = result.data.rewards || [];
          const elementCount = {};
          rewards.forEach(r => {
            const element = r.name ? r.name.split('-')[1] : '';
            elementCount[element] = (elementCount[element] || 0) + 1;
          });
          
          const rewardTexts = Object.entries(elementCount)
            .map(([element, count]) => `${count}个${element}属性`)
            .join(', ');
          
          alert(`十连抽成功！获得: ${rewardTexts}`);
        }
        
        await forceRefreshUserData();
        if (typeof fetchUserDolls === 'function') {
          await fetchUserDolls();
        }
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
    if (!dolls || dolls.length === 0) {
      setError('需要先拥有娃娃才能参与Boss挑战！');
      return;
    }

    if (!bossData || !bossData.hasActiveBoss) {
      setError('当前没有Boss活动');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('https://tianchuang.on-render.com/api/boss/attack', {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify({
          bossId: bossData.boss.id
        })
      });

      const result = await response.json();
      if (result.success) {
        if (result.data.bossKilled) {
          alert(`🎉 Boss被击杀！获得${result.data.integralDrop}积分+${result.data.bonus}积分奖励，现金红包${result.data.cashReward}元！`);
        } else {
          alert(`攻击成功！造成${result.data.finalDamage}点伤害，获得${result.data.integralDrop}积分`);
        }
        
        await forceRefreshUserData();
        await loadBossData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('挑战失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 购买娃娃 - 只使用星源币
  const handlePurchaseDoll = async (dollLevel) => {
    try {
      setLoading(true);
      
      const response = await fetch('https://tianchuang.on-render.com/api/dolls/purchase', {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify({ dollLevel })
      });

      const result = await response.json();
      if (result.success) {
        alert(`购买成功！获得${result.data.doll.name}`);
        await forceRefreshUserData();
        if (typeof fetchUserDolls === 'function') {
          await fetchUserDolls();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('购买失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 回收娃娃 - 只给星源币
  const handleRecycleDoll = async (dollId) => {
    try {
      setLoading(true);
      
      const response = await fetch(`https://tianchuang.on-render.com/api/dolls/recycle/${dollId}`, {
        method: 'DELETE',
        headers: getBaseHeaders()
      });

      const result = await response.json();
      if (result.success) {
        alert(`回收成功！获得${result.data.recycleStarcoin}星源币`);
        await forceRefreshUserData();
        if (typeof fetchUserDolls === 'function') {
          await fetchUserDolls();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('回收失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 合成娃娃
  const handleSynthesize = async () => {
    if (!baseDoll || selectedDolls.length !== 2) {
      setError('请选择1个本体娃娃和2个材料娃娃');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('https://tianchuang.on-render.com/api/dolls/synthesize', {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify({
          dollId: baseDoll._id,
          materialDollIds: selectedDolls.map(d => d._id)
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`合成成功！娃娃升级到${result.data.upgradedDoll.level}级`);
        setBaseDoll(null);
        setSelectedDolls([]);
        await forceRefreshUserData();
        if (typeof fetchUserDolls === 'function') {
          await fetchUserDolls();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('合成失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 派遣娃娃出战
  const handleDeployDoll = async (dollId) => {
    try {
      setLoading(true);
      
      const response = await fetch('https://tianchuang.on-render.com/api/dolls/deploy', {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify({ dollId })
      });

      const result = await response.json();
      if (result.success) {
        alert('出战成功！');
        await forceRefreshUserData();
        if (typeof fetchUserDolls === 'function') {
          await fetchUserDolls();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('出战失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 召回娃娃
  const handleRecallDoll = async (dollId) => {
    try {
      setLoading(true);
      
      const response = await fetch('https://tianchuang.on-render.com/api/dolls/recall', {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify({ dollId })
      });

      const result = await response.json();
      if (result.success) {
        alert('召回成功！');
        await forceRefreshUserData();
        if (typeof fetchUserDolls === 'function') {
          await fetchUserDolls();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('召回失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 领取今日收益 - 只返回星源币
  const handleClaimDailyEarnings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://tianchuang.on-render.com/api/dolls/claim-daily-earnings', {
        method: 'POST',
        headers: getBaseHeaders()
      });

      const result = await response.json();
      if (result.success) {
        alert(`领取成功！获得${result.data.totalEarnings}星源币`);
        await forceRefreshUserData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setError('领取失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 完整的RPG风格娃娃派遣页面
  const renderDeployPage = () => (
    <div className="deploy-page rpg-style">
      <div className="deploy-header-rpg">
        <div className="header-bg">
          <div className="header-title">
            <h2>⚔️ 娃娃派遣</h2>
            <p>RPG养成战斗系统</p>
          </div>
          <div className="header-stats">
            <div className="stat-item-rpg">
              <div className="stat-icon">⚔️</div>
              <div className="stat-info">
                <div className="stat-value">{deployedDolls.length}/5</div>
                <div className="stat-label">出战位</div>
              </div>
            </div>
            <div className="stat-item-rpg">
              <div className="stat-icon">🧸</div>
              <div className="stat-info">
                <div className="stat-value">{dolls?.length || 0}</div>
                <div className="stat-label">娃娃总数</div>
              </div>
            </div>
            <div className="stat-item-rpg">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-value">{todayTotalOutput.toFixed(1)}</div>
                <div className="stat-label">今日产出</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 出战位展示 */}
      <div className="deploy-slots-rpg">
        <h3>🛡️ 出战位</h3>
        <div className="slots-grid">
          {[0, 1, 2, 3, 4].map((slot) => {
            const deployedDoll = deployedDolls[slot];
            return (
              <div 
                key={slot} 
                className={`deploy-slot-rpg ${deployedDoll ? 'occupied' : 'empty'} ${deploySlot === slot ? 'selected' : ''}`}
                onClick={() => setDeploySlot(deploySlot === slot ? null : slot)}
              >
                {deployedDoll ? (
                  <div className="deployed-doll-rpg">
                    <div className="doll-avatar">
                      <span className="doll-emoji-rpg">{deployedDoll.emoji}</span>
                      <div className="doll-level-rpg">Lv.{deployedDoll.level}</div>
                    </div>
                    <div className="doll-info-rpg">
                      <div className="doll-name-rpg">{deployedDoll.name}</div>
                      <div className="doll-power-rpg">战力: {calculateDollPower(deployedDoll)}</div>
                      <div className="doll-production-rpg">产出: {parseFloat(deployedDoll.productionPerDay || 0).toFixed(1)}/天</div>
                    </div>
                    <button 
                      className="recall-btn-rpg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecallDoll(deployedDoll._id);
                      }}
                      disabled={loading}
                    >
                      召回
                    </button>
                  </div>
                ) : (
                  <div className="empty-slot-rpg">
                    <div className="slot-icon">+</div>
                    <div className="slot-text">空位</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 筛选和排序 */}
      <div className="deploy-filters-rpg">
        <h3>🔍 筛选娃娃</h3>
        <div className="filters-container">
          <div className="filter-group-rpg">
            <label>属性：</label>
            <select value={filterElement} onChange={(e) => setFilterElement(e.target.value)}>
              <option value="all">全部属性</option>
              <option value="金">⚡ 金属性</option>
              <option value="木">🌿 木属性</option>
              <option value="水">💧 水属性</option>
              <option value="火">🔥 火属性</option>
              <option value="土">🗿 土属性</option>
            </select>
          </div>
          <div className="filter-group-rpg">
            <label>等级：</label>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="all">全部等级</option>
              <option value="1">1级</option>
              <option value="2">2级</option>
              <option value="3">3级</option>
              <option value="4">4级</option>
              <option value="5">5级</option>
              <option value="6">6级</option>
            </select>
          </div>
          <div className="filter-group-rpg">
            <label>排序：</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="level">按等级</option>
              <option value="power">按战力</option>
              <option value="production">按产出</option>
            </select>
          </div>
        </div>
        <div className="filter-results-rpg">
          <span>显示 {filteredAndSortedDolls.length} 个娃娃</span>
        </div>
      </div>

      {/* 可派遣娃娃列表 */}
      <div className="deploy-dolls-rpg">
        <h3>🧸 可派遣娃娃</h3>
        <div className="dolls-list-rpg">
          {filteredAndSortedDolls
            .filter(doll => !doll.isDeployed && !doll.isRecycled)
            .map((doll) => (
            <div 
              key={doll._id} 
              className={`doll-card-rpg ${selectedDeployDoll?._id === doll._id ? 'selected' : ''}`}
              onClick={() => setSelectedDeployDoll(doll)}
            >
              <div className="doll-card-header-rpg">
                <div className="doll-avatar-rpg">
                  <span className="doll-emoji-rpg">{doll.emoji}</span>
                  <div className="doll-level-rpg">Lv.{doll.level}</div>
                </div>
                <div className="doll-element-rpg">
                  {getElementEmoji(doll.name ? doll.name.split('-')[1] : '')}
                </div>
              </div>
              <div className="doll-card-body-rpg">
                <h4 className="doll-name-rpg">{doll.name}</h4>
                <div className="doll-stats-rpg">
                  <div className="stat-row">
                    <span className="stat-label">战力:</span>
                    <span className="stat-value power">{calculateDollPower(doll)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">产出:</span>
                    <span className="stat-value production">{parseFloat(doll.productionPerDay || 0).toFixed(1)}/天</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">剩余:</span>
                    <span className="stat-value days">{doll.remainingDays || 30}天</span>
                  </div>
                </div>
              </div>
              <div className="doll-card-actions-rpg">
                <button 
                  className="deploy-btn-rpg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeployDoll(doll._id);
                  }}
                  disabled={loading || deployedDolls.length >= 5}
                >
                  {loading ? '派遣中...' : '⚔️ 派遣出战'}
                </button>
                <button 
                  className="detail-btn-rpg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDollDetail(doll);
                  }}
                >
                  📊 详情
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 娃娃详情弹窗 */}
      {showDollDetail && (
        <div className="doll-detail-modal-rpg" onClick={() => setShowDollDetail(null)}>
          <div className="modal-content-rpg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-rpg">
              <h3>📊 娃娃详情</h3>
              <button className="close-btn-rpg" onClick={() => setShowDollDetail(null)}>×</button>
            </div>
            <div className="modal-body-rpg">
              <div className="detail-avatar-rpg">
                <span className="doll-emoji-large">{showDollDetail.emoji}</span>
                <div className="doll-level-large">Lv.{showDollDetail.level}</div>
              </div>
              <div className="detail-info-rpg">
                <h4>{showDollDetail.name}</h4>
                <div className="detail-stats-rpg">
                  <div className="detail-stat">
                    <span className="label">属性:</span>
                    <span className="value element">
                      {getElementEmoji(showDollDetail.name ? showDollDetail.name.split('-')[1] : '')}
                      {showDollDetail.name ? showDollDetail.name.split('-')[1] : ''}
                    </span>
                  </div>
                  <div className="detail-stat">
                    <span className="label">战力:</span>
                    <span className="value power">{calculateDollPower(showDollDetail)}</span>
                  </div>
                  <div className="detail-stat">
                    <span className="label">日产出:</span>
                    <span className="value production">{parseFloat(showDollDetail.productionPerDay || 0).toFixed(1)} 星源币</span>
                  </div>
                  <div className="detail-stat">
                    <span className="label">总产出:</span>
                    <span className="value">{showDollDetail.totalProduction || 525} 星源币</span>
                  </div>
                  <div className="detail-stat">
                    <span className="label">剩余天数:</span>
                    <span className="value days">{showDollDetail.remainingDays || 30} 天</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 完整的VIP页面
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
            <div className="vip-cards-info">
              <div className="card-info-item">
                <span>月卡</span>
                <strong>{vipData.monthlyCards || 0}张</strong>
              </div>
              <div className="card-info-item">
                <span>季卡</span>
                <strong>{vipData.quarterlyCards || 0}张</strong>
              </div>
              <div className="card-info-item">
                <span>年卡</span>
                <strong>{vipData.yearlyCards || 0}张</strong>
              </div>
            </div>
            <div className="vip-benefits">
              <span>每日可领取</span>
              <strong>{vipData.totalDailyStarcoin || 0}星源币</strong>
            </div>
            <div className="vip-days">
              <span>剩余天数</span>
              <strong>{vipData.remainingDays || 0}天</strong>
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
              <span>• 最多购买10张</span>
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
              <span>• 每日66星源币</span>
              <span>• 最多购买5张</span>
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
              <span>• 每日66星源币</span>
              <span>• 最多购买2张</span>
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

  // 完整的幸运抽取页面
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
          <div className="machine-desc">随机获得一级娃娃</div>
          <button 
            className="gacha-btn-modern single"
            onClick={() => handleLuckyDraw('single')}
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
          <div className="machine-desc">一次抽取10个一级娃娃</div>
          <button 
            className="gacha-btn-modern ten"
            onClick={() => handleLuckyDraw('ten')}
            disabled={loading || (starcoin || 0) < 5000}
          >
            {loading ? '抽取中...' : '🎊 十连抽'}
          </button>
        </div>
      </div>

      <div className="vip-promo-card">
        <div className="promo-header">
          <span className="promo-icon">💎</span>
          <h3>星源币不足？</h3>
        </div>
        <div className="promo-content">
          <p>开通VIP，每日免费领取星源币！</p>
          <div className="promo-benefits">
            <span>• 月卡每日66星源币</span>
            <span>• 季卡每日66星源币</span>
            <span>• 年卡每日66星源币</span>
          </div>
          <button 
            className="promo-btn"
            onClick={() => setActiveTab('vip')}
          >
            💎 立即开通VIP
          </button>
        </div>
      </div>

      <div className="doll-collection">
        <h3>📖 娃娃图鉴</h3>
        <div className="collection-grid">
          {['金', '木', '水', '火', '土'].map((element) => (
            <div key={element} className="collection-item">
              <div className={`element-icon ${element.toLowerCase()}`}>
                {getElementEmoji(element)}
              </div>
              <div className="element-name">一级娃娃-{element}</div>
              <div className="element-desc">{getElementDesc(element)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 完整的Boss挑战页面
  const renderBossPage = () => (
    <div className="boss-page">
      {/* 检查移到这里 */}
      {!dolls || dolls.length === 0 ? (
        <div className="boss-coming-soon">
          <div className="coming-soon-icon">🔒</div>
          <h2>Boss挑战功能</h2>
          <p>需要先拥有娃娃才能参与Boss挑战</p>
          <p>请先通过幸运抽取获得娃娃</p>
          <button 
            className="go-gacha-btn"
            onClick={() => setActiveTab('gacha')}
          >
            🎲 去抽取娃娃
          </button>
        </div>
      ) : !bossData ? (
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>加载Boss数据中...</p>
        </div>
      ) : !bossData.hasActiveBoss ? (
        <div className="boss-coming-soon">
          <div className="coming-soon-icon">🚧</div>
          <h2>{bossData.message || 'Boss挑战功能'}</h2>
          <p>当前没有Boss活动，敬请期待！</p>
        </div>
      ) : (
        <>
          <div className="boss-card">
            <div className="boss-header">
              <div className="boss-info">
                <h2>🐉 {bossData.boss.name}</h2>
                <div className="boss-level">Lv.{bossData.boss.level}</div>
              </div>
              <div className="boss-reward">
                <span>💰 奖励池</span>
                <div className="reward-amount">{bossData.boss.participants}人参与</div>
              </div>
            </div>

            <div className="boss-hp-section">
              <div className="hp-label">Boss血量</div>
              <div className="hp-bar-container">
                <div className="hp-bar">
                  <div 
                    className="hp-fill" 
                    style={{ width: `${(bossData.boss.currentHp / bossData.boss.maxHp) * 100}%` }}
                  />
                </div>
                <span className="hp-text">
                  {bossData.boss.currentHp.toLocaleString()}/{bossData.boss.maxHp.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="boss-stats">
              <div className="boss-stat">
                <span>⚔️ 参与人数</span>
                <strong>{bossData.boss.participants.toLocaleString()}</strong>
              </div>
              <div className="boss-stat">
                <span>⏰ 活动状态</span>
                <strong>{bossData.boss.isActive ? '进行中' : '已结束'}</strong>
              </div>
            </div>

            <button 
              className="challenge-btn"
              onClick={handleChallengeBoss}
              disabled={loading || !bossData.boss.isActive}
            >
              {loading ? '挑战中...' : !bossData.boss.isActive ? '活动已结束' : '⚔️ 挑战Boss'}
            </button>
          </div>

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

  // 完整的合成页面
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
              <div className="slot-box main">
                {baseDoll ? (
                  <div className="selected-doll">
                    <span>{baseDoll.emoji}</span>
                    <span>Lv.{baseDoll.level}</span>
                  </div>
                ) : '+'}
              </div>
            </div>
            <div className="slot-materials">
              <div className="slot-label">材料</div>
              <div className="slot-box material">
                {selectedDolls[0] ? (
                  <div className="selected-doll">
                    <span>{selectedDolls[0].emoji}</span>
                    <span>Lv.{selectedDolls[0].level}</span>
                  </div>
                ) : '+'}
              </div>
              <div className="slot-box material">
                {selectedDolls[1] ? (
                  <div className="selected-doll">
                    <span>{selectedDolls[1].emoji}</span>
                    <span>Lv.{selectedDolls[1].level}</span>
                  </div>
                ) : '+'}
              </div>
              <div className="slot-box material">=</div>
            </div>
          </div>
          
          <div className="synthesis-result">
            <div className="result-box">🎁</div>
            <div className="result-label">合成结果</div>
          </div>

          <button 
            className="synthesis-btn-modern"
            onClick={handleSynthesize}
            disabled={loading || !baseDoll || selectedDolls.length !== 2}
          >
            {loading ? '合成中...' : '🔨 开始合成'}
          </button>
        </div>

        <div className="available-dolls">
          <h4>可选娃娃</h4>
          <div className="dolls-grid">
            {availableDolls.map((doll) => (
              <div 
                key={doll._id} 
                className={`doll-selectable ${baseDoll?._id === doll._id ? 'selected-base' : ''} ${selectedDolls.some(d => d._id === doll._id) ? 'selected-material' : ''}`}
                onClick={() => {
                  if (baseDoll?._id === doll._id) {
                    setBaseDoll(null);
                  } else if (selectedDolls.some(d => d._id === doll._id)) {
                    setSelectedDolls(selectedDolls.filter(d => d._id !== doll._id));
                  } else if (!baseDoll) {
                    setBaseDoll(doll);
                  } else if (selectedDolls.length < 2) {
                    setSelectedDolls([...selectedDolls, doll]);
                  }
                }}
              >
                <span>{doll.emoji}</span>
                <span>Lv.{doll.level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // 完整的娃娃背包页面
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

      {/* 筛选器 */}
      <div className="backpack-filters">
        <h3>🔍 筛选娃娃</h3>
        <div className="filter-controls">
          <div className="filter-group">
            <label>属性筛选：</label>
            <select value={filterElement} onChange={(e) => setFilterElement(e.target.value)}>
              <option value="all">全部属性</option>
              <option value="金">金属性</option>
              <option value="木">木属性</option>
              <option value="水">水属性</option>
              <option value="火">火属性</option>
              <option value="土">土属性</option>
            </select>
          </div>
          <div className="filter-group">
            <label>等级筛选：</label>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="all">全部等级</option>
              <option value="1">1级</option>
              <option value="2">2级</option>
              <option value="3">3级</option>
              <option value="4">4级</option>
              <option value="5">5级</option>
              <option value="6">6级</option>
            </select>
          </div>
        </div>
        <div className="filter-results">
          <span>显示 {filteredAndSortedDolls.length} 个娃娃</span>
        </div>
      </div>

      <div className="backpack-actions">
        <button 
          className="action-btn-modern"
          onClick={handleClaimDailyEarnings}
          disabled={loading}
        >
          💰 领取今日收益
        </button>
      </div>

      <div className="dolls-grid-modern">
        {filteredAndSortedDolls.map((doll) => (
          <div key={doll._id} className={`doll-card-modern ${doll.isDeployed ? 'deployed' : ''} ${doll.isRecycled ? 'recycled' : ''}`}>
            <div className="doll-header">
              <div className="doll-emoji-large">{doll.emoji}</div>
              {doll.isDeployed && (
                <div className="deployed-badge">出战中</div>
              )}
              {doll.isRecycled && (
                <div className="recycled-badge">已回收</div>
              )}
            </div>
            <div className="doll-body">
              <h4 className="doll-name-modern">{doll.name}</h4>
              <div className="doll-stats">
                <span className="doll-level">Lv.{doll.level}</span>
                <span className="doll-output">⭐ {parseFloat(doll.productionPerDay || 0).toFixed(1)}/天</span>
              </div>
              <div className="doll-days">
                剩余 {doll.remainingDays || 30} 天
              </div>
            </div>
            <div className="doll-actions">
              {doll.isDeployed ? (
                <button 
                  className="action-btn-modern recall"
                  onClick={() => handleRecallDoll(doll._id)}
                  disabled={loading}
                >
                  召回
                </button>
              ) : (
                <button 
                  className="action-btn-modern deploy"
                  onClick={() => handleDeployDoll(doll._id)}
                  disabled={loading || doll.isRecycled || deployedDolls.length >= 5}
                >
                  出战
                </button>
              )}
              {!doll.isDeployed && !doll.isRecycled && (
                <button 
                  className="action-btn-modern recycle"
                  onClick={() => handleRecycleDoll(doll._id)}
                  disabled={loading}
                >
                  回收
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 完整的产出管理页面
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
        {deployedDolls.length === 0 ? (
          <div className="no-production">
            <p>暂无娃娃出战，派遣娃娃开始产出星源币！</p>
            <button 
              className="action-btn-modern"
              onClick={() => setActiveTab('deploy')}
            >
              ⚔️ 去派遣娃娃
            </button>
          </div>
        ) : (
          deployedDolls.map((doll) => (
            <div key={doll._id} className="production-item-modern">
              <div className="production-doll">
                <span className="doll-emoji">{doll.emoji}</span>
                <div className="doll-info">
                  <div className="doll-name">{doll.name}</div>
                  <div className="doll-level">Lv.{doll.level}</div>
                  <div className="doll-element">属性: {doll.name ? doll.name.split('-')[1] : '未知'}</div>
                </div>
              </div>
              <div className="production-output">
                <div className="output-amount">+{parseFloat(doll.productionPerDay || 0).toFixed(1)}/天</div>
                <div className="output-remaining">剩余{doll.remainingDays || 30}天</div>
                <div className="output-total">累计产出: {parseFloat(doll.totalProduced || 0).toFixed(1)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="production-actions">
        <button 
          className="action-btn-modern"
          onClick={handleClaimDailyEarnings}
          disabled={loading || deployedDolls.length === 0}
        >
          💰 领取今日收益
        </button>
      </div>
    </div>
  );

  // 完整的首页
  const renderHomePage = () => (
    <div className="home-page">
      <div className="refresh-section">
        <button 
          className="refresh-btn"
          onClick={() => {
            forceRefreshUserData();
            loadVipData();
            loadBossData();
          }}
          disabled={loading}
        >
          {loading ? '刷新中...' : '🔄 刷新数据'}
        </button>
        {lastRefreshTime > 0 && (
          <div className="refresh-status">
            最后更新: {new Date(lastRefreshTime).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="currency-display">
        <div className="currency-item points">
          <span className="currency-icon">💰</span>
          <div className="currency-info">
            <span className="currency-label">积分</span>
            <span className="currency-amount">{points?.toLocaleString() || 0}</span>
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

      <div className="hero-banner">
        <div className="hero-content">
          <h1>🧸 幻灵潮玩</h1>
          <p>收集娃娃，征战Boss，成为最强训练师！</p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{dolls?.length || 0}</span>
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

      <div className="quick-actions">
        <h2>🚀 快速操作</h2>
        <div className="action-buttons">
          <button 
            className="action-btn primary"
            onClick={() => handleModuleClick('deploy')}
          >
            ⚔️ 娃娃派遣
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => handleModuleClick('gacha')}
          >
            🎲 幸运抽取
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

  const getElementDesc = (element) => {
    const descs = {
      '金': '金属性娃娃，可合成升级',
      '木': '木属性娃娃，可合成升级',
      '水': '水属性娃娃，可合成升级',
      '火': '火属性娃娃，可合成升级',
      '土': '土属性娃娃，可合成升级'
    };
    return descs[element] || '未知属性';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'deploy':
        return renderDeployPage();
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
