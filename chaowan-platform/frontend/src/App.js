// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import api from './config/api.js';
import { UserProvider, useUser } from './contexts/UserContext';
import { MysteryCardProvider } from './contexts/MysteryCardContext';
import HomePage from './pages/HomePage';
import DollCenterPage from './pages/DollCenterPage';
import GameCenterPage from './pages/GameCenterPage';
import MallPage from './pages/MallPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminDollsPage from './pages/admin/AdminDollsPage';
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage';
import DollShopPage from './pages/DollShopPage';
import ShoppingPlatformPage from './pages/ShoppingPlatformPage';
import BlindBoxActivityPage from './pages/BlindBoxActivityPage';
import RefiningFactoryPage from './pages/RefiningFactoryPage';
import BottomNavigation from './components/BottomNavigation/BottomNavigation';
import TurtleRabbitRacePage from './pages/TurtleRabbitRacePage';
import MysteryCardPage from './pages/MysteryCardPage';

// ✅ 新增导入：商城相关页面
import ProductDetailPage from './pages/ProductDetailPage';
import MyOrdersPage from './pages/MyOrdersPage';

import './App.css';

console.log('🔍 App.js中的api对象:', typeof api, api);

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ React错误边界捕获:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>❌ 页面出现错误</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 主应用组件
function AppContent() {
  const { 
    user, 
    loading, 
    error, 
    setError,
    login,
    logout,
    updateUser,
    points, 
    cashBalance, 
    dolls,
    updatePoints, 
    updateCash, 
    addDoll, 
    removeDoll,
    refreshData
  } = useUser();

  const handleLogin = async (userData, token) => {
    console.log('🔑 用户登录成功:', userData);
    localStorage.setItem('token', token);
    try {
      await login({ email: userData.email, password: '' });
      console.log('✅ 用户数据同步成功');
    } catch (error) {
      console.error('❌ 同步用户数据失败:', error);
    }
  };

  const handleLogout = () => {
    console.log('🚪 用户退出登录');
    logout();
  };

  const handleUpdateUser = (updatedUser) => {
    console.log('🔄 更新用户信息:', updatedUser);
    updateUser(updatedUser);
  };

  const syncUserData = (newData) => {
    try {
      refreshData(newData);
      console.log('✅ 数据同步成功');
    } catch (error) {
      console.error('❌ 数据同步失败:', error);
    }
  };

  const isAdmin = user && (user.email === 'admin@example.com' || user.role === 'admin');

  console.log('📊 App状态:', { 
    loading, 
    user: !!user, 
    isAdmin,
    userEmail: user?.email,
    userRole: user?.role,
    globalPoints: points,
    globalCash: cashBalance,
    globalDollsCount: dolls?.length || 0,
    hasError: !!error
  });

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>连接云端服务中...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="mobile-app">
        {!user ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <>
            <div className="app-content">
              {error && (
                <div className="global-error">
                  <p>❌ {error}</p>
                  <button onClick={() => setError('')}>×</button>
                </div>
              )}
              
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <HomePage 
                      user={user} 
                      onUpdateUser={handleUpdateUser}
                      globalPoints={points}
                      globalCash={cashBalance}
                      globalDolls={dolls}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route 
                  path="/doll-center" 
                  element={
                    <DollCenterPage 
                      user={user} 
                      onUpdateUser={handleUpdateUser}
                      globalPoints={points}
                      globalCash={cashBalance}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route 
                  path="/game-center" 
                  element={
                    <GameCenterPage 
                      user={user} 
                      onUpdateUser={handleUpdateUser}
                      globalPoints={points}
                      globalCash={cashBalance}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route 
                  path="/mystery-card" 
                  element={
                    <MysteryCardProvider>
                      <MysteryCardPage 
                        user={user} 
                        onUpdateUser={handleUpdateUser}
                        globalPoints={points}
                        globalCash={cashBalance}
                        globalDolls={dolls}
                        syncUserData={syncUserData}
                      />
                    </MysteryCardProvider>
                  } 
                />
                
                <Route 
                  path="/turtle-rabbit-race" 
                  element={
                    <TurtleRabbitRacePage 
                      user={user} 
                      onUpdateUser={handleUpdateUser}
                      globalPoints={points}
                      globalCash={cashBalance}
                      globalDolls={dolls}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route 
                  path="/mall" 
                  element={
                    <MallPage 
                      user={user} 
                      onUpdateUser={handleUpdateUser}
                      globalPoints={points}
                      globalCash={cashBalance}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route 
                  path="/profile" 
                  element={
                    <ProfilePage 
                      user={user} 
                      onLogout={handleLogout}
                      globalPoints={points}
                      globalCash={cashBalance}
                      globalDolls={dolls}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route 
                  path="/doll-shop" 
                  element={
                    <DollShopPage 
                      user={user} 
                      onUpdateUser={handleUpdateUser}
                      globalPoints={points}
                      globalCash={cashBalance}
                      globalDolls={dolls}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route 
                  path="/shopping-platform" 
                  element={
                    <ShoppingPlatformPage 
                      user={user}
                      globalPoints={points}
                      globalCash={cashBalance}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />

                {/* ✅ 新增：商城路由 */}
                <Route 
                  path="/product/:id" 
                  element={
                    <ProductDetailPage 
                      user={user}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route 
                  path="/my-orders" 
                  element={
                    <MyOrdersPage 
                      user={user}
                    /> 
                  } 
                />
                
                <Route 
                  path="/blindBox-activity" 
                  element={
                    <BlindBoxActivityPage 
                      user={user} 
                      onUpdateUser={handleUpdateUser}
                      globalPoints={points}
                      globalCash={cashBalance}
                      syncUserData={syncUserData}
                    /> 
                  } 
                />
                
                <Route
                  path="/refining-factory" 
                  element={
                    <RefiningFactoryPage 
                      user={user}
                      onUpdateUser={handleUpdateUser}
                      globalPoints={points}
                      syncUserData={syncUserData}
                    /> 
                  }
                />
                
                {isAdmin && (
                  <>
                    <Route 
                      path="/admin/dashboard" 
                      element={<AdminDashboardPage user={user} onUpdateUser={handleUpdateUser} />} 
                    />
                    <Route 
                      path="/admin/users" 
                      element={<AdminUsersPage user={user} onUpdateUser={handleUpdateUser} />} 
                    />
                    <Route 
                      path="/admin/dolls" 
                      element={<AdminDollsPage user={user} onUpdateUser={handleUpdateUser} />} 
                    />
                    <Route 
                      path="/admin/withdrawals" 
                      element={<AdminWithdrawalsPage user={user} onUpdateUser={handleUpdateUser} />} 
                    />
                    <Route 
                      path="/admin/analytics" 
                      element={<div className="admin-placeholder"><h2>📊 数据分析</h2><p>功能开发中...</p></div>} 
                    />
                    <Route 
                      path="/admin/settings" 
                      element={<div className="admin-placeholder"><h2>⚙️ 系统设置</h2><p>功能开发中...</p></div>} 
                    />
                  </>
                )}
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            
            {isAdmin ? (
              <AdminBottomNavigation />
            ) : (
              <BottomNavigation />
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </UserProvider>
    </ErrorBoundary>
  );
}

const AdminBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const adminNavItems = [
    { path: '/admin/dashboard', icon: '📊', label: '概览' },
    { path: '/admin/users', icon: '👥', label: '用户' },
    { path: '/admin/dolls', icon: '🧸', label: '娃娃' },
    { path: '/admin/withdrawals', icon: '💰', label: '提现' },
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
