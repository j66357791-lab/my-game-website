// frontend/src/App.js - 完整修复版本
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// 🔧 正确导入API
import api from './config/api.js';
import { UserProvider, useUser } from './contexts/UserContext';
import HomePage from './pages/HomePage';
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
import BottomNavigation from './components/BottomNavigation/BottomNavigation';
import './App.css';

// 🔧 调试API导入
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  // 检查登录状态
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('🔍 检查登录状态...');
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('❌ 未找到token，用户未登录');
          setLoading(false);
          return;
        }

        console.log('✅ 找到token，验证用户信息...');

        // 检查API对象
        if (!api || !api.getUser) {
          console.error('❌ API对象不存在');
          setError('API模块加载失败，请刷新页面');
          setLoading(false);
          return;
        }

        // 使用API验证token
        const result = await api.getUser(token);
        
        if (result.success) {
          const userData = result.data.user;
          console.log('✅ 用户验证成功:', userData);
          setUser(userData);
          
          // 同步用户数据到全局状态
          refreshData({
            points: userData.points || 0,
            cashBalance: userData.cashBalance || 0,
            dolls: userData.dolls || []
          });
          
          console.log('✅ 用户数据同步完成');
        } else {
          console.log('❌ 用户验证失败:', result.message);
          localStorage.removeItem('token');
          setError(result.message || '登录已过期');
        }
      } catch (error) {
        console.error('❌ 检查登录状态失败:', error);
        localStorage.removeItem('token');
        setError('网络错误，请重试');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [refreshData]);

  // 登录处理
  const handleLogin = (userData, token) => {
    console.log('🔑 用户登录成功:', userData);
    setUser(userData);
    setError('');
    
    // 同步用户数据到全局状态
    refreshData({
      points: userData.points || 0,
      cashBalance: userData.cashBalance || 0,
      dolls: userData.dolls || []
    });
  };

  // 退出登录
  const handleLogout = () => {
    console.log('🚪 用户退出登录');
    setUser(null);
    setError('');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // 清理全局状态
    refreshData({
      points: 0,
      cashBalance: 0,
      dolls: []
    });
  };

  // 用户更新
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

  // 数据同步函数
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

  // 判断是否为管理员
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
                
                {/* 管理员路由 */}
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
            
            {/* 根据用户角色显示不同的导航 */}
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

// 主App组件
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

// 管理员专用底部导航组件
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
