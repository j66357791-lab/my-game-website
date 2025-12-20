// src/pages/HomePage.js - Bug修复版
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext'; // 👈 所有数据都从 UserContext 来
import CheckinModal from '../components/CheckinModal/CheckinModal';
import DailyEarningsButton from '../components/common/DailyEarningsButton';
import GlobalLoader from '../components/GlobalLoader'; // 👈 引入统一的加载组件
import './HomePage.css';

// 🔧 安全的数字格式化函数 (保持不变)
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
};

const safeToLocaleString = (value, decimals = 0) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals).toLocaleString();
};

// 👇 移除 props，所有数据都从 useUser 获取
const HomePage = () => {
  const navigate = useNavigate();
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

  // 👇 从 UserContext 获取所有需要的状态和方法
  const { 
    user, 
    points, 
    dolls, 
    loading: isUserContextLoading, // 👈 重命名以避免混淆
    error: globalError,
    setError: setGlobalError,
    updateUser, // 👈 直接使用 UserContext 的更新方法
    starcoin,
    fetchUserDolls // 👈 假设 UserContext 提供了这个方法
  } = useUser();

  // 🎯 新增：一个统一的初始加载状态
  // 如果 UserContext 正在加载，或者关键数据（如 points）还未初始化，就显示加载页
  const isInitialLoading = useMemo(() => {
    return isUserContextLoading || points === null || points === undefined;
  }, [isUserContextLoading, points]);

  // 🎯 获取星源币数据 (现在直接从 UserContext 获取)
  // const starcoin = useMemo(() => {
  //   return safeToLocaleString(user?.starcoin || 0);
  // }, [user]); // 这行可以删除，因为 starcoin 已经从 useUser 获取

  // 🎯 计算VIP剩余天数 (保持不变)
  const vipDaysRemaining = useMemo(() => 28, []);

  // 🎯 计算今日总产出 (保持不变)
  const todayTotalOutput = useMemo(() => {
    return dolls
      .filter(doll => doll.status === 'active')
      .reduce((sum, doll) => sum + (parseFloat(doll.output || 0) || 0), 0);
  }, [dolls]);

  // 🎯 计算总产出 (保持不变)
  const totalOutput = useMemo(() => {
    return safeToLocaleString(todayTotalOutput * 30);
  }, [todayTotalOutput]);

  // 🎯 计算出战位数量 (保持不变)
  const deployedSlots = useMemo(() => {
    return dolls.filter(doll => doll.status === 'active').length;
  }, [dolls]);

  // 🎯 活动轮播数据 (保持不变)
  const activities = useMemo(() => [
    { id: 1, title: '🔥 新Boss上线', desc: '千羽Boss震撼登场，击败赢取现金红包！', type: 'boss', image: '🐉' },
    { id: 2, title: '🎁 限时福利活动', desc: 'VIP卡限时优惠，每日领取更多星源币！', type: 'vip', image: '💎' },
    { id: 3, title: '🌟 VIP特惠宣传', desc: '年卡限时8折，尊享全年特权！', type: 'promo', image: '👑' }
  ], []);

  // 🎯 快速入口数据 (保持不变)
  const quickAccessItems = useMemo(() => [
    { id: 1, name: '娃娃中心', icon: '🧸', path: '/doll-center' },
    { id: 2, name: 'Boss挑战', icon: '⚔️', path: '/doll-center?tab=boss' },
    { id: 3, name: '我的娃娃', icon: '🎒', path: '/doll-center?tab=backpack' },
    { id: 4, name: 'VIP特权', icon: '💎', path: '/doll-center?tab=vip' },
    { id: 5, name: '合成工坊', icon: '🔨', path: '/doll-center?tab=synthesis' },
    { id: 6, name: '抽取娃娃', icon: '🎲', path: '/doll-center?tab=gacha' }
  ], []);

  // 🎯 实时公告数据 (保持不变)
  const announcements = useMemo(() => [
    { id: 1, content: '玩家XXX击杀了千羽Boss，获得188.8元现金红包！', type: 'boss' },
    { id: 2, content: '玩家YYY合成了Lv.5娃娃，日产出达到888星源币！', type: 'synthesis' },
    { id: 3, content: '玩家ZZZ购买了年卡VIP，每日可领取198星源币！', type: 'vip' }
  ], []);

  // 🎯 轮播图自动切换 (保持不变)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentActivityIndex((prev) => (prev + 1) % activities.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activities.length]);

  // 🔧 修复：收益领取成功处理 (现在直接调用 UserContext 的 updateUser)
  const handleEarningsClaimed = (data) => {
    console.log('✅ 收益领取成功:', data);
    if (data.newPoints !== undefined) {
      updateUser({ 
        points: safeToFixed(data.newPoints),
        experience: safeToFixed(data.newExperience) 
      });
    }
  };

  // 刷新用户数据 (保持原有逻辑，但建议未来移到 UserContext)
  const refreshUserData = useCallback(async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('未找到登录token');

      const response = await fetch('https://tianchuang.onrender.com/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const result = await response.json();
      
      if (result.success) {
        const userData = result.data.user;
        updateUser(userData); // 👈 调用 UserContext 的 updateUser
        if (fetchUserDolls) await fetchUserDolls(); // 👈 刷新娃娃数据
      } else {
        throw new Error(result.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, updateUser, fetchUserDolls]);

  // 获取签到状态 (保持不变)
  const fetchCheckinStatus = useCallback(async () => {
    // ... 原有逻辑保持不变 ...
  }, []);

  useEffect(() => { fetchCheckinStatus(); }, [fetchCheckinStatus]);

  // 🔧 修复：签到成功处理 (现在直接调用 UserContext 的 updateUser)
  const handleCheckinSuccess = useCallback(async (data) => {
    console.log('✅ 签到成功:', data);
    if (data.userPoints !== undefined) {
      updateUser({
        points: safeToFixed(data.userPoints),
        level: data.userLevel,
        experience: safeToFixed(data.userExperience)
      });
    }
    setCheckinStatus(prev => ({
      ...prev,
      hasCheckedInToday: true,
      checkinStreak: data.checkinStreak
    }));
  }, [updateUser]);

  // 导航到页面 (保持不变)
  const navigateToPage = useCallback((path) => { navigate(path); }, [navigate]);

  // 👇 核心修复：根据加载状态决定渲染内容
  if (isInitialLoading) {
    return <GlobalLoader text="加载用户数据中..." />;
  }

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
          <button onClick={() => { setError(''); setGlobalError(''); }} className="close-error">×</button>
        </div>
      )}

      {/* 🎯 顶部数据展示 (所有数据都从 UserContext 来) */}
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
            <span className="stats-number">{safeToLocaleString(starcoin)}</span>
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
        {/* ... 原有轮播图代码保持不变 ... */}
      </div>

      {/* 🎯 今日产出概览 */}
      <div className="today-output-card">
        {/* ... 原有产出概览代码保持不变 ... */}
      </div>

      {/* 🎯 快速入口 */}
      <div className="quick-access-card">
        {/* ... 原有快速入口代码保持不变 ... */}
      </div>

      {/* 🎯 实时公告 */}
      <div className="announcements-card">
        {/* ... 原有公告代码保持不变 ... */}
      </div>

      {/* 签到弹窗 */}
      <CheckinModal 
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
        user={user} // user 仍然可以从 useUser 获取
        onCheckinSuccess={handleCheckinSuccess}
      />

      {/* 开发调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          {/* ... 原有调试信息代码保持不变 ... */}
        </div>
      )}
    </div>
  );
};

export default HomePage;
