// src/pages/LoginPage.js
import React, { useState } from 'react';
import { api } from '../config/api';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('🔧 输入变化:', name, value);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 开始提交表单');
    console.log('📋 表单数据:', formData);
    
    setLoading(true);
    setError('');
    setDebugInfo('');

    try {
      // 验证表单
      if (!formData.email || !formData.password) {
        throw new Error('请填写邮箱和密码');
      }

      if (!isLogin && !formData.username) {
        throw new Error('请填写用户名');
      }

      if (!isLogin && formData.password !== formData.confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('请输入有效的邮箱地址');
      }

      console.log('✅ 表单验证通过');

      if (isLogin) {
        // 登录
        console.log('🔐 开始登录请求');
        const result = await api.login(formData.email, formData.password);
        console.log('📡 登录响应:', result);
        
        if (result.success) {
          console.log('✅ 登录成功:', result.data.user);
          onLogin(result.data.user, result.data.token);
        } else {
          throw new Error(result.message || '登录失败');
        }
      } else {
        // 注册
        console.log('🆕 开始注册请求');
        const result = await api.register(formData.username, formData.email, formData.password);
        console.log('📡 注册响应:', result);
        
        if (result.success) {
          console.log('✅ 注册成功:', result.data.user);
          onLogin(result.data.user, result.data.token);
        } else {
          throw new Error(result.message || '注册失败');
        }
      }
    } catch (error) {
      console.error('❌ 操作失败:', error);
      setError(error.message || '操作失败，请重试');
      setDebugInfo(`错误详情: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    console.log('🔄 切换模式:', !isLogin ? '登录' : '注册');
    setIsLogin(!isLogin);
    setError('');
    setDebugInfo('');
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  // 快速填充演示账号
  const fillDemoAccount = (type) => {
    console.log('🎯 填充演示账号:', type);
    const demoData = type === 'admin' ? {
      username: 'admin',
      email: 'admin@example.com',
      password: '123456',
      confirmPassword: '123456'
    } : {
      username: 'testuser',
      email: 'test@example.com',
      password: '123456',
      confirmPassword: '123456'
    };
    
    setFormData(demoData);
    setError('');
    setDebugInfo(`已填充${type === 'admin' ? '管理员' : '测试用户'}账号`);
  };

  // 测试API连接
  const testApiConnection = async () => {
    console.log('🔍 测试API连接');
    setDebugInfo('正在测试API连接...');
    
    try {
      const response = await fetch('https://tianchuang.onrender.com/');
      const data = await response.json();
      console.log('✅ API连接成功:', data);
      setDebugInfo(`API连接成功: ${data.message}`);
    } catch (error) {
      console.error('❌ API连接失败:', error);
      setDebugInfo(`API连接失败: ${error.message}`);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="app-title">🎮 潮玩世界</h1>
          <p className="app-subtitle">收集可爱娃娃，打造专属收藏</p>
        </div>

        {/* API状态和测试 */}
        <div className="api-status">
          <div className="api-notice">
            <span>🌐 云端API服务</span>
            <button 
              type="button" 
              className="test-api-btn"
              onClick={testApiConnection}
            >
              测试连接
            </button>
          </div>
          {debugInfo && (
            <div className="debug-info">
              <p>🔧 {debugInfo}</p>
            </div>
          )}
        </div>

        {/* 切换标签 */}
        <div className="auth-tabs">
          <button 
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            登录
          </button>
          <button 
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            注册
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="请输入用户名"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="请输入邮箱"
              required
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="请输入密码"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>确认密码</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="请再次输入密码"
                required={!isLogin}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <span>
                {isLogin ? '登录中' : '注册中'}
                <span className="loading-dots">...</span>
              </span>
            ) : (
              (isLogin ? '登录' : '注册')
            )}
          </button>
        </form>

        <div className="switch-auth">
          <span>{isLogin ? '还没有账号？' : '已有账号？'}</span>
          <button type="button" className="link-btn" onClick={toggleMode}>
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </div>

        {/* 演示账号 */}
        <div className="demo-account">
          <p>🎯 快速测试：</p>
          <div className="demo-buttons">
            <button 
              type="button" 
              className="demo-btn admin-btn"
              onClick={() => fillDemoAccount('admin')}
            >
              👑 管理员账号
            </button>
            <button 
              type="button" 
              className="demo-btn user-btn"
              onClick={() => fillDemoAccount('user')}
            >
              👤 测试用户
            </button>
          </div>
          <p className="demo-info">
            管理员：admin@example.com / 123456<br/>
            测试：test@example.com / 123456
          </p>
        </div>

        {/* 开发调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-panel">
            <h4>🔧 调试信息</h4>
            <p><strong>表单数据:</strong></p>
            <pre>{JSON.stringify(formData, null, 2)}</pre>
            <p><strong>加载状态:</strong> {loading ? '加载中' : '空闲'}</p>
            <p><strong>当前模式:</strong> {isLogin ? '登录' : '注册'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

