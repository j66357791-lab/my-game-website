// src/pages/LoginPage.js - 完整修复版
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Particles from '../components/Particles';
import GlobalLoader from '../components/GlobalLoader';
import { useUser } from '../contexts/UserContext';
import api from '../config/api';
import './LoginPage.css';

import loginBgImage from '../images/login-bg.jpg';

const LoginPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputHistory, setInputHistory] = useState({});
  const navigate = useNavigate();

  // 使用 Context 中的 login 和 updateUser
  const { login, loading: isAuthLoading, user, updateUser } = useUser();

  // 使用 ref 引用 DOM 元素
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const loginBtnRef = useRef(null);
  const registerBtnRef = useRef(null);
  const switchBtnRef = useRef(null);
  const loginFormRef = useRef(null);
  const registerFormRef = useRef(null);

  // 音频上下文和音效函数
  const audioContextRef = useRef(null);
  const hasInteractedRef = useRef(false);

  // 初始化音频上下文
  const initAudioContext = () => {
    if (!audioContextRef.current && (window.AudioContext || window.webkitAudioContext)) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    hasInteractedRef.current = true;
  };

  // 播放音效的辅助函数
  const playSound = useCallback((type) => {
    if (!hasInteractedRef.current || !audioContextRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      let frequency = 800;
      let duration = 0.1;
      
      switch(type) {
        case 'click':
          frequency = 1000;
          duration = 0.05;
          break;
        case 'focus':
          frequency = 600;
          duration = 0.08;
          break;
        case 'success':
          frequency = 500;
          duration = 0.3;
          // 成功音效有上升音调
          oscillator.frequency.setValueAtTime(500, ctx.currentTime);
          oscillator.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
          break;
        case 'switch':
          frequency = 400;
          duration = 0.1;
          break;
        case 'error':
          frequency = 300;
          duration = 0.15;
          break;
        default:
          frequency = 800;
          duration = 0.1;
      }
      
      if (type !== 'success') {
        oscillator.frequency.value = frequency;
      }
      
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
      
    } catch (error) {
      console.log('音效播放失败:', error);
    }
  }, []);

  // 核心逻辑：监听用户状态变化，决定何时跳转
  useEffect(() => {
    if (user && !isAuthLoading) {
      console.log('✅ 用户已登录，准备跳转到首页...');
      // 播放成功音效
      playSound('success');
      setTimeout(() => navigate('/'), 500);
    }
  }, [user, isAuthLoading, navigate, playSound]);

  // 绑定音效和用户交互检测
  useEffect(() => {
    // 用户交互检测
    const handleFirstInteraction = () => {
      initAudioContext();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    
    // 为输入框绑定聚焦音效
    const setupInputSound = (inputRef) => {
      if (!inputRef.current) return;
      
      inputRef.current.addEventListener('focus', () => {
        if (hasInteractedRef.current) {
          playSound('focus');
          inputRef.current.parentElement.classList.add('focus-sound');
          setTimeout(() => {
            if (inputRef.current?.parentElement) {
              inputRef.current.parentElement.classList.remove('focus-sound');
            }
          }, 300);
        }
      });
      
      // 修复移动端输入显示问题
      inputRef.current.addEventListener('input', (e) => {
        // 确保输入值被正确设置
        setInputHistory(prev => ({
          ...prev,
          [e.target.name]: e.target.value
        }));
      });
    };
    
    // 为按钮绑定点击音效
    const setupButtonSound = (buttonRef) => {
      if (!buttonRef.current) return;
      
      buttonRef.current.addEventListener('click', () => {
        initAudioContext();
        playSound('click');
        buttonRef.current.classList.add('click-sound');
        setTimeout(() => {
          if (buttonRef.current) {
            buttonRef.current.classList.remove('click-sound');
          }
        }, 400);
      });
    };
    
    // 设置所有输入框
    setupInputSound(emailInputRef);
    setupInputSound(passwordInputRef);
    setupInputSound(usernameInputRef);
    
    // 设置所有按钮
    setupButtonSound(loginBtnRef);
    setupButtonSound(registerBtnRef);
    setupButtonSound(switchBtnRef);
    
    // 清理函数
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [isLoginMode, playSound]);

  // 处理表单变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);
    
    // 初始化音频上下文（确保用户已交互）
    initAudioContext();
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
            setFormData(prev => ({ ...prev, username: '' }));
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

  // 切换登录/注册模式
  const switchMode = () => {
    // 初始化音频上下文
    initAudioContext();
    playSound('switch');
    
    setIsLoginMode(!isLoginMode);
    setLocalError('');
    
    // 清除非当前模式的表单数据
    if (isLoginMode) {
      setFormData(prev => ({ ...prev, username: '' }));
    }
    
    // 移动端优化：切换后自动聚焦到第一个输入框
    setTimeout(() => {
      if (!isLoginMode && emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, 100);
  };

  // 处理触摸事件（移动端优化）
  const handleTouchStart = (e) => {
    e.currentTarget.classList.add('touch-active');
  };

  const handleTouchEnd = (e) => {
    e.currentTarget.classList.remove('touch-active');
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
      onTouchStart={() => initAudioContext()} // 移动端触摸初始化
    >
      <Particles />
      
      <div className="login-container">
        <div className="login-header">
          <h1>天创潮玩</h1>
          <p>{isLoginMode ? '欢迎回来，机甲指挥官' : '加入机甲军团'}</p>
        </div>

        <div className="form-container">
          {/* 登录表单 */}
          <div className={`form-wrapper login ${!isLoginMode ? 'shift-out' : ''}`}>
            <form 
              onSubmit={handleSubmit} 
              className="login-form"
              ref={loginFormRef}
            >
              {localError && !localError.includes('🎉') && (
                <div className="error-message">
                  {localError}
                </div>
              )}
              
              {localError && localError.includes('🎉') && (
                <div className="error-message success-feedback">
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
                    className="mobile-input-fix"
                    autoComplete="email"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
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
                    className="mobile-input-fix"
                    autoComplete="current-password"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="login-btn" 
                disabled={isAuthLoading || isSubmitting}
                ref={loginBtnRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {isSubmitting ? (
                  <span className="button-loading">
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                  </span>
                ) : (
                  '登录系统'
                )}
              </button>
            </form>
          </div>

          {/* 注册表单 */}
          <div className={`form-wrapper register ${isLoginMode ? '' : 'shift-in'}`}>
            <form 
              onSubmit={handleSubmit} 
              className="login-form"
              ref={registerFormRef}
            >
              {localError && !localError.includes('🎉') && (
                <div className="error-message">
                  {localError}
                </div>
              )}
              
              {localError && localError.includes('🎉') && (
                <div className="error-message success-feedback">
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
                    className="mobile-input-fix"
                    autoComplete="username"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
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
                    className="mobile-input-fix"
                    autoComplete="email"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
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
                    className="mobile-input-fix"
                    autoComplete="new-password"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="register-btn" 
                disabled={isAuthLoading || isSubmitting}
                ref={registerBtnRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {isSubmitting ? (
                  <span className="button-loading">
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                  </span>
                ) : (
                  '加入军团'
                )}
              </button>
            </form>
          </div>
        </div>

        <button 
          className="switch-mode-btn" 
          onClick={switchMode} 
          disabled={isAuthLoading || isSubmitting}
          ref={switchBtnRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {isLoginMode ? '🔄 还没有账号？立即注册' : '🔄 已有账号？返回登录'}
        </button>
        
        {/* 移动端提示 */}
        <div className="mobile-hint">
          请确保在连接良好的环境下操作
        </div>
      </div>
    </div>
  );
};

export default LoginPage;