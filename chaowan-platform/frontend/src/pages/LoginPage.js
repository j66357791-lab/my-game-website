// src/pages/LoginPage.js - 真实注册版
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Particles from '../components/Particles';
import GlobalLoader from '../components/GlobalLoader';
import { useUser } from '../contexts/UserContext';
import api from '../config/api'; // 🔧 引入 API 工具
import './LoginPage.css';

import loginBgImage from '../images/login-bg.jpg'; 

const LoginPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  // 🔧 增加 confirmPassword 状态
  const [formData, setFormData] = useState({ email: '', password: '', username: '', confirmPassword: '' });
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 🔧 本地提交状态
  const navigate = useNavigate();

  const { login, loading: isAuthLoading, user } = useUser();

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
    setIsSubmitting(true);

    try {
      if (isLoginMode) {
        // 登录逻辑
        await login({ email: formData.email, password: formData.password });
      } else {
        // 🔧 真实注册逻辑
        
        // 1. 前端校验
        if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
          throw new Error('请填写所有必填字段');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('两次输入的密码不一致');
        }
        if (formData.password.length < 6) {
          throw new Error('密码长度至少6位');
        }

        // 2. 调用后端 API
        const res = await api.post('/auth/register', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        });

        if (res.success) {
          // 3. 注册成功，自动登录
          alert('注册成功！正在为您自动登录...');
          await login({ email: formData.email, password: formData.password });
          // 注意：登录成功后，useEffect 会自动跳转
        } else {
          throw new Error(res.message || '注册失败');
        }
      }
    } catch (error) {
      console.error('❌ 操作错误:', error);
      // 优先显示接口返回的错误信息，否则显示通用错误
      setLocalError(error.response?.data?.message || error.message || '操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setLocalError('');
    // 切换模式时清空表单
    setFormData({ email: '', password: '', username: '', confirmPassword: '' });
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
          {/* ===== 登录表单 ===== */}
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

              <button type="submit" className="login-btn" disabled={isAuthLoading || isSubmitting}>
                {isAuthLoading || isSubmitting ? '登录中...' : '登录'}
              </button>
            </form>
          </div>

          {/* ===== 注册表单 ===== */}
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
                <label htmlFor="reg-email">邮箱</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input type="email" id="reg-email" name="email" value={formData.email} onChange={handleChange} placeholder="请输入邮箱" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">密码</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input type="password" id="reg-password" name="password" value={formData.password} onChange={handleChange} placeholder="请输入密码（至少6位）" required />
                </div>
              </div>

              {/* 🔧 新增：确认密码字段 */}
              <div className="form-group">
                <label htmlFor="confirmPassword">确认密码</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔐</span>
                  <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="请再次输入密码" required />
                </div>
              </div>

              <button type="submit" className="register-btn" disabled={isAuthLoading || isSubmitting}>
                {isAuthLoading || isSubmitting ? '注册中...' : '立即注册'}
              </button>
            </form>
          </div>
        </div>

        <button className="switch-mode-btn" onClick={switchMode} disabled={isAuthLoading || isSubmitting}>
          {isLoginMode ? '还没有账号？立即注册' : '已有账号？返回登录'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
