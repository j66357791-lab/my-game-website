// frontend/src/pages/admin/AdminMysteryCardPage.js
import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import './AdminMysteryCardPage.css';

const AdminMysteryCardPage = ({ user }) => {
  // ==================== 状态定义 ====================
  const [config, setConfig] = useState({
    mode: 'RANDOM',
    fixedLordValue: 5,
    biasDirection: 'none'
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('control'); // control | analytics

  // ==================== 初始化 ====================
  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, []);

  // ==================== 数据获取 ====================
  const fetchConfig = async () => {
    try {
      const res = await api.get('/admin/mystery-card/config');
      if (res.success) {
        setConfig(res.data);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/mystery-card/stats');
      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  // ==================== 操作函数 ====================
  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await api.post('/admin/mystery-card/config', config);
      if (res.success) {
        alert('✅ 设置已保存，下一局游戏立即生效！');
        await fetchConfig();
      } else {
        alert('❌ 保存失败');
      }
    } catch (error) {
      alert('❌ 保存失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 渲染 ====================
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-mystery-card">
        <div className="access-denied">
          <h2>🚫 访问被拒绝</h2>
          <p>您没有管理员权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-mystery-card">
      {/* 页面头部 */}
      <div className="amc-header">
        <h1>🎴 神秘卡牌管控中心</h1>
        <p>实时控制游戏 · 查看财务报表 · 分析游戏数据</p>
      </div>

      {/* 导航标签 */}
      <div className="amc-tabs">
        <button 
          className={`amc-tab ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          🎮 游戏控制
        </button>
        <button 
          className={`amc-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 数据分析
        </button>
      </div>

      {/* 内容区域 */}
      <div className="amc-content">
        {/* ==================== 游戏控制 ==================== */}
        {activeTab === 'control' && (
          <div className="amc-section">
            {/* 控制面板卡片 */}
            <div className="amc-card">
              <div className="amc-card-header">
                <h2>⚙️ 游戏模式控制</h2>
                <span className="amc-badge">实时生效</span>
              </div>

              <div className="amc-card-body">
                {/* 模式选择 */}
                <div className="amc-form-group">
                  <label>控制模式</label>
                  <div className="amc-mode-selector">
                    <button 
                      className={`amc-mode-btn ${config.mode === 'RANDOM' ? 'active' : ''}`}
                      onClick={() => setConfig({...config, mode: 'RANDOM'})}
                    >
                      🎲 完全随机
                      <small>公平模式</small>
                    </button>
                    <button 
                      className={`amc-mode-btn ${config.mode === 'FIXED' ? 'active' : ''}`}
                      onClick={() => setConfig({...config, mode: 'FIXED'})}
                    >
                      🎯 强制点数
                      <small>上帝模式</small>
                    </button>
                  </div>
                </div>

                {/* 强制点数设置 */}
                {config.mode === 'FIXED' && (
                  <div className="amc-form-group">
                    <label>设置领主点数 (1-10)</label>
                    <div className="amc-number-input">
                      {config.fixedLordValue >= 2 && (
                        <button onClick={() => setConfig({...config, fixedLordValue: config.fixedLordValue - 1})}>−</button>
                      )}
                      <input 
                        type="range"
                        min="1"
                        max="10"
                        value={config.fixedLordValue}
                        onChange={(e) => setConfig({...config, fixedLordValue: Number(e.target.value)})}
                      />
                      <span className="amc-number-display">{config.fixedLordValue}</span>
                      {config.fixedLordValue <= 9 && (
                        <button onClick={() => setConfig({...config, fixedLordValue: config.fixedLordValue + 1})}>+</button>
                      )}
                    </div>
                    <small className="amc-hint">⚠️ 设置后下一局立即生效</small>
                  </div>
                )}

                {/* 保存按钮 */}
                <div className="amc-form-actions">
                  <button 
                    className="amc-btn amc-btn-primary"
                    onClick={handleSaveConfig}
                    disabled={loading}
                  >
                    {loading ? '💾 保存中...' : '💾 保存设置'}
                  </button>
                </div>
              </div>
            </div>

            {/* 财务统计卡片 */}
            {stats && (
              <div className="amc-grid">
                <div className="amc-stat-card amc-stat-blue">
                  <div className="amc-stat-icon">💰</div>
                  <div className="amc-stat-content">
                    <small>今日流水</small>
                    <strong>{stats.totalFlow || 0}</strong>
                    <span>玩家下注总额</span>
                  </div>
                </div>
                <div className="amc-stat-card amc-stat-red">
                  <div className="amc-stat-icon">📤</div>
                  <div className="amc-stat-content">
                    <small>今日派发</small>
                    <strong>{stats.payout || 0}</strong>
                    <span>玩家赢得积分</span>
                  </div>
                </div>
                <div className={`amc-stat-card ${stats.income >= 0 ? 'amc-stat-green' : 'amc-stat-red'}`}>
                  <div className="amc-stat-icon">{stats.income >= 0 ? '📈' : '📉'}</div>
                  <div className="amc-stat-content">
                    <small>系统净赚</small>
                    <strong>{stats.income || 0}</strong>
                    <span>{stats.income >= 0 ? '平台盈利' : '平台亏损'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 数据分析 ==================== */}
        {activeTab === 'analytics' && (
          <div className="amc-section">
            {/* 开奖走势图 */}
            {stats && stats.history && stats.history.length > 0 && (
              <div className="amc-card">
                <div className="amc-card-header">
                  <h2>📈 开奖走势分析</h2>
                  <span className="amc-badge">近30局</span>
                </div>
                <div className="amc-card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.history}>
                      <defs>
                        <linearGradient id="colorLord" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="roundNumber" />
                      <YAxis domain={[1, 10]} />
                      <Tooltip 
                        formatter={(value, name) => [value, '领主点数']}
                        labelFormatter={(label) => `第 ${label} 轮`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="lordCard" 
                        stroke="#667eea" 
                        fillOpacity={1} 
                        fill="url(#colorLord)" 
                        name="领主点数" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 战将对比图 */}
            {stats && stats.history && stats.history.length > 0 && (
              <div className="amc-card">
                <div className="amc-card-header">
                  <h2>🎯 四方位对比分析</h2>
                </div>
                <div className="amc-card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.history.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="roundNumber" />
                      <YAxis domain={[1, 10]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="lordCard" fill="#667eea" name="领主" />
                      <Bar dataKey="generalsCards.east" fill="#8884d8" name="东" />
                      <Bar dataKey="generalsCards.south" fill="#82ca9d" name="南" />
                      <Bar dataKey="generalsCards.west" fill="#ffc658" name="西" />
                      <Bar dataKey="generalsCards.north" fill="#ff7300" name="北" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="amc-loading">
          <div className="amc-spinner"></div>
          <p>加载中...</p>
        </div>
      )}
    </div>
  );
};

export default AdminMysteryCardPage;
