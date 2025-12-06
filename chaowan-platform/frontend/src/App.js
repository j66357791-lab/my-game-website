// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from './config/api'; // 假设api配置正确
import { UserProvider, useUser } from './contexts/UserContext';
import HomePage from './pages/HomePage';
import GameCenterPage from './pages/GameCenterPage';
import MallPage from './pages/MallPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import DollShopPage from './pages/DollShopPage';
import ShoppingPlatformPage from './pages/ShoppingPlatformPage';

// 👇 导入即将创建的管理员页面组件
import AdminUsersPage from './pages/admin/AdminUsersPage'; 
import AdminDollsPage from './pages/admin/AdminDollsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

import BottomNavigation from './components/BottomNavigation/BottomNavigation';
import './App.css';

// 🔧 V7.4.1 主应用组件 - 集成全局状态管理
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { 
    points, 
    cashBalance, 
    dolls,
    updatePoints, 
    updateCash, 
    addDoll, 
    removeDoll,
    refreshData,
    setLoading: setGlobalLoading
  } = useUser();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        const result = await api.getUser(token); 
        if (result.success) {
          const userData = result.data.user;
          setUser(userData);
          refreshData({
            points: userData.points || 0,
            cashBalance: userData.cashBalance || 0,
            dolls: userData.dolls || []
          });
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('❌ 检查登录状态失败:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    checkAuthStatus();
  }, [refreshData]);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    refreshData({
      points: userData.points || 0,
      cashBalance: userData.cashBalance || 0,
      dolls: userData.dolls || []
    });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    refreshData({ points: 0, cashBalance: 0, dolls: [] });
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    if (updatedUser.points !== undefined) updatePoints(updatedUser.points);
    if (updatedUser.cashBalance !== undefined) updateCash(updatedUser.cashBalance);
    if (updatedUser.dolls !== undefined) refreshData({ dolls: updatedUser.dolls });
  };

  const syncUserData = (newData) => {
    if (newData.points !== undefined) updatePoints(newData.points);
    if (newData.cashBalance !== undefined) updateCash(newData.cashBalance);
    if (newData.dolls !== undefined) refreshData({ dolls: newData.dolls });
    if (newData.user) setUser(newData.user);
  };

  const isAdmin = user && (user.email === 'admin@example.com' || user.role === 'admin');

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>连接云端服务中...</p>
      </div>
    );
  }

  return (
    <div className="mobile-app">
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <>
          <div className="app-content">
            <Routes>
              <Route path="/" element={<HomePage user={user} onUpdateUser={handleUpdateUser} syncUserData={syncUserData} globalPoints={points} globalCash={cashBalance} globalDolls={dolls} />} />
              <Route path="/game-center" element={<GameCenterPage user={user} onUpdateUser={handleUpdateUser} syncUserData={syncUserData} globalPoints={points} globalCash={cashBalance} />} />
              <Route path="/mall" element={<MallPage user={user} onUpdateUser={handleUpdateUser} syncUserData={syncUserData} globalPoints={points} globalCash={cashBalance} />} />
              <Route path="/profile" element={<ProfilePage user={user} onLogout={handleLogout} globalPoints={points} globalCash={cashBalance} globalDolls={dolls} syncUserData={syncUserData} />} />
              <Route path="/doll-shop" element={<DollShopPage user={user} onUpdateUser={handleUpdateUser} syncUserData={syncUserData} globalPoints={points} globalCash={cashBalance} globalDolls={dolls} />} />
              <Route path="/shopping-platform" element={<ShoppingPlatformPage user={user} globalPoints={points} globalCash={cashBalance} syncUserData={syncUserData} />} />
              
              {/* 管理员路由 - 修复后的版本 */}
              {isAdmin && (
                <>
                  <Route path="/admin/dashboard" element={<AdminDashboardPage user={user} />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} /> {/* <-- 使用真实组件 */}
                  <Route path="/admin/dolls" element={<AdminDollsPage />} /> {/* <-- 使用真实组件 */}
                  <Route path="/admin/analytics" element={<AdminAnalyticsPage />} /> {/* <-- 使用真实组件 */}
                  <Route path="/admin/settings" element={<AdminSettingsPage />} /> {/* <-- 使用真实组件 */}
                </>
              )}
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          
          {/* 🔧 修复后的导航栏渲染逻辑 */}
          {isAdmin ? <AdminBottomNavigation /> : <BottomNavigation />}
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </UserProvider>
  );
}

// 管理员专用底部导航组件 - 保持原有
const AdminBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const adminNavItems = [
    { path: '/admin/dashboard', icon: '📊', label: '概览' },
    { path: '/admin/users', icon: '👥', label: '用户' },
    { path: '/admin/dolls', icon: '🧸', label: '娃娃' },
    { path: '/profile', icon: '👤', label: '我的' }
  ];

  return (
    <div className="bottom-nav admin-nav">
      {adminNavItems.map((item) => (
        <button
          key={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default App;
