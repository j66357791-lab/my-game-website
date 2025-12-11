// frontend/src/components/IconBrawl/Sidebar.js
import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, game, user, gameHistory, icons }) => {
  const [activeTab, setActiveTab] = useState('recent');

  // 🔧 计算图标统计
  const getIconStats = () => {
    const stats = {};
    Object.keys(icons).forEach(key => {
      stats[key] = { count: 0, percentage: 0 };
    });

    let totalAppearances = 0;
    gameHistory.forEach(session => {
      if (session.icons) {
        session.icons.forEach(icon => {
          if (stats[icon]) {
            stats[icon].count++;
            totalAppearances++;
          }
        });
      }
    });

    // 计算百分比
    Object.keys(stats).forEach(key => {
      stats[key].percentage = totalAppearances > 0 ? 
        (stats[key].count / totalAppearances * 100).toFixed(1) : 0;
    });

    return stats;
  };

  // 🔧 获取热号和冷号
  const getHotColdIcons = () => {
    const stats = getIconStats();
    const sorted = Object.entries(stats)
      .sort(([,a], [,b]) => b.count - a.count);
    
    return {
      hot: sorted.slice(0, 3),
      cold: sorted.slice(-3).reverse()
    };
  };

  const { hot, cold } = getHotColdIcons();

  if (!isOpen) return null;

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar-content" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <h3>📊 游戏数据</h3>
          <button className="sidebar-close" onClick={onClose}>×</button>
        </div>
        
        <div className="sidebar-tabs">
          <button 
            className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            📊 近期开奖
          </button>
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📈 数据统计
          </button>
          <button 
            className={`tab-btn ${activeTab === 'trend' ? 'active' : ''}`}
            onClick={() => setActiveTab('trend')}
          >
            🔥 走势分析
          </button>
        </div>
        
        <div className="sidebar-body">
          {/* 🔧 近期开奖 */}
          {activeTab === 'recent' && (
            <div className="sidebar-section">
              <div className="recent-results">
                {gameHistory.length > 0 ? (
                  gameHistory.map((session, index) => (
                    <div key={index} className="result-item">
                      <span className="session-id">
                        {/* 🔧 局号格式：000001 */}
                        第{String(index + 1).padStart(6, '0')}期
                      </span>
                      <span className="result-icons">
                        {session.icons?.map(icon => icons[icon]?.symbol || icon).join(' ')}
                      </span>
                      <span className="result-combination">
                        {session.combination?.name}
                      </span>
                      <span className="result-time">
                        {new Date(session.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>暂无开奖记录</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🔧 数据统计 */}
          {activeTab === 'stats' && (
            <div className="sidebar-section">
              <div className="stats-grid">
                {Object.entries(getIconStats()).map(([key, stat]) => (
                  <div key={key} className="stat-item">
                    <span className="stat-icon">{icons[key]?.symbol}</span>
                    <span className="stat-value">{stat.percentage}%</span>
                    <span className="stat-label">{icons[key]?.name}</span>
                    <span className="stat-count">{stat.count}次</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🔧 走势分析 */}
          {activeTab === 'trend' && (
            <div className="sidebar-section">
              <div className="trend-analysis">
                <div className="trend-group">
                  <h4>🔥 热号</h4>
                  <div className="trend-list">
                    {hot.map(([key, stat]) => (
                      <div key={key} className="trend-item hot">
                        <span className="trend-icon">{icons[key]?.symbol}</span>
                        <span className="trend-name">{icons[key]?.name}</span>
                        <span className="trend-count">{stat.count}次</span>
                        <span className="trend-percentage">{stat.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="trend-group">
                  <h4>❄️ 冷号</h4>
                  <div className="trend-list">
                    {cold.map(([key, stat]) => (
                      <div key={key} className="trend-item cold">
                        <span className="trend-icon">{icons[key]?.symbol}</span>
                        <span className="trend-name">{icons[key]?.name}</span>
                        <span className="trend-count">{stat.count}次</span>
                        <span className="trend-percentage">{stat.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
