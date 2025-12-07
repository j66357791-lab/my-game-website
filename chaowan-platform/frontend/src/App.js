// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from './config/api';
import { UserProvider, useUser } from './contexts/UserContext';
import HomePage from './pages/HomePage';
import GameCenterPage from './pages/GameCenterPage';
import MallPage from './pages/MallPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminDollsPage from './pages/admin/AdminDollsPage';
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage'; // 🔧 新增
import DollShopPage from './pages/DollShopPage';
import ShoppingPlatformPage from './pages/ShoppingPlatformPage';
import BottomNavigation from './components/BottomNavigation/BottomNavigation';
import './App.css';

// 🔧 V7.4.1 主应用组件 - 集成全局状态管理
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { 
    // 全局状态
    points, 
    cashBalance, 
    dolls,
    // 全局actions
    updatePoints, 
    updateCash, 
    addDoll, 
    removeDoll,
    refreshData,
    setLoading: setGlobalLoading
  } = useUser();

  // 检查登录状态 - 保持原有逻辑
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }

        // 使用云端API验证token - 保持原有逻辑
        const result = await api.getUser(token);
        
        if (result.success) {
          const userData = result.data.user;
          setUser(userData);
          
          // 🔧 V7.4.1 同步用户数据到全局状态
          refreshData({
            points: userData.points || 0,
            cashBalance: userData.cashBalance || 0,
            dolls: userData.dolls || []
          });
          
          console.log('✅ 用户已登录:', userData);
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

  // 🔧 V7.4.1 增强的登录处理 - 同步到全局状态
  const handleLogin = (userData, token) => {
    console.log('🔑 用户登录成功:', userData);
    setUser(userData);
    localStorage.setItem('token', token);
    
    // 同步用户数据到全局状态
    refreshData({
      points: userData.points || 0,
      cashBalance: userData.cashBalance || 0,
      dolls: userData.dolls || []
    });
  };

  // 🔧 V7.4.1 增强的退出登录 - 清理全局状态
  const handleLogout = () => {
    console.log('🚪 用户退出登录');
    setUser(null);
    localStorage.removeItem('token');
    
    // 清理全局状态
    refreshData({
      points: 0,
      cashBalance: 0,
      dolls: []
    });
  };

  // 🔧 V7.4.1 增强的用户更新 - 同步到全局状态
  const handleUpdateUser = (updatedUser) => {
    console.log('🔄 更新用户信息:', updatedUser);
    setUser(updatedUser);
    
    // 同步更新到全局状态
    if (updatedUser.points !== undefined) {
      updatePoints(updatedUser.points);
    }
    if (updatedUser.cashBalance !== undefined) {
      updateCash(updatedUser.cashBalance);
    }
    if (updatedUser.dolls !== undefined) {
      refreshData({ dolls: updatedUser.dolls });
    }
  };

  // 🔧 V7.4.1 数据同步函数 - 供页面组件使用
  const syncUserData = (newData) => {
    if (newData.points !== undefined) {
      updatePoints(newData.points);
      localStorage.setItem('userPoints', newData.points.toString());
    }
    if (newData.cashBalance !== undefined) {
      updateCash(newData.cashBalance);
      localStorage.setItem('userCashBalance', newData.cashBalance.toString());
    }
    if (newData.dolls !== undefined) {
      refreshData({ dolls: newData.dolls });
      localStorage.setItem('userDolls', JSON.stringify(newData.dolls));
    }
    if (newData.user) {
      setUser(newData.user);
      localStorage.setItem('user', JSON.stringify(newData.user));
    }
  };

  // 判断是否为管理员 - 保持原有逻辑
  const isAdmin = user && (user.email === 'admin@example.com' || user.role === 'admin');

  console.log('📊 App状态:', { 
    loading, 
    user: !!user, 
    isAdmin,
    userEmail: user?.email,
    userRole: user?.role,
    // 🔧 V7.4.1 新增全局状态日志
    globalPoints: points,
    globalCash: cashBalance,
    globalDollsCount: dolls?.length || 0
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
    <div className="mobile-app">
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <>
          <div className="app-content">
            <Routes>
              <Route 
                path="/" 
                element={
                  <HomePage 
                    user={user} 
                    onUpdateUser={handleUpdateUser}
                    // 🔧 V7.4.1 传递全局状态和同步函数
                    globalPoints={points}
                    globalCash={cashBalance}
                    globalDolls={dolls}
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
              
              {/* V7.3.2 新增路由 - 保持原有 */}
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
              
              {/* 🔧 管理员路由 - 完整版本 */}
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
          
          {/* 根据用户角色显示不同的导航 - 保持原有 */}
          {isAdmin ? (
            <AdminBottomNavigation />
          ) : (
            <BottomNavigation />
          )}
        </>
      )}
    </div>
  );
}

// 🔧 V7.4.1 主App组件 - 包装UserProvider
function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </UserProvider>
  );
}

// 管理员专用底部导航组件 - 更新版本
const AdminBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const adminNavItems = [
    { path: '/admin/dashboard', icon: '📊', label: '概览' },
    { path: '/admin/users', icon: '👥', label: '用户' },
    { path: '/admin/dolls', icon: '🧸', label: '娃娃' },
    { path: '/admin/withdrawals', icon: '💰', label: '提现' }, // 🔧 新增
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
