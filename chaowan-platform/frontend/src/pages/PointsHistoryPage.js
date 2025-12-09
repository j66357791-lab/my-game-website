import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './PointsHistoryPage.css';

const PointsHistoryPage = ({ user }) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // 🚀 优化1: 使用useMemo缓存统计数据计算
  const stats = useMemo(() => {
    const earned = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const spent = Math.abs(transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    return {
      totalEarned: earned,
      totalSpent: spent,
      currentBalance: user.points
    };
  }, [transactions, user.points]);

  // 🚀 优化2: 使用useMemo缓存模拟数据
  const mockTransactions = useMemo(() => [
    {
      id: 1,
      type: 'refining_claim',
      description: '炼化积分 - 完成5个字符',
      amount: 50,
      balance: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5分钟前
      emoji: '🔥'
    },
    {
      id: 2,
      type: 'blindbox_draw',
      description: '盲盒单抽',
      amount: -10,
      balance: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
      emoji: '🎁'
    },
    {
      id: 3,
      type: 'blindbox_reward',
      description: '盲盒奖励兑换 - 内测红包',
      amount: 1.58,
      balance: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1天前
      emoji: '🧧'
    },
    {
      id: 4,
      type: 'checkin',
      description: '每日签到奖励',
      amount: 10,
      balance: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2天前
      emoji: '📅'
    },
    {
      id: 5,
      type: 'refining_claim',
      description: '炼化积分 - 完成3个字符',
      amount: 30,
      balance: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3天前
      emoji: '🔥'
    },
    {
      id: 6,
      type: 'purchase',
      description: '购买 小熊布朗',
      amount: -30,
      balance: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4天前
      emoji: '🧸'
    },
    {
      id: 7,
      type: 'recycle',
      description: '回收娃娃',
      amount: 15,
      balance: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5天前
      emoji: '♻️'
    },
    {
      id: 8,
      type: 'production',
      description: '娃娃产出收益',
      amount: 5.2,
      balance: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6天前
      emoji: '🏭'
    }
  ], []); // 空依赖数组，只创建一次

  // 🚀 优化3: 只在组件挂载时加载数据，移除user.points依赖
  useEffect(() => {
    setLoading(true);
    
    // 模拟异步加载
    const timer = setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 300); // 减少延迟时间

    return () => clearTimeout(timer);
  }, []); // 移除user.points依赖

  // 🚀 优化4: 缓存筛选后的交易记录
  const filteredTransactions = useMemo(() => {
    return filter === 'all' 
      ? transactions 
      : transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  // 🚀 优化5: 缓存格式化函数
  const formatTimeAgo = useMemo(() => {
    return (timestamp) => {
      const seconds = Math.floor((new Date() - timestamp) / 1000);
      
      if (seconds < 60) return '刚刚';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)}天前`;
      return timestamp.toLocaleDateString();
    };
  }, []);

  // 🚀 优化6: 缓存类型标签和颜色函数
  const getTypeLabel = useMemo(() => {
    const labels = {
      purchase: '购买',
      reward: '奖励',
      bonus: '奖励',
      refund: '退款',
      checkin: '签到',
      production: '娃娃产出',
      recycle: '娃娃回收',
      register: '注册奖励',
      level_up: '升级奖励',
      admin_add: '管理员增加',
      admin_deduct: '管理员扣除',
      blindbox_draw: '盲盒抽取',
      blindbox_reward: '盲盒奖励',
      refining_claim: '炼化积分'
    };
    return (type) => labels[type] || type;
  }, []);

  const getTypeColor = useMemo(() => {
    const colors = {
      purchase: '#ff6b6b',
      reward: '#4caf50',
      bonus: '#ffd700',
      refund: '#2196f3',
      checkin: '#9c27b0',
      production: '#4caf50',
      recycle: '#ff9800',
      register: '#00bcd4',
      level_up: '#e91e63',
      admin_add: '#4caf50',
      admin_deduct: '#f44336',
      blindbox_draw: '#ff6b6b',
      blindbox_reward: '#ffd700',
      refining_claim: '#4caf50'
    };
    return (type) => colors[type] || '#666';
  }, []);

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="points-history-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>加载积分记录中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="points-history-container">
      {/* 顶部导航栏 */}
      <header className="history-header">
        <div className="header-content">
          <button className="back-btn" onClick={handleBackToHome}>
            ← 返回主页
          </button>
          <h1 className="logo">📊 积分记录</h1>
          <div className="user-points">
            💰 {user.points} 积分
          </div>
        </div>
      </header>

      {/* 主要内容区 */}
      <main className="history-main">
        {/* 统计卡片 */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card earned">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-number">+{stats.totalEarned}</div>
                <div className="stat-label">总获得</div>
              </div>
            </div>
            <div className="stat-card spent">
              <div className="stat-icon">📉</div>
              <div className="stat-content">
                <div className="stat-number">-{stats.totalSpent}</div>
                <div className="stat-label">总消费</div>
              </div>
            </div>
            <div className="stat-card balance">
              <div className="stat-icon">💎</div>
              <div className="stat-content">
                <div className="stat-number">{stats.currentBalance}</div>
                <div className="stat-label">当前余额</div>
              </div>
            </div>
          </div>
        </section>

        {/* 筛选器 */}
        <section className="filter-section">
          <h3>🔍 筛选记录</h3>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              全部
            </button>
            <button 
              className={`filter-btn ${filter === 'purchase' ? 'active' : ''}`}
              onClick={() => setFilter('purchase')}
            >
              购买
            </button>
            <button 
              className={`filter-btn ${filter === 'checkin' ? 'active' : ''}`}
              onClick={() => setFilter('checkin')}
            >
              签到
            </button>
            <button 
              className={`filter-btn ${filter === 'refining_claim' ? 'active' : ''}`}
              onClick={() => setFilter('refining_claim')}
            >
              炼化
            </button>
            <button 
              className={`filter-btn ${filter === 'blindbox_draw' ? 'active' : ''}`}
              onClick={() => setFilter('blindbox_draw')}
            >
              盲盒
            </button>
          </div>
        </section>

        {/* 交易记录列表 */}
        <section className="transactions-section">
          <h3>📋 交易记录</h3>
          <div className="transactions-list">
            {filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>暂无相关记录</p>
              </div>
            ) : (
              filteredTransactions.map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-emoji">
                    {transaction.emoji}
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-header">
                      <span 
                        className="transaction-type"
                        style={{ color: getTypeColor(transaction.type) }}
                      >
                        {getTypeLabel(transaction.type)}
                      </span>
                      <span className="transaction-time">
                        {formatTimeAgo(transaction.timestamp)}
                      </span>
                    </div>
                    <div className="transaction-description">
                      {transaction.description}
                    </div>
                    <div className="transaction-amount">
                      <span className={`amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </span>
                      <span className="balance">
                        余额: {transaction.balance}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 导出按钮 */}
        <section className="export-section">
          <button className="export-btn">
            📥 导出积分记录
          </button>
        </section>
      </main>
    </div>
  );
};

export default PointsHistoryPage;
