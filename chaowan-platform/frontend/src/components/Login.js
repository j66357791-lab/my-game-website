import React, { useState } from 'react';
import { login, saveToken, setAuthToken } from '../../services/authService';
import './Auth.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const response = await login(formData);
      
      // 保存token
      saveToken(response.token);
      setAuthToken(response.token);
      
      // 调用父组件的登录回调
      onLogin(response.user);
      
    } catch (error) {
      setError(error.message || '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>🔐 登录</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="请输入邮箱"
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="请输入密码"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a href="/register" style={{ color: '#667eea', textDecoration: 'none' }}>
              还没有账号？立即注册
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
