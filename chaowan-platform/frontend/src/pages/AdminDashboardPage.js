// src/pages/AdminDashboardPage.js
import React, { useState, useEffect } from 'react';
import { api } from '../config/api';
import './AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // 简化版本 - 先确保基础渲染正常
  useEffect(() => {
    console.log('AdminDashboardPage mounted, user:', user);
  }, [user]);

  // 如果不是管理员，显示提示
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h2>🚫 访问被拒绝</h2>
          <p>您没有管理员权限</p>
          <p>当前用户角色: {user?.role || '未知'}</p>
        </div>
      </div>
    );
  }

  // 简化的仪表板内容
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>🛠️ 管理员后台</h2>
        <p>欢迎回来，{user.username}</p>
      </div>

      {/* 导航标签 */}
      <div className="admin-tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 仪表板
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 用户管理
        </button>
        <button 
          className={activeTab === 'points' ? 'active' : ''}
          onClick={() => setActiveTab('points')}
        >
          💰 积分管理
        </button>
      </div>

      {/* 简化的内容区域 */}
      <div className="dashboard-content">
        {activeTab === 'dashboard' && (
          <div>
            <h3>📊 仪表板</h3>
            <p>这里是仪表板内容</p>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">👥</div>
                <div className="metric-info">
                  <h3>1234</h3>
                  <p>总用户数</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">💳</div>
                <div className="metric-info">
                  <h3>567</h3>
                  <p>总交易数</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h3>👥 用户管理</h3>
            <p>这里是用户管理内容</p>
          </div>
        )}

        {activeTab === 'points' && (
          <div>
            <h3>💰 积分管理</h3>
            <p>这里是积分管理内容</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">加载中...</div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
