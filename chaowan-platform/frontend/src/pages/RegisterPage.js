// frontend/src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css';

const RegisterPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 输入时清除错误
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 前端验证
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('请填写所有必填字段');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('请填写正确的邮箱格式');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 开始注册请求:', { email: formData.email, username: formData.username });
      
      const response = await fetch('https://tianchuang.onrender.com/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log('📡 注册响应:', { status: response.status, data });

      if (data.success) {
        // 保存token
        localStorage.setItem('token', data.data.token);
        
        // 保存用户信息
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // 验证保存是否成功
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (savedToken && savedUser) {
          console.log('✅ 注册数据保存成功');
          
          // 调用登录回调
          if (onLogin && typeof onLogin === 'function') {
            onLogin(data.data.user);
          }
          
          console.log('✅ 注册成功，跳转到首页');
          
          // 延迟跳转，确保数据保存完成
          setTimeout(() => {
            navigate('/');
          }, 100);
        } else {
          throw new Error('注册数据保存失败');
        }
      } else {
        setError(data.message || '注册失败');
      }
    } catch (error) {
      console.error('❌ 注册请求失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>🧸 娃娃世界</h1>
          <p>创建新账号</p>
        </div>
        
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="请输入用户名"
              required
              disabled={loading}
              minLength={2}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="请输入邮箱"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="请输入密码"
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="请再次输入密码"
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          {error && (
            <div className="error-message">
              <span>❌ {error}</span>
            </div>
          )}
          
          <button 
            type="submit" 
            className="register-btn"
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        
        <div className="register-footer">
          <p>已有账号？</p>
          <button 
            className="login-btn"
            onClick={() => navigate('/login')}
            disabled={loading}
          >
            立即登录
          </button>
        </div>
        
        <div className="register-tips">
          <p>注册即送50积分！</p>
          <p>新用户专享福利</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
