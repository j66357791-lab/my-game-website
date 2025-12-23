// src/pages/LoginPage.js - 修复注册功能版
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Particles from '../components/Particles';
import GlobalLoader from '../components/GlobalLoader';
import { useUser } from '../contexts/UserContext';
import api from '../config/api'; // 引入 API 对象
import './LoginPage.css';

import loginBgImage from '../images/login-bg.jpg'; 

const LoginPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  // 使用 Context 中的 login 和 updateUser
  const { login, loading: isAuthLoading, user, updateUser } = useUser();

  // 核心逻辑：监听用户状态变化，决定何时跳转
  useEffect(() => {
    if (user && !isAuthLoading) {
      console.log('✅ 用户已登录，准备跳转到首页...');
      setTimeout(() => navigate('/'), 300);
    }
  }, [user, isAuthLoading, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    try {
      if (isLoginMode) {
        // 🔐 登录逻辑
        await login({ email: formData.email, password: formData.password });
      } else {
        // ✅ 注册逻辑 (修复部分)
        if (!formData.username || !formData.email || !formData.password) {
          setLocalError('请填写所有注册信息');
          return;
        }

        const res = await api.post('/auth/register', {
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        if (res.success) {
          // 1. 保存 Token
          localStorage.setItem('token', res.data.token);
          
          // 2. 更新 Context 中的用户信息
          updateUser(res.data.user);
          
          // 3. 提示成功并切换到登录状态或直接跳转
          alert(`🎉 注册成功！欢迎你，${res.data.user.username}`);
          
          // 可选：直接自动登录跳转，或者切换回登录界面让用户登录
          // 这里我们直接跳转首页，体验更好
          // navigate('/'); 
          // 如果想体验切换动画，可以取消下面这行的注释：
          setIsLoginMode(true); 
        } else {
          setLocalError(res.message || '注册失败');
        }
      }
    } catch (error) {
      console.error('❌ 操作错误:', error);
      // 尝试从 error 对象中获取后端返回的错误信息
      const errorMsg = error.response?.data?.message || error.message || `${isLoginMode ? '登录' : '注册'}失败，请重试`;
      setLocalError(errorMsg);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setLocalError('');
  };

  // 如果正在认证中，显示加载动画
  if (isAuthLoading) {
    return <GlobalLoader text="正在验证身份..." />;
  }

  return (
    <div 
      className="login-page" 
      style={{ 
        backgroundImage: `url(${loginBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <Particles />
      
      <div className="login-container">
        <div className="login-header">
          <h1>天创潮玩</h1>
          <p>{isLoginMode ? '欢迎回来热爱者' : '加入我们'}</p>
        </div>

        <div className="form-container">
          <div className={`form-wrapper login ${!isLoginMode ? 'shift-out' : ''}`}>
            <form onSubmit={handleSubmit} className="login-form">
              {localError && <div className="error-message">❌ {localError}</div>}
              
              <div className="form-group">
                <label htmlFor="email">邮箱</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="请输入邮箱" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">密码</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="请输入密码" required />
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={isAuthLoading}>
                {isAuthLoading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>

          <div className={`form-wrapper register ${isLoginMode ? '' : 'shift-in'}`}>
            <form onSubmit={handleSubmit} className="login-form">
              {localError && <div className="error-message">❌ {localError}</div>}
              
              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder="请输入用户名" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">邮箱</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="请输入邮箱" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">密码</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="请输入密码" required />
                </div>
              </div>

              <button type="submit" className="register-btn" disabled={isAuthLoading}>
                {isAuthLoading ? '注册中...' : '注册'}
              </button>
            </form>
          </div>
        </div>

        <button className="switch-mode-btn" onClick={switchMode} disabled={isAuthLoading}>
          {isLoginMode ? '还没有账号？立即注册' : '已有账号？返回登录'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
