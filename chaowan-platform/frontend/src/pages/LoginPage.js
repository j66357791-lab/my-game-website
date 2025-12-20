// src/pages/LoginPage.js - 修复版
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api.js';
import Particles from '../components/Particles';
import './LoginPage.css';

// 👇 1. 在这里导入你的背景图片
import loginBgImage from '../images/login-bg.jpg'; 

const LoginPage = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLoginMode) {
        console.log('🔐 开始登录请求...');
        const data = await api.login(formData.email, formData.password);
        if (data.success) {
          const { user, token } = data.data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          if (user.cashBalance !== undefined) {
            localStorage.setItem('userCashBalance', user.cashBalance.toString());
          }
          if (typeof onLogin === 'function') {
            onLogin(user, token);
          }
          setTimeout(() => navigate('/'), 100);
        } else {
          throw new Error(data.message || '登录失败');
        }
      } else {
        console.log('🚀 开始注册请求...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('注册功能待后端对接，这里模拟成功！');
        setIsLoginMode(true);
        setError('');
      }
    } catch (error) {
      console.error('❌ 操作错误:', error);
      setError(error.message || `${isLoginMode ? '登录' : '注册'}失败，请重试`);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
  };

  return (
    // 👇 2. 在这里通过 style 属性应用背景图片
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

      {loading && (
        <div className="global-loader-v2">
          <div className="loader-content">
            <div className="loader-logo">🎮</div>
            <div className="loader-text">连接中...</div>
            <div className="loader-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      <div className="login-container">
        <div className="login-header">
          <h1>潮玩虚拟生态</h1>
          <p>{isLoginMode ? '欢迎回来' : '加入我们'}</p>
        </div>

        <div className="form-container">
          <div className={`form-wrapper login ${!isLoginMode ? 'shift-out' : ''}`}>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">❌ {error}</div>}
              
              <div className="form-group">
                <label htmlFor="email">邮箱</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="请输入邮箱" required disabled={loading} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">密码</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="请输入密码" required disabled={loading} />
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>

          <div className={`form-wrapper register ${isLoginMode ? '' : 'shift-in'}`}>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">❌ {error}</div>}

              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder="请输入用户名" required disabled={loading} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">邮箱</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="请输入邮箱" required disabled={loading} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">密码</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="请输入密码" required disabled={loading} />
                </div>
              </div>

              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? '注册中...' : '注册'}
              </button>
            </form>
          </div>
        </div>

        <button className="switch-mode-btn" onClick={switchMode} disabled={loading}>
          {isLoginMode ? '还没有账号？立即注册' : '已有账号？返回登录'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
