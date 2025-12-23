// frontend/src/pages/admin/AdminMysteryCardPage.js
import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './AdminMysteryCardPage.css';

const AdminMysteryCardPage = ({ user }) => {
  const [config, setConfig] = useState({
    mode: 'RANDOM',
    fixedLordValue: 5,
    autoControl: { enabled: false, threshold: 2000 }
  });
  
  const [statsPeriod, setStatsPeriod] = useState('today'); 
  const [stats, setStats] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('control'); 

  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, []);

  // 切换周期时自动刷新
  useEffect(() => {
    fetchStats();
  }, [statsPeriod]);

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
    setLoading(true);
    try {
      const res = await api.get(`/admin/mystery-card/stats?period=${statsPeriod}`);
      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
      alert('获取数据失败，请点击“同步最新数据”重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await api.post('/admin/mystery-card/config', config);
      if (res.success) {
        alert('✅ 设置已保存');
        await fetchConfig();
      }
    } catch (error) {
      alert('❌ 保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') return <div className="access-denied">🚫 访问被拒绝</div>;

  return (
    <div className="admin-mystery-card">
      <div className="amc-header">
        <h1>🎴 神秘卡牌管控中心</h1>
        <p>实时流水监控 · 智能防亏 · 数据分析</p>
      </div>

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

      <div className="amc-content">
        {/* ==================== 游戏控制 ==================== */}
        {activeTab === 'control' && (
          <div className="amc-section">
            <div className="amc-card">
              <div className="amc-card-header">
                <h2>⚙️ 游戏模式控制</h2>
              </div>

              <div className="amc-card-body">
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
                
                {config.mode === 'FIXED' && (
                  <div className="amc-form-group">
                    <label>设置领主点数 (1-10)</label>
                    <input 
                      type="range" min="1" max="10" 
                      value={config.fixedLordValue} 
                      onChange={(e) => setConfig({...config, fixedLordValue: Number(e.target.value)})} 
                    />
                    <div className="amc-number-display">{config.fixedLordValue}</div>
                  </div>
                )}

                {/* 🔧 智能防亏设置 (针对性优化) */}
                <div className="amc-form-group" style={{borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '20px'}}>
                  <label style={{fontSize: '16px', fontWeight: 'bold', color: '#333'}}>🤖 智能防亏控制</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px'}}>
                    <input 
                      type="checkbox" 
                      id="autoControl" 
                      checked={config.autoControl?.enabled} 
                      onChange={(e) => setConfig({...config, autoControl: {...config.autoControl, enabled: e.target.checked}})} 
                    />
                    <label htmlFor="autoControl" style={{margin: 0, fontSize: '15px'}}>
                      开启智能防亏 (当系统亏损超过阈值时自动干预)
                    </label>
                  </div>
                  
                  {config.autoControl?.enabled && (
                    <div style={{background: '#f0f7ff', padding: '15px', borderRadius: '8px', border: '1px solid #d0e1ff'}}>
                      <div style={{marginBottom: '10px'}}>
                        <label style={{margin: 0, color: '#333'}}>设置亏损阈值 (分)：</label>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                          <input 
                            type="number" 
                            value={config.autoControl.threshold} 
                            onChange={(e) => setConfig({...config, autoControl: {...config.autoControl, threshold: Number(e.target.value)}})}
                            style={{padding: '8px', width: '120px', borderRadius: '4px', border: '1px solid #ccc'}}
                          />
                          <small style={{color: '#666'}}>例如：2000 (即亏损超过2000分触发)</small>
                        </div>
                      </div>
                      <small style={{color: '#f5222d', display: 'block'}}>
                        ⚠️ 注意：开启后，如果今日净赚 (流水-派发) 小于负的阈值，系统将强制下一局领主点数为 8/9/10 以回血。
                      </small>
                    </div>
                  )}
                </div>

                <div className="amc-form-actions">
                  <button 
                    className="amc-btn amc-btn-primary" 
                    onClick={handleSaveConfig} 
                    disabled={loading}
                  >
                    {loading ? '保存中...' : '💾 保存设置'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 数据分析 ==================== */}
        {activeTab === 'analytics' && (
          <div className="amc-section">
            {/* 🔧 新增：同步按钮 + 保留周期切换 */}
            <div className="amc-card" style={{marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{padding: '0 10px', fontSize: '14px', color: '#666'}}>
                当前周期：<strong>{statsPeriod === 'today' ? '今日' : statsPeriod === 'week' ? '本周' : '本月'}</strong>
              </div>
              <div style={{display: 'flex', gap: '10px', padding: '10px'}}>
                <button 
                  className="amc-btn" 
                  onClick={() => setStatsPeriod('today')}
                  style={{background: statsPeriod === 'today' ? '#667eea' : '#fff', color: statsPeriod === 'today' ? '#fff' : '#667eea', border: '1px solid #667eea'}}
                >
                  今日
                </button>
                <button 
                  className="amc-btn" 
                  onClick={() => setStatsPeriod('week')}
                  style={{background: statsPeriod === 'week' ? '#667eea' : '#fff', color: statsPeriod === 'week' ? '#fff' : '#667eea', border: '1px solid #667eea'}}
                >
                  本周
                </button>
                <button 
                  className="amc-btn" 
                  onClick={() => setStatsPeriod('month')}
                  style={{background: statsPeriod === 'month' ? '#667eea' : '#fff', color: statsPeriod === 'month' ? '#fff' : '#667eea', border: '1px solid #667eea'}}
                >
                  本月
                </button>
                {/* 🔧 同步按钮 */}
                <button 
                  className="amc-btn amc-btn-primary" 
                  onClick={fetchStats}
                  disabled={loading}
                  style={{marginLeft: '10px'}}
                >
                  🔄 同步最新数据
                </button>
              </div>
            </div>

            {/* 🔧 删除今日派发，保留流水和净赚 */}
            {stats && (
              <div className="amc-grid" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
                <div className="amc-stat-card amc-stat-blue">
                  <div className="amc-stat-icon">💰</div>
                  <div className="amc-stat-content">
                    <small>本期流水</small>
                    <strong>{stats.stats.totalFlow || 0}</strong>
                    <span>玩家下注总额</span>
                  </div>
                </div>
                <div className={`amc-stat-card ${stats.stats.netProfit >= 0 ? 'amc-stat-green' : 'amc-stat-red'}`}>
                  <div className="amc-stat-icon">{stats.stats.netProfit >= 0 ? '📈' : '📉'}</div>
                  <div className="amc-stat-content">
                    <small>系统净赚</small>
                    <strong>{stats.stats.netProfit || 0}</strong>
                    <span>流水 - 派发</span>
                  </div>
                </div>
              </div>
            )}

            {/* 详细流水表格 */}
            {stats && stats.roundDetails && (
              <div className="amc-card">
                <div className="amc-card-header">
                  <h2>📋 每期流水明细</h2>
                </div>
                <div className="amc-card-body" style={{padding: 0}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
                    <thead>
                      <tr style={{background: '#f8f9fa', borderBottom: '1px solid #eee'}}>
                        <th style={{padding: '12px', textAlign: 'left'}}>轮次</th>
                        <th style={{padding: '12px', textAlign: 'left'}}>领主</th>
                        <th style={{padding: '12px', textAlign: 'left'}}>下注总额</th>
                        <th style={{padding: '12px', textAlign: 'left'}}>系统派发</th>
                        <th style={{padding: '12px', textAlign: 'left'}}>净赚</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.roundDetails.map((item) => (
                        <tr key={item.roundNumber} style={{borderBottom: '1px solid #eee'}}>
                          <td style={{padding: '12px'}}>第 {item.roundNumber} 局</td>
                          <td style={{padding: '12px', fontWeight: 'bold', color: '#667eea'}}>{item.lordCard} 点</td>
                          <td style={{padding: '12px'}}>{item.totalBets}</td>
                          <td style={{padding: '12px'}}>{item.totalWins}</td>
                          <td style={{padding: '12px', color: item.income >= 0 ? 'green' : 'red', fontWeight: 'bold'}}>
                            {item.income > 0 ? '+' : ''}{item.income}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 真实走势图 */}
            {stats && stats.history && stats.history.length > 0 && (
              <div className="amc-card">
                <div className="amc-card-header">
                  <h2>📈 开奖走势 (近30局)</h2>
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
                      <Area type="monotone" dataKey="lordCard" stroke="#667eea" fillOpacity={1} fill="url(#colorLord)" name="领主点数" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMysteryCardPage;
