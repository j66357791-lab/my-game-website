// frontend/src/components/IconBrawl/Sidebar.js
import React from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, game, user }) => {
  if (!isOpen) return null;

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar-content" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <h3>📊 游戏数据</h3>
          <button className="sidebar-close" onClick={onClose}>×</button>
        </div>
        
        <div className="sidebar-body">
          {/* 近期开奖 */}
          <div className="sidebar-section">
            <h4>🎲 近期开奖</h4>
            <div className="recent-results">
              <div className="result-item">
                <span className="session-id">G123456</span>
                <span className="result-icons">❤️ 🍔 🎁</span>
                <span className="result-time">2分钟前</span>
              </div>
              <div className="result-item">
                <span className="session-id">G123455</span>
                <span className="result-icons">🥤 🚗 🧊</span>
                <span className="result-time">5分钟前</span>
              </div>
            </div>
          </div>

          {/* 数据统计 */}
          <div className="sidebar-section">
            <h4>📈 数据统计</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-icon">❤️</span>
                <span className="stat-value">25%</span>
                <span className="stat-label">爱心</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🍔</span>
                <span className="stat-value">18%</span>
                <span className="stat-label">汉堡</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🎁</span>
                <span className="stat-value">22%</span>
                <span className="stat-label">宝箱</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🥤</span>
                <span className="stat-value">15%</span>
                <span className="stat-label">可乐</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🚗</span>
                <span className="stat-value">12%</span>
                <span className="stat-label">汽车</span>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🧊</span>
                <span className="stat-value">8%</span>
                <span className="stat-label">冰箱</span>
              </div>
            </div>
          </div>

          {/* 走势分析 */}
          <div className="sidebar-section">
            <h4>🔥 走势分析</h4>
            <div className="trend-analysis">
              <div className="trend-item hot">
                <span className="trend-icon">🔥</span>
                <span className="trend-name">热号</span>
                <span className="trend-icons">❤️ 🎁 🍔</span>
              </div>
              <div className="trend-item cold">
                <span className="trend-icon">❄️</span>
                <span className="trend-name">冷号</span>
                <span className="trend-icons">🧊 🚗 🥤</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
