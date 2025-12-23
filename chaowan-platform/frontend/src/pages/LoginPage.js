// src/pages/LoginPage.js - 完整科幻机甲+音效版
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Particles from '../components/Particles';
import GlobalLoader from '../components/GlobalLoader';
import { useUser } from '../contexts/UserContext';
import api from '../config/api';
// 导入音效工具
import { playSound, addSoundToElement } from '../utils/soundEffects';
import './LoginPage.css';

import loginBgImage from '../images/login-bg.jpg'; 

const LoginPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // 使用 ref 引用 DOM 元素
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const loginBtnRef = useRef(null);
  const registerBtnRef = useRef(null);
  const switchBtnRef = useRef(null);
  const submitBtnRef = useRef(null);

  // 使用 Context 中的 login 和 updateUser
  const { login, loading: isAuthLoading, user, updateUser } = useUser();

  // 核心逻辑：监听用户状态变化，决定何时跳转
  useEffect(() => {
    if (user && !isAuthLoading) {
      console.log('✅ 用户已登录，准备跳转到首页...');
      // 播放成功音效
      playSound('success');
      setTimeout(() => navigate('/'), 500);
    }
  }, [user, isAuthLoading, navigate]);

  // 绑定音效到DOM元素
  useEffect(() => {
    // 为输入框绑定聚焦音效
    if (emailInputRef.current) {
      emailInputRef.current.addEventListener('focus', () => {
        playSound('focus');
        emailInputRef.current.parentElement.classList.add('focus-sound');
        setTimeout(() => {
          if (emailInputRef.current?.parentElement) {
            emailInputRef.current.parentElement.classList.remove('focus-sound');
          }
        }, 300);
      });
    }
    
    if (passwordInputRef.current) {
      passwordInputRef.current.addEventListener('focus', () => {
        playSound('focus');
        passwordInputRef.current.parentElement.classList.add('focus-sound');
        setTimeout(() => {
          if (passwordInputRef.current?.parentElement) {
            passwordInputRef.current.parentElement.classList.remove('focus-sound');
          }
        }, 300);
      });
    }
    
    if (usernameInputRef.current) {
      usernameInputRef.current.addEventListener('focus', () => {
        playSound('focus');
        usernameInputRef.current.parentElement.classList.add('focus-sound');
        setTimeout(() => {
          if (usernameInputRef.current?.parentElement) {
            usernameInputRef.current.parentElement.classList.remove('focus-sound');
          }
        }, 300);
      });
    }

    // 为按钮绑定点击音效
    const handleButtonClick = (btnRef) => {
      if (btnRef.current) {
        btnRef.current.addEventListener('click', () => {
          playSound('click');
          btnRef.current.classList.add('click-sound');
          setTimeout(() => {
            if (btnRef.current) {
              btnRef.current.classList.remove('click-sound');
            }
          }, 400);
        });
      }
    };

    handleButtonClick(loginBtnRef);
    handleButtonClick(registerBtnRef);
    handleButtonClick(switchBtnRef);
    handleButtonClick(submitBtnRef);

    // 清理函数
    return () => {
      // 移除事件监听器
      [emailInputRef, passwordInputRef, usernameInputRef].forEach(ref => {
        if (ref.current) {
          ref.current.removeEventListener('focus', () => {});
        }
      });
    };
  }, [isLoginMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    
    // 播放点击音效
    playSound('click');
    
    try {
      if (isLoginMode) {
        // 🔐 登录逻辑
        await login({ email: formData.email, password: formData.password });
        // 登录成功音效在useEffect中播放
      } else {
        // ✅ 注册逻辑
        if (!formData.username || !formData.email || !formData.password) {
          setLocalError('请填写所有注册信息');
          playSound('error');
          setIsSubmitting(false);
          return;
        }

        const res = await api.post('/auth/register', {
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        if (res.success) {
          // 播放成功音效
          playSound('success');
          
          // 1. 保存 Token
          localStorage.setItem('token', res.data.token);
          
          // 2. 更新 Context 中的用户信息
          updateUser(res.data.user);
          
          // 3. 显示成功消息
          setLocalError(`🎉 注册成功！欢迎 ${res.data.user.username}，正在自动登录...`);
          
          // 4. 延迟切换到登录模式
          setTimeout(() => {
            setIsLoginMode(true);
            setFormData({ email: formData.email, password: formData.password, username: '' });
            setIsSubmitting(false);
          }, 2000);
        } else {
          playSound('error');
          setLocalError(res.message || '注册失败');
          setIsSubmitting(false);
        }
      }
    } catch (error) {
      console.error('❌ 操作错误:', error);
      // 播放错误音效
      playSound('error');
      
      // 尝试从 error 对象中获取后端返回的错误信息
      const errorMsg = error.response?.data?.message || error.message || `${isLoginMode ? '登录' : '注册'}失败，请重试`;
      setLocalError(errorMsg);
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    // 播放切换音效
    playSound('switch');
    setIsLoginMode(!isLoginMode);
    setLocalError('');
    // 清除非当前模式的表单数据
    if (isLoginMode) {
      setFormData({ ...formData, username: '' });
    }
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
          <p>{isLoginMode ? '欢迎回来，机甲指挥官' : '加入机甲军团'}</p>
        </div>

        <div className="form-container">
          <div className={`form-wrapper login ${!isLoginMode ? 'shift-out' : ''}`}>
            <form onSubmit={handleSubmit} className="login-form">
              {localError && (
                <div className={`error-message ${localError.includes('🎉') ? 'success-feedback' : ''}`}>
                  {localError}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="login-email">邮箱</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input 
                    type="email" 
                    id="login-email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="输入机甲通讯码" 
                    required 
                    ref={emailInputRef}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="login-password">密码</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input 
                    type="password" 
                    id="login-password" 
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    placeholder="输入能量密钥" 
                    required 
                    ref={passwordInputRef}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="login-btn" 
                disabled={isAuthLoading || isSubmitting}
                ref={loginBtnRef}
              >
                {isSubmitting ? '登录中...' : '登录系统'}
              </button>
            </form>
          </div>

          <div className={`form-wrapper register ${isLoginMode ? '' : 'shift-in'}`}>
            <form onSubmit={handleSubmit} className="login-form">
              {localError && (
                <div className={`error-message ${localError.includes('🎉') ? 'success-feedback' : ''}`}>
                  {localError}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input 
                    type="text" 
                    id="username" 
                    name="username" 
                    value={formData.username} 
                    onChange={handleChange} 
                    placeholder="输入指挥官代号" 
                    required 
                    ref={usernameInputRef}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="register-email">邮箱</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input 
                    type="email" 
                    id="register-email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="输入机甲通讯码" 
                    required 
                    ref={emailInputRef}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="register-password">密码</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input 
                    type="password" 
                    id="register-password" 
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    placeholder="输入能量密钥" 
                    required 
                    ref={passwordInputRef}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="register-btn" 
                disabled={isAuthLoading || isSubmitting}
                ref={registerBtnRef}
              >
                {isSubmitting ? '注册中...' : '加入军团'}
              </button>
            </form>
          </div>
        </div>

        <button 
          className="switch-mode-btn" 
          onClick={switchMode} 
          disabled={isAuthLoading || isSubmitting}
          ref={switchBtnRef}
        >
          {isLoginMode ? '🔄 还没有账号？立即注册' : '🔄 已有账号？返回登录'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;