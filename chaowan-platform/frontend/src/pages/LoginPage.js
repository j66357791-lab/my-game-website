// frontend/src/pages/LoginPage.js - 完全修复版
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 🔧 修复：输入时清除错误
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔧 修复：前端验证
    if (!formData.email || !formData.password) {
      setError('请填写邮箱和密码');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('请填写正确的邮箱格式');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 开始登录请求:', { email: formData.email });
      
      const response = await fetch('https://tianchuang.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log('📡 登录响应:', { status: response.status, data });

      if (data.success) {
        // 🔧 修复：保存token
        localStorage.setItem('token', data.data.token);
        
        // 🔧 修复：保存用户信息
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // 🔧 修复：验证保存是否成功
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (savedToken && savedUser) {
          console.log('✅ 登录数据保存成功');
          
          // 🔧 修复：调用登录回调
          if (onLogin && typeof onLogin === 'function') {
            console.log('🔄 调用onLogin函数...');
            onLogin(data.data.user);
            console.log('✅ onLogin函数调用成功');
          } else {
            console.warn('⚠️ onLogin不是函数:', typeof onLogin);
            // 如果onLogin不是函数，直接跳转
            setTimeout(() => {
              navigate('/');
            }, 100);
          }
        } else {
          throw new Error('登录数据保存失败');
        }
        
        console.log('✅ 登录成功，跳转到首页');
        
        // 🔧 修复：延迟跳转，确保数据保存完成
        setTimeout(() => {
          navigate('/');
        }, 100);
      } else {
        setError(data.message || '登录失败');
      }
    } catch (error) {
      console.error('❌ 登录请求失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 🔧 修复：测试网络连接
  const testConnection = async () => {
    try {
      console.log('🔍 测试网络连接...');
      
      // 测试基础连接
      const response = await fetch('https://tianchuang.onrender.com/');
      const text = await response.text();
      console.log('📡 基础连接响应:', text.substring(0, 100));
      
      if (response.ok) {
        try {
          const data = JSON.parse(text);
          if (data.message && data.message.includes('运行')) {
            console.log('✅ 后端服务正常运行');
            alert('后端服务正常运行！');
            return true;
          }
        } catch (e) {
          console.log('⚠️ 后端返回非JSON格式');
        }
      }
      
      alert('网络连接测试完成');
      return true;
    } catch (error) {
      console.error('❌ 网络连接失败:', error);
      setError('网络连接失败: ' + error.message);
      return false;
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🧸 娃娃世界</h1>
          <p>欢迎回来！</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
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
          
          {error && (
            <div className="error-message">
              <span>❌ {error}</span>
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <button 
            type="button"
            className="test-btn"
            onClick={testConnection}
            disabled={loading}
          >
            🌐 测试网络
          </button>
        </form>
        
        <div className="login-footer">
          <p>还没有账号？</p>
          <button 
            className="register-btn"
            onClick={() => navigate('/register')}
            disabled={loading}
          >
            立即注册
          </button>
        </div>
        
        <div className="test-accounts">
          <p>测试账号：</p>
          <p>admin@example.com / 123456 (管理员)</p>
          <p>user@example.com / 123456 (普通用户)</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
