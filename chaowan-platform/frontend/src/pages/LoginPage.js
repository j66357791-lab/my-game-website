// src/pages/LoginPage.js - 全新升级版
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api.js';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '', // 用于注册
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
        // --- 登录逻辑 ---
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
        // --- 注册逻辑 (待你对接) ---
        console.log('🚀 开始注册请求...');
        // const data = await api.register(formData.username, formData.email, formData.password);
        // 模拟注册成功
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('注册功能待后端对接，这里模拟成功！');
        setIsLoginMode(true); // 注册成功后跳转到登录页
        setError(''); // 清除错误
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
    setError(''); // 切换模式时清除错误信息
  };

  return (
    <div className="login-page">
      {loading && (
        <div className="global-loader">
          <div className="loader-spinner"></div>
        </div>
      )}

      <div className="login-container">
        <div className="login-header">
          <h1>🎮 潮玩虚拟生态</h1>
          <p>{isLoginMode ? '欢迎回来' : '加入我们'}</p>
        </div>

        <div className="form-container">
          {/* 登录表单 */}
          <div className={`form-wrapper login ${!isLoginMode ? 'shift-out' : ''}`}>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">❌ {error}</div>}
              
              <div className="form-group">
                <label htmlFor="email">邮箱</label>
                <span className="input-icon">📧</span>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="请输入邮箱" required disabled={loading} />
              </div>

              <div className="form-group">
                <label htmlFor="password">密码</label>
                <span className="input-icon">🔒</span>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="请输入密码" required disabled={loading} />
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>

          {/* 注册表单 */}
          <div className={`form-wrapper register ${isLoginMode ? '' : 'shift-in'}`}>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">❌ {error}</div>}

              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <span className="input-icon">👤</span>
                <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder="请输入用户名" required disabled={loading} />
              </div>

              <div className="form-group">
                <label htmlFor="email">邮箱</label>
                <span className="input-icon">📧</span>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="请输入邮箱" required disabled={loading} />
              </div>

              <div className="form-group">
                <label htmlFor="password">密码</label>
                <span className="input-icon">🔒</span>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="请输入密码" required disabled={loading} />
              </div>

              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? '注册中...' : '注册'}
              </button>
            </form>
          </div>
        </div>

        {/* 切换登录/注册按钮 */}
        <button className="switch-mode-btn" onClick={switchMode} disabled={loading}>
          {isLoginMode ? '还没有账号？立即注册' : '已有账号？返回登录'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
