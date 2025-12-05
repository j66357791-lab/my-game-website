// src/pages/AdminDashboardPage.js
import React from 'react';
import './AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
  const stats = {
    totalUsers: 1234,
    activeUsers: 89,
    totalDolls: 5678,
    todayRevenue: 2340,
    systemHealth: '良好',
    serverUptime: '99.9%'
  };

  const recentActivities = [
    { id: 1, user: '张三', action: '购买了萌新宝宝', time: '2分钟前' },
    { id: 2, user: '李四', action: '完成每日签到', time: '5分钟前' },
    { id: 3, user: '王五', action: '回收了小熊布朗', time: '10分钟前' },
    { id: 4, user: '赵六', action: '升级到Lv.5', time: '15分钟前' }
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>🛠️ 管理员后台</h2>
        <p>欢迎回来，{user.username}</p>
      </div>

      {/* 核心指标卡片 */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-info">
            <h3>{stats.totalUsers}</h3>
            <p>总用户数</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-info">
            <h3>{stats.activeUsers}</h3>
            <p>今日活跃</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">🧸</div>
          <div className="metric-info">
            <h3>{stats.totalDolls}</h3>
            <p>总娃娃数</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-info">
            <h3>{stats.todayRevenue}</h3>
            <p>今日收入</p>
          </div>
        </div>
      </div>

      {/* 系统状态 */}
      <div className="system-status">
        <h3>🖥️ 系统状态</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">系统健康度</span>
            <span className="status-value good">{stats.systemHealth}</span>
          </div>
          <div className="status-item">
            <span className="status-label">服务器运行时间</span>
            <span className="status-value">{stats.serverUptime}</span>
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="recent-activities">
        <h3>📋 最近活动</h3>
        <div className="activity-list">
          {recentActivities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-info">
                <strong>{activity.user}</strong>
                <span>{activity.action}</span>
              </div>
              <span className="activity-time">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="admin-actions">
        <h3>⚡ 管理操作</h3>
        <div className="actions-grid">
          <button className="action-btn">👥 用户管理</button>
          <button className="action-btn">🧸 娃娃管理</button>
          <button className="action-btn">📊 数据分析</button>
          <button className="action-btn">📢 系统公告</button>
          <button className="action-btn">⚙️ 系统设置</button>
          <button className="action-btn">📋 系统日志</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
