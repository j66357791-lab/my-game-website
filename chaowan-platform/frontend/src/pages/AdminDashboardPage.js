// src/pages/AdminDashboardPage.js
import React, { useState, useEffect } from 'react';
import { api } from '../config/api';
import './AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [pointsAdjustment, setPointsAdjustment] = useState({ userId: '', amount: '', description: '' });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.getAdminDashboard(token);
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.getAdminUsers(token);
      if (response.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.getAdminTransactions(token);
      if (response.success) {
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('加载交易记录失败:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.getAdminAnalytics(token);
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('加载分析数据失败:', error);
    }
  };

  const handleEditUser = async (userData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.updateAdminUser(editingUser._id, userData, token);
      if (response.success) {
        setEditingUser(null);
        loadUsers();
        alert('用户信息更新成功');
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      alert('更新用户失败');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await api.deleteAdminUser(userId, token);
      if (response.success) {
        loadUsers();
        alert('用户删除成功');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户失败');
    }
  };

  const handleAdjustPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.adjustUserPoints(
        pointsAdjustment.userId,
        parseInt(pointsAdjustment.amount),
        pointsAdjustment.description,
        token
      );
      if (response.success) {
        setPointsAdjustment({ userId: '', amount: '', description: '' });
        loadUsers();
        loadTransactions();
        alert('积分调整成功');
      }
    } catch (error) {
      console.error('调整积分失败:', error);
      alert('调整积分失败');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'users':
        loadUsers();
        break;
      case 'transactions':
        loadTransactions();
        break;
      case 'analytics':
        loadAnalytics();
        break;
      default:
        break;
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!user || user.role !== 'admin') {
    return <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>🚫 访问被拒绝</h2>
        <p>您没有管理员权限</p>
      </div>
    </div>;
  }

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
          onClick={() => handleTabChange('users')}
        >
          👥 用户管理
        </button>
        <button 
          className={activeTab === 'points' ? 'active' : ''}
          onClick={() => handleTabChange('points')}
        >
          💰 积分管理
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''}
          onClick={() => handleTabChange('transactions')}
        >
          💳 交易明细
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => handleTabChange('analytics')}
        >
          📊 数据分析
        </button>
      </div>

      {/* 仪表板 */}
      {activeTab === 'dashboard' && dashboardData && (
        <div className="dashboard-content">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">👥</div>
              <div className="metric-info">
                <h3>{dashboardData.stats.totalUsers}</h3>
                <p>总用户数</p>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">💳</div>
              <div className="metric-info">
                <h3>{dashboardData.stats.totalTransactions}</h3>
                <p>总交易数</p>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">🆕</div>
              <div className="metric-info">
                <h3>{dashboardData.stats.todayTransactions}</h3>
                <p>今日交易</p>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">💰</div>
              <div className="metric-info">
                <h3>{dashboardData.stats.totalPointsInSystem}</h3>
                <p>系统总积分</p>
              </div>
            </div>
          </div>

          <div className="recent-activities">
            <h3>📋 最近交易</h3>
            <div className="activity-list">
              {dashboardData.recentTransactions.map(transaction => (
                <div key={transaction._id} className="activity-item">
                  <div className="activity-info">
                    <strong>{transaction.userId?.username || '未知用户'}</strong>
                    <span>{transaction.description}</span>
                  </div>
                  <span className="activity-time">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <div className="users-management">
          <div className="users-header">
            <h3>👥 用户管理</h3>
            <button onClick={loadUsers}>🔄 刷新</button>
          </div>
          
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>等级</th>
                  <th>积分</th>
                  <th>角色</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.level}</td>
                    <td>{user.points}</td>
                    <td>{user.role}</td>
                    <td>
                      <button onClick={() => setEditingUser(user)}>✏️ 编辑</button>
                      <button onClick={() => handleDeleteUser(user._id)}>🗑️ 删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 积分管理 */}
      {activeTab === 'points' && (
        <div className="points-management">
          <h3>💰 积分管理</h3>
          
          <div className="points-adjustment">
            <h4>调整用户积分</h4>
            <div className="adjustment-form">
              <select 
                value={pointsAdjustment.userId} 
                onChange={(e) => setPointsAdjustment({...pointsAdjustment, userId: e.target.value})}
              >
                <option value="">选择用户</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.username} ({user.points}积分)
                  </option>
                ))}
              </select>
              <input 
                type="number" 
                placeholder="积分数量（正数为增加，负数为扣除）"
                value={pointsAdjustment.amount}
                onChange={(e) => setPointsAdjustment({...pointsAdjustment, amount: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="说明"
                value={pointsAdjustment.description}
                onChange={(e) => setPointsAdjustment({...pointsAdjustment, description: e.target.value})}
              />
              <button onClick={handleAdjustPoints}>💰 调整积分</button>
            </div>
          </div>
        </div>
      )}

      {/* 交易明细 */}
      {activeTab === 'transactions' && (
        <div className="transactions-management">
          <div className="transactions-header">
            <h3>💳 交易明细</h3>
            <button onClick={loadTransactions}>🔄 刷新</button>
          </div>
          
          <div className="transactions-table">
            <table>
              <thead>
                <tr>
                  <th>用户</th>
                  <th>类型</th>
                  <th>金额</th>
                  <th>余额</th>
                  <th>描述</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(transaction => (
                  <tr key={transaction._id}>
                    <td>{transaction.userId?.username || '未知用户'}</td>
                    <td>{transaction.type}</td>
                    <td className={transaction.amount > 0 ? 'positive' : 'negative'}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </td>
                    <td>{transaction.balance}</td>
                    <td>{transaction.description}</td>
                    <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 数据分析 */}
      {activeTab === 'analytics' && analytics && (
        <div className="analytics-content">
          <h3>📊 数据分析</h3>
          
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>用户等级分布</h4>
              <div className="level-distribution">
                {analytics.levelDistribution.map(level => (
                  <div key={level._id} className="level-item">
                    <span>Lv.{level._id}</span>
                    <span>{level.count}人</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="analytics-card">
              <h4>积分分布</h4>
              <div className="points-distribution">
                {analytics.pointsDistribution.map((bucket, index) => {
                  const range = index === 0 ? '0-50' : 
                               index === 1 ? '50-100' :
                               index === 2 ? '100-200' :
                               index === 3 ? '200-500' :
                               index === 4 ? '500-1000' : '1000+';
                  return (
                    <div key={range} className="points-item">
                      <span>{range}</span>
                      <span>{bucket.count}人</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="analytics-card">
              <h4>交易类型统计</h4>
              <div className="transaction-types">
                {analytics.transactionTypeStats.map(type => (
                  <div key={type._id} className="type-item">
                    <span>{type._id}</span>
                    <span>{type.count}次</span>
                    <span>{type.total}积分</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {editingUser && (
        <div className="modal">
          <div className="modal-content">
            <h3>✏️ 编辑用户</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleEditUser({
                username: formData.get('username'),
                email: formData.get('email'),
                level: parseInt(formData.get('level')),
                points: parseInt(formData.get('points')),
                role: formData.get('role')
              });
            }}>
              <input name="username" defaultValue={editingUser.username} placeholder="用户名" />
              <input name="email" defaultValue={editingUser.email} placeholder="邮箱" />
              <input name="level" type="number" defaultValue={editingUser.level} placeholder="等级" />
              <input name="points" type="number" defaultValue={editingUser.points} placeholder="积分" />
              <select name="role" defaultValue={editingUser.role}>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
              <div className="modal-actions">
                <button type="submit">💾 保存</button>
                <button type="button" onClick={() => setEditingUser(null)}>❌ 取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;

