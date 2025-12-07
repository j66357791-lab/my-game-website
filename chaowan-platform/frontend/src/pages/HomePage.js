// src/pages/HomePage.js - 完全修复版
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useUser } from '../contexts/UserContext';
import CheckinModal from '../components/CheckinModal/CheckinModal';
import DailyEarningsButton from '../components/common/DailyEarningsButton';
import './HomePage.css';

// 🔧 安全的数字格式化函数
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return '0.00';
  }
  
  return num.toFixed(decimals);
};

const safeToLocaleString = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return '0.00';
  }
  
  return num.toFixed(decimals).toLocaleString();
};

const HomePage = ({ user, onUpdateUser }) => {
  const navigate = useNavigate();
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [platformStats, setPlatformStats] = useState({
    totalDolls: 1234,
    totalPoints: 567890
  });

  // 🔧 使用全局状态
  const { 
    points, 
    dolls, 
    loading,
    error: globalError,
    setError: setGlobalError,
    refreshData,
    recycleDoll,
    fetchUserDolls
  } = useUser();

  // 🔧 新增：收益领取成功处理
  const handleEarningsClaimed = (data) => {
    console.log('✅ 收益领取成功:', data);
    
    // 更新用户信息
    if (data.newPoints !== undefined) {
      const updatedUser = {
        ...user,
        points: safeToFixed(data.newPoints),
        experience: safeToFixed(data.newExperience)
      };
      onUpdateUser(updatedUser);
      
      // 同步到全局状态
      refreshData({
        points: safeToFixed(data.newPoints)
      });
    }
  };

  // 🚀 优化1: 使用useMemo缓存今日总产出计算
  const todayTotalOutput = useMemo(() => {
    return dolls
      .filter(doll => doll.status === 'active')
      .reduce((sum, doll) => sum + (parseFloat(doll.output || 0) || 0), 0);
  }, [dolls]);

  // 🚀 优化2: 使用useCallback缓存刷新函数
  const refreshUserData = useCallback(async () => {
    if (refreshing) return; // 防止重复调用
    
    try {
      setRefreshing(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

      console.log('🔄 刷新用户数据...');
      
      const response = await fetch('https://tianchuang.onrender.com/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const userData = result.data.user;
        onUpdateUser(userData);
        
        // 🔧 修复：同步到全局状态
        refreshData({
          points: safeToFixed(userData.points || 0),
          cashBalance: safeToFixed(userData.cashBalance || 0),
          dolls: userData.dolls || []
        });
        
        // 🔧 修复：重新获取娃娃列表
        await fetchUserDolls();
        
        console.log('✅ 用户数据更新:', userData);
      } else {
        throw new Error(result.message || '获取用户信息失败');
      }
      
      await fetchCheckinStatus();
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, onUpdateUser, refreshData, fetchUserDolls]);

  // 🚀 优化3: 分离签到状态获取，只在初始化时调用
  const fetchCheckinStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

      console.log('🔍 获取签到状态...');
      const response = await fetch('https://tianchuang.onrender.com/api/checkin/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setCheckinStatus(result.data);
        console.log('✅ 签到状态:', result.data);
      } else {
        throw new Error(result.message || '获取签到状态失败');
      }
    } catch (error) {
      console.error('❌ 获取签到状态失败:', error);
      setError(error.message);
    }
  }, []);

  // 🚀 优化4: 只在组件挂载时获取签到状态，不再依赖points
  useEffect(() => {
    fetchCheckinStatus();
  }, []); // 移除points依赖

  // 🚀 优化5: 缓存娃娃数据
  const featuredDolls = useMemo(() => [
    { 
      id: 1, 
      name: '萌新宝宝', 
      emoji: '👶', 
      price: 50, 
      output: 0.88, 
      rarity: '⭐',
      level: 1,
      days: 60,
      tag: '热销' 
    },
    { 
      id: 2, 
      name: '元气宝贝', 
      emoji: '⚡', 
      price: 250, 
      output: 3.88, 
      rarity: '⭐⭐',
      level: 2,
      days: 70,
      tag: '推荐' 
    },
    { 
      id: 3, 
      name: '待解锁', 
      emoji: '🔒', 
      price: 0, 
      output: 0, 
      rarity: '⭐⭐⭐',
      level: 3,
      days: 0,
      tag: '敬请期待' 
    }
  ], []);

  // 缓存公告数据
  const announcements = useMemo(() => [
    { id: 1, title: '🎉 新手福利大放送', content: '新用户注册送50积分，快来加入吧！', type: 'event' },
    { id: 2, title: '🔥 限时娃娃上架', content: '稀有娃娃「元气宝贝」限时优惠中！', type: 'promo' },
    { id: 3, title: '📢 经济模型更新', content: '娃娃等级与回收系统已上线，体验更完善！', type: 'notice' }
  ], []);

  // 🚀 优化6: 缓存娃娃回收处理函数
  const handleRecycleDoll = useCallback(async (dollId) => {
    try {
      const doll = dolls.find(d => d.id === dollId);
      if (!doll) return;

      // 🔧 使用安全格式化
      const confirmMessage = `确认回收娃娃"${doll.name}"？\n\n回收获得积分：${safeToFixed(0.5 * doll.daysLeft)}\n剩余天数：${doll.daysLeft}天\n\n回收后娃娃将永久消失！`;
      
      if (window.confirm(confirmMessage)) {
        const result = await recycleDoll(dollId);
        
        if (result.success) {
          alert(`娃娃"${doll.name}"回收成功！\n获得积分：${safeToFixed(result.recyclePoints)}`);
        } else {
          throw new Error(result.error || '回收失败');
        }
      }
    } catch (error) {
      console.error('❌ 回收娃娃失败:', error);
      setError('回收娃娃失败: ' + error.message);
      alert('回收失败: ' + error.message);
    }
  }, [dolls, recycleDoll]);

  // 🚀 优化7: 缓存签到成功处理
  const handleCheckinSuccess = useCallback(async (data) => {
    console.log('✅ 签到成功:', data);
    
    // 更新用户信息
    if (data.userPoints !== undefined) {
      const updatedUser = {
        ...user,
        points: safeToFixed(data.userPoints),
        level: data.userLevel,
        experience: safeToFixed(data.userExperience)
      };
      onUpdateUser(updatedUser);
      
      // 同步到全局状态
      refreshData({
        points: safeToFixed(data.userPoints)
      });
    }

    // 更新签到状态
    setCheckinStatus(prev => ({
      ...prev,
      hasCheckedInToday: true,
      checkinStreak: data.checkinStreak
    }));
  }, [user, onUpdateUser, refreshData]);

  // 🔧 修复：使用React Router导航
  const navigateToPage = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  return (
    <div className="home-page">
      {/* 下拉刷新 */}
      <div className="pull-refresh" onClick={refreshUserData}>
        {refreshing ? '🔄 刷新中...' : '🔄 刷新'}
      </div>

      {/* 错误提示 */}
      {(error || globalError) && (
        <div className="error-message">
          <p>❌ {error || globalError}</p>
          <button onClick={() => {
            setError('');
            setGlobalError('');
          }} className="close-error">×</button>
        </div>
      )}

      {/* 平台数据总览 */}
      <div className="platform-stats-card">
        <div className="stats-header">
          <h3>🏆 平台数据</h3>
          <span className="stats-badge">实时更新</span>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon">🧸</div>
            <div className="stat-info">
              <span className="stat-number">{platformStats.totalDolls.toLocaleString()}</span>
              <span className="stat-label">总娃娃数</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-number">{platformStats.totalPoints.toLocaleString()}</span>
              <span className="stat-label">总积分池</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔧 新增：收益领取区域 */}
      <div className="earnings-card">
        <div className="earnings-header">
          <h3>🧸 娃娃收益</h3>
          <div className="earnings-badge">每日领取</div>
        </div>
        <DailyEarningsButton onEarningsClaimed={handleEarningsClaimed} />
      </div>

      {/* 我的娃娃展示 */}
      <div className="my-dolls-card">
        <div className="dolls-header">
          <h3>🧸 我的娃娃</h3>
          {dolls.length > 4 && (
            <button className="view-all-btn" onClick={() => navigateToPage('/profile')}>查看全部 ›</button>
          )}
        </div>
        {dolls.length > 0 ? (
          <div className="dolls-grid">
            {dolls.slice(0, 4).map((doll) => (
              <div key={doll.id} className="doll-item">
                <div className="doll-emoji">{doll.emoji}</div>
                <div className="doll-info">
                  <p className="doll-name">{doll.name}</p>
                  <p className="doll-output">+{safeToFixed(doll.output)}/天</p>
                  <p className="doll-days-left">剩余{doll.daysLeft}天</p>
                </div>
                <div className="doll-level">Lv.{doll.level}</div>
                <button 
                  className="mini-recycle-btn"
                  onClick={() => handleRecycleDoll(doll.id)}
                  title="回收娃娃"
                >
                  ♻️
                </button>
              </div>
            ))}
            {dolls.length > 4 && (
              <div className="more-dolls">
                <span className="more-number">+{dolls.length - 4}</span>
                <span className="more-text">更多</span>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-dolls">
            <div className="empty-icon">🎁</div>
            <p className="empty-title">还没有娃娃</p>
            <p className="empty-desc">快去商城购买你的第一个娃娃吧！</p>
            <button 
              className="go-shop-btn"
              onClick={() => navigateToPage('/mall')}
            >
              去商城看看 ›
            </button>
          </div>
        )}
      </div>

      {/* 积分状态卡片 */}
      <div className="points-status-card">
        <div className="points-header">
          <h3>💰 积分状态</h3>
          <div className="points-trend">📈 +12.5%</div>
        </div>
        <div className="points-main">
          <div className="current-points">
            {/* 🔧 使用安全格式化 */}
            <span className="points-number">{safeToLocaleString(points)}</span>
            <span className="points-label">当前积分</span>
          </div>
          <div className="today-output">
            {/* 🔧 使用安全格式化 */}
            <span className="output-number">+{safeToFixed(todayTotalOutput)}</span>
            <span className="output-label">今日产出</span>
          </div>
        </div>
        <div className="points-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '65%' }}></div>
          </div>
          <span className="progress-text">距离下一级还需 {50 - safeToFixed(user.experience || 0)} 经验</span>
        </div>
      </div>

      {/* 核心功能区 - 娃娃商店轮播 */}
      <div className="featured-dolls-card">
        <div className="featured-header">
          <h3>🛍️ 娃娃商店</h3>
          <div className="carousel-dots">
            <span className="dot active"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
        <div className="featured-carousel">
          {featuredDolls.map((doll) => (
            <div key={doll.id} className="featured-doll">
              <div className="featured-emoji">{doll.emoji}</div>
              <div className="featured-info">
                <h4 className="featured-name">{doll.name}</h4>
                <p className="featured-rarity">{doll.rarity} Lv.{doll.level}</p>
                <p className="featured-output">产出: +{safeToFixed(doll.output)}/天</p>
                <p className="featured-days">持续: {doll.days}天</p>
              </div>
              <div className="featured-price">
                {/* 🔧 使用安全格式化 */}
                <span className="price-amount">💰 {safeToFixed(doll.price)}</span>
                {doll.price > 0 ? (
                  <button className="buy-btn" onClick={() => navigateToPage('/mall')}>购买</button>
                ) : (
                  <button className="buy-btn locked" disabled>待解锁</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 活动公告 */}
      <div className="announcements-card">
        <div className="announcements-header">
          <h3>📢 活动公告</h3>
          <button className="more-announcements">更多 ›</button>
        </div>
        <div className="announcements-list">
          {announcements.map((announcement) => (
            <div key={announcement.id} className={`announcement-item ${announcement.type}`}>
              <div className="announcement-icon">
                {announcement.type === 'event' && '🎉'}
                {announcement.type === 'promo' && '🔥'}
                {announcement.type === 'notice' && '📢'}
              </div>
              <div className="announcement-content">
                <h4 className="announcement-title">{announcement.title}</h4>
                <p className="announcement-desc">{announcement.content}</p>
              </div>
              <div className="announcement-arrow">›</div>
            </div>
          ))}
        </div>
      </div>

      {/* 签到弹窗 */}
      <CheckinModal 
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
        user={user}
        onCheckinSuccess={handleCheckinSuccess}
      />

      {/* 开发调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <h4>🔧 调试信息</h4>
          <p><strong>Token:</strong> {localStorage.getItem('token') ? '已存储' : '未存储'}</p>
          <p><strong>签到状态:</strong> {checkinStatus ? JSON.stringify(checkinStatus) : '未加载'}</p>
          <p><strong>用户信息:</strong> {JSON.stringify(user, null, 2)}</p>
          <p><strong>全局积分:</strong> {safeToFixed(points)}</p>
          <p><strong>全局娃娃:</strong> {JSON.stringify(dolls, null, 2)}</p>
          <button onClick={refreshUserData}>手动刷新数据</button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
