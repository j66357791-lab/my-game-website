import React, { useState } from 'react';
import { register, saveToken, setAuthToken } from '../../services/authService';
import './Auth.css';

const Register = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
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
      const response = await register(formData);
      
      // 保存token
      saveToken(response.token);
      setAuthToken(response.token);
      
      // 调用父组件的注册回调
      onRegister(response.user);
      
    } catch (error) {
      setError(error.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>📝 注册</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="请输入用户名"
            />
          </div>
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
              placeholder="请输入密码（至少6位）"
              minLength="6"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a href="/login" style={{ color: '#667eea', textDecoration: 'none' }}>
              已有账号？立即登录
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
