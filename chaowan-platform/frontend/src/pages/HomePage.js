// src/pages/HomePage.js - 根据《幻灵潮玩》设计策划案V2.1更新
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

const HomePage = ({ user, onUpdateUser }) => {
  const navigate = useNavigate();
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

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

  // 🎯 新增：获取星源币数据
  const starcoin = useMemo(() => {
    return safeToLocaleString(user?.starcoin || 0);
  }, [user]);

  // 🎯 新增：计算VIP剩余天数
  const vipDaysRemaining = useMemo(() => {
    // 这里应该从VIP卡数据计算，暂时使用模拟数据
    return 28; // 模拟数据
  }, []);

  // 🎯 新增：计算今日总产出
  const todayTotalOutput = useMemo(() => {
    return dolls
      .filter(doll => doll.status === 'active')
      .reduce((sum, doll) => sum + (parseFloat(doll.output || 0) || 0), 0);
  }, [dolls]);

  // 🎯 新增：计算总产出
  const totalOutput = useMemo(() => {
    return safeToLocaleString(todayTotalOutput * 30); // 假设30天总产出
  }, [todayTotalOutput]);

  // 🎯 新增：计算出战位数量
  const deployedSlots = useMemo(() => {
    return dolls.filter(doll => doll.status === 'active').length;
  }, [dolls]);

  // 🎯 新增：活动轮播数据
  const activities = useMemo(() => [
    {
      id: 1,
      title: '🔥 新Boss上线',
      desc: '千羽Boss震撼登场，击败赢取现金红包！',
      type: 'boss',
      image: '🐉'
    },
    {
      id: 2,
      title: '🎁 限时福利活动',
      desc: 'VIP卡限时优惠，每日领取更多星源币！',
      type: 'vip',
      image: '💎'
    },
    {
      id: 3,
      title: '🌟 VIP特惠宣传',
      desc: '年卡限时8折，尊享全年特权！',
      type: 'promo',
      image: '👑'
    }
  ], []);

  // 🎯 新增：快速入口数据
  const quickAccessItems = useMemo(() => [
    { id: 1, name: '娃娃中心', icon: '🧸', path: '/game-center' },
    { id: 2, name: 'Boss挑战', icon: '⚔️', path: '/game-center?tab=boss' },
    { id: 3, name: '我的娃娃', icon: '🎒', path: '/game-center?tab=backpack' },
    { id: 4, name: 'VIP特权', icon: '💎', path: '/game-center?tab=vip' },
    { id: 5, name: '合成工坊', icon: '🔨', path: '/game-center?tab=synthesis' },
    { id: 6, name: '抽取娃娃', icon: '🎲', path: '/game-center?tab=gacha' }
  ], []);

  // 🎯 新增：实时公告数据
  const announcements = useMemo(() => [
    { id: 1, content: '玩家XXX击杀了千羽Boss，获得188.8元现金红包！', type: 'boss' },
    { id: 2, content: '玩家YYY合成了Lv.5娃娃，日产出达到888星源币！', type: 'synthesis' },
    { id: 3, content: '玩家ZZZ购买了年卡VIP，每日可领取198星源币！', type: 'vip' }
  ], []);

  // 🎯 新增：轮播图自动切换
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentActivityIndex((prev) => (prev + 1) % activities.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activities.length]);

  // 🔧 收益领取成功处理
  const handleEarningsClaimed = (data) => {
    console.log('✅ 收益领取成功:', data);
    
    if (data.newPoints !== undefined) {
      const updatedUser = {
        ...user,
        points: safeToFixed(data.newPoints),
        experience: safeToFixed(data.newExperience)
      };
      onUpdateUser(updatedUser);
      
      refreshData({
        points: safeToFixed(data.newPoints)
      });
    }
  };

  // 刷新用户数据
  const refreshUserData = useCallback(async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

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
        
        refreshData({
          points: safeToFixed(userData.points || 0),
          cashBalance: safeToFixed(userData.cashBalance || 0),
          starcoin: safeToFixed(userData.starcoin || 0),
          dolls: userData.dolls || []
        });
        
        await fetchUserDolls();
      } else {
        throw new Error(result.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, onUpdateUser, refreshData, fetchUserDolls]);

  // 获取签到状态
  const fetchCheckinStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

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
      } else {
        throw new Error(result.message || '获取签到状态失败');
      }
    } catch (error) {
      console.error('❌ 获取签到状态失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchCheckinStatus();
  }, []);

  // 签到成功处理
  const handleCheckinSuccess = useCallback(async (data) => {
    console.log('✅ 签到成功:', data);
    
    if (data.userPoints !== undefined) {
      const updatedUser = {
        ...user,
        points: safeToFixed(data.userPoints),
        level: data.userLevel,
        experience: safeToFixed(data.userExperience)
      };
      onUpdateUser(updatedUser);
      
      refreshData({
        points: safeToFixed(data.userPoints)
      });
    }

    setCheckinStatus(prev => ({
      ...prev,
      hasCheckedInToday: true,
      checkinStreak: data.checkinStreak
    }));
  }, [user, onUpdateUser, refreshData]);

  // 导航到页面
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

      {/* 🎯 顶部数据展示 */}
      <div className="top-stats-card">
        <div className="stats-item">
          <span className="stats-icon">💰</span>
          <div className="stats-info">
            <span className="stats-number">{safeToLocaleString(points)}</span>
            <span className="stats-label">积分</span>
          </div>
        </div>
        <div className="stats-item">
          <span className="stats-icon">⭐</span>
          <div className="stats-info">
            <span className="stats-number">{starcoin}</span>
            <span className="stats-label">星源币</span>
          </div>
        </div>
        <div className="stats-item">
          <span className="stats-icon">👑</span>
          <div className="stats-info">
            <span className="stats-number">{vipDaysRemaining}</span>
            <span className="stats-label">VIP剩余天数</span>
          </div>
        </div>
      </div>

      {/* 🎯 活动轮播图 */}
      <div className="activity-carousel-card">
        <div className="carousel-container">
          {activities.map((activity, index) => (
            <div 
              key={activity.id} 
              className={`carousel-item ${index === currentActivityIndex ? 'active' : ''}`}
              onClick={() => navigateToPage('/game-center')}
            >
              <div className="activity-image">{activity.image}</div>
              <div className="activity-content">
                <h4 className="activity-title">{activity.title}</h4>
                <p className="activity-desc">{activity.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="carousel-dots">
          {activities.map((_, index) => (
            <span 
              key={index} 
              className={`dot ${index === currentActivityIndex ? 'active' : ''}`}
              onClick={() => setCurrentActivityIndex(index)}
            />
          ))}
        </div>
      </div>

      {/* 🎯 今日产出概览 */}
      <div className="today-output-card">
        <div className="output-header">
          <h3>📊 今日产出概览</h3>
        </div>
        <div className="output-stats">
          <div className="output-item">
            <span className="output-number">{safeToLocaleString(todayTotalOutput)}</span>
            <span className="output-label">今日产出星源币</span>
          </div>
          <div className="output-item">
            <span className="output-number">{totalOutput}</span>
            <span className="output-label">总产出星源币</span>
          </div>
          <div className="output-item">
            <span className="output-number">{deployedSlots}/5</span>
            <span className="output-label">出战位</span>
          </div>
        </div>
      </div>

      {/* 🎯 快速入口 */}
      <div className="quick-access-card">
        <div className="access-header">
          <h3>🚀 快速入口</h3>
        </div>
        <div className="access-grid">
          {quickAccessItems.map((item) => (
            <button 
              key={item.id} 
              className="access-item"
              onClick={() => navigateToPage(item.path)}
            >
              <span className="access-icon">{item.icon}</span>
              <span className="access-name">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🎯 实时公告 */}
      <div className="announcements-card">
        <div className="announcements-header">
          <h3>📢 实时公告</h3>
        </div>
        <div className="announcements-list">
          {announcements.map((announcement) => (
            <div key={announcement.id} className={`announcement-item ${announcement.type}`}>
              <span className="announcement-icon">
                {announcement.type === 'boss' && '🐉'}
                {announcement.type === 'synthesis' && '🔨'}
                {announcement.type === 'vip' && '👑'}
              </span>
              <span className="announcement-content">{announcement.content}</span>
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
          <p><strong>星源币:</strong> {starcoin}</p>
          <p><strong>VIP天数:</strong> {vipDaysRemaining}</p>
          <button onClick={refreshUserData}>手动刷新数据</button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
