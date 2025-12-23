// src/pages/AdminDashboardPage.js
import React, { useState, useEffect } from 'react';
import { api } from '../config/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, ResponsiveContainer } from 'recharts'; // 引入图表库
import './AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // 🔧 神秘卡牌控制台状态
  const [cardConfig, setCardConfig] = useState({ mode: 'RANDOM', fixedLordValue: 5 });
  const [cardStats, setCardStats] = useState(null);

  useEffect(() => {
    console.log('AdminDashboardPage mounted, user:', user);
    if (activeTab === 'mystery-card') {
      fetchCardConfig();
      fetchCardStats();
    }
  }, [activeTab]);

  // 玩家获取神秘卡牌数据
  const fetchCardConfig = async () => {
    const res = await api.get('/admin/mystery-card/config');
    if (res.success) setCardConfig(res.data);
  };

  const fetchCardStats = async () => {
    const res = await api.get('/admin/mystery-card/stats');
    if (res.success) setCardStats(res.data);
  };

  const handleSaveCardConfig = async () => {
    setLoading(true);
    const res = await api.post('/admin/mystery-card/config', cardConfig);
    if (res.success) {
      alert('✅ 设置已更新，下一局生效！');
    } else {
      alert('❌ 更新失败');
    }
    setLoading(false);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h2>🚫 访问被拒绝</h2>
          <p>您没有管理员权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>🛠️ 管理员后台</h2>
        <p>欢迎回来，{user.username}</p>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>📊 仪表板</button>
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👥 用户管理</button>
        <button className={activeTab === 'points' ? 'active' : ''} onClick={() => setActiveTab('points')}>💰 积分管理</button>
        {/* 🔧 新增标签 */}
        <button className={activeTab === 'mystery-card' ? 'active' : ''} onClick={() => setActiveTab('mystery-card')}>🃏 神秘卡牌</button>
      </div>

      <div className="dashboard-content">
        {/* 仪表板 */}
        {activeTab === 'dashboard' && (
          <div>
            <h3>📊 仪表板</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">👥</div>
                <div className="metric-info"><h3>1234</h3><p>总用户数</p></div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">💳</div>
                <div className="metric-info"><h3>567</h3><p>总交易数</p></div>
              </div>
            </div>
          </div>
        )}

        {/* 用户管理 */}
        {activeTab === 'users' && <div><h3>👥 用户管理</h3><p>这里是用户管理内容</p></div>}

        {/* 积分管理 */}
        {activeTab === 'points' && <div><h3>💰 积分管理</h3><p>这里是积分管理内容</p></div>}

        {/* 🔧 神秘卡牌控制台 (融合部分) */}
        {activeTab === 'mystery-card' && (
          <div>
            <h3>🃏 神秘卡牌控制台</h3>
            
            {/* 控制面板 */}
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eee' }}>
              <h4 style={{ marginTop: 0 }}>⚙️ 游戏模式控制</h4>
              <div style={{ marginBottom: '10px' }}>
                <label>模式: </label>
                <select 
                  value={cardConfig.mode} 
                  onChange={e => setCardConfig({...cardConfig, mode: e.target.value})}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="RANDOM">🎲 完全随机</option>
                  <option value="FIXED">🎯 强制指定领主点数</option>
                </select>
              </div>

              {cardConfig.mode === 'FIXED' && (
                <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeeba' }}>
                  <label>设置领主点数 (1-10): </label>
                  <input 
                    type="number" min="1" max="10"
                    value={cardConfig.fixedLordValue}
                    onChange={e => setCardConfig({...cardConfig, fixedLordValue: Number(e.target.value)})}
                    style={{ width: '60px', padding: '5px' }}
                  />
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#856404' }}>下一局立即生效</span>
                </div>
              )}

              <button 
                onClick={handleSaveCardConfig} 
                disabled={loading}
                style={{
                  marginTop: '10px', padding: '8px 16px', background: loading ? '#ccc' : '#667eea', 
                  color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                {loading ? '保存中...' : '💾 保存设置'}
              </button>
            </div>

            {/* 财务数据 */}
            {cardStats && (
              <div className="metrics-grid" style={{ marginBottom: '20px' }}>
                <div className="metric-card">
                  <div className="metric-icon">💰</div>
                  <div className="metric-info"><h3>{cardStats.totalBet}</h3><p>今日流水</p></div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">📤</div>
                  <div className="metric-info"><h3 style={{color: '#ff4d4f'}}>{cardStats.totalPayout}</h3><p>今日派发</p></div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">📈</div>
                  <div className="metric-info"><h3 style={{color: cardStats.netIncome >= 0 ? '#52c41a' : '#ff4d4f'}}>{cardStats.netIncome}</h3><p>系统净赚</p></div>
                </div>
              </div>
            )}

            {/* 走势图 */}
            {cardStats && cardStats.history && (
              <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <h4 style={{ marginTop: 0 }}>📈 近30局开奖走势</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={cardStats.history}>
                    <defs>
                      <linearGradient id="colorLord" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="roundNumber" />
                    <YAxis domain={[1, 10]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="lordCard" stroke="#8884d8" fillOpacity={1} fill="url(#colorLord)" name="领主点数" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && <div className="loading-overlay"><div className="loading-spinner">加载中...</div></div>}
    </div>
  );
};

export default AdminDashboardPage;
