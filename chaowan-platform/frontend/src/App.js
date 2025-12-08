// frontend/src/App.js - 完全修复版
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import DollShopPage from './pages/DollShopPage';
import './App.css';

// 🔧 错误边界组件
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

// 🔧 主应用组件
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔧 修复：检查登录状态
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        console.log('🔍 检查登录状态:', { 
          hasToken: !!token, 
          hasSavedUser: !!savedUser 
        });
        
        if (token && savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            console.log('✅ 用户已登录:', userData.username);
            setUser(userData);
          } catch (parseError) {
            console.error('❌ 用户数据解析失败:', parseError);
            // 清除无效数据
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          console.log('❌ 用户未登录');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ 检查登录状态失败:', error);
        setUser(null);
        // 清除无效数据
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // 🔧 修复：登录处理函数
  const handleLogin = (userData) => {
    console.log('🔐 处理登录:', userData.username);
    setUser(userData);
  };

  // 🔧 修复：登出处理函数
  const handleLogout = () => {
    console.log('🚪 处理登出');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <UserProvider>
        <BrowserRouter>
          <div className="app">
            <Routes>
              <Route 
                path="/login" 
                element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/register" 
                element={!user ? <RegisterPage onLogin={handleLogin} /> : <Navigate to="/" />} 
              />
              <Route 
                path="/" 
                element={user ? <HomePage user={user} onUpdateUser={setUser} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/profile" 
                element={user ? <ProfilePage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/mall" 
                element={user ? <DollShopPage /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/doll-shop" 
                element={user ? <DollShopPage /> : <Navigate to="/login" />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </UserProvider>
    </ErrorBoundary>
  );
}

export default App;
