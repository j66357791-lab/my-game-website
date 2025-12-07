import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// 🔧 正确导入API
import api from '../config/api.js';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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
      console.log('🔐 开始登录请求...');
      console.log('登录数据:', { email: formData.email, password: '***' });
      
      // 检查API对象
      if (!api || !api.login) {
        throw new Error('API模块未正确加载');
      }
      
      const data = await api.login(formData.email, formData.password);
      console.log('📡 登录响应:', data);

      if (data.success) {
        const { user, token } = data.data;
        
        // 详细日志
        console.log('✅ 登录成功，开始保存数据...');
        console.log('用户数据:', user);
        console.log('Token长度:', token ? token.length : 'undefined');

        if (!token) {
          throw new Error('服务器未返回token');
        }

        // 保存token到localStorage
        try {
          localStorage.setItem('token', token);
          console.log('✅ Token已保存到localStorage');
          
          // 验证保存是否成功
          const savedToken = localStorage.getItem('token');
          console.log('验证保存的Token:', savedToken ? savedToken.substring(0, 20) + '...' : 'undefined');
          
          if (!savedToken || savedToken !== token) {
            throw new Error('Token保存失败');
          }
        } catch (saveError) {
          console.error('❌ Token保存失败:', saveError);
          throw new Error('Token保存失败: ' + saveError.message);
        }

        // 保存用户数据
        try {
          localStorage.setItem('user', JSON.stringify(user));
          console.log('✅ 用户数据已保存');
          
          // 保存用户余额到单独字段
          if (user.cashBalance !== undefined) {
            localStorage.setItem('userCashBalance', user.cashBalance.toString());
            console.log('✅ 用户余额已单独保存:', user.cashBalance);
          }
        } catch (userSaveError) {
          console.error('❌ 用户数据保存失败:', userSaveError);
        }

        // 🔧 安全调用onLogin
        try {
          if (typeof onLogin === 'function') {
            console.log('🔄 调用onLogin函数...');
            onLogin(user, token);
            console.log('✅ onLogin函数调用成功');
          } else {
            console.warn('⚠️ onLogin不是函数:', typeof onLogin);
            // 如果onLogin不是函数，直接跳转
            setTimeout(() => {
              navigate('/');
            }, 100);
          }
        } catch (onLoginError) {
          console.error('❌ onLogin函数调用失败:', onLoginError);
          // 即使onLogin失败，也尝试跳转
          setTimeout(() => {
            navigate('/');
          }, 100);
        }

        console.log('🎉 登录流程完成，准备跳转...');
        
        // 🔧 延迟跳转，确保数据保存完成
        setTimeout(() => {
          navigate('/');
        }, 100);
        
      } else {
        throw new Error(data.message || '登录失败');
      }
    } catch (error) {
      console.error('❌ 登录错误:', error);
      setError(error.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 测试网络连接
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
      
      // 测试CORS
      const corsResponse = await fetch('https://tianchuang.onrender.com/api/test-cors');
      if (corsResponse.ok) {
        const corsData = await corsResponse.json();
        console.log('✅ CORS测试成功:', corsData);
        alert('网络连接正常！');
        return true;
      } else {
        console.log('⚠️ CORS测试失败:', corsResponse.status);
        alert(`CORS测试失败: ${corsResponse.status}`);
        return false;
      }
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
          <h1>🎮 潮玩虚拟生态</h1>
          <p>欢迎回来</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

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
              autoComplete="email"
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
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

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
          <p>测试账号：</p>
          <p>admin@example.com / 123456 (管理员)</p>
          <p>普通用户：注册任意邮箱</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
