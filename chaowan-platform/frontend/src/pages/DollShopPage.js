// src/pages/DollShopPage.js - V7.4.1 全局状态融合版
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './DollShopPage.css';

const DollShopPage = ({ user }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  
  // 🔧 V7.4.1 使用全局状态
  const { 
    points, 
    loading, 
    error, 
    purchaseDoll,
    setError 
  } = useUser();

  const categories = [
    { id: 'all', name: '全部', icon: '🎯' },
    { id: 'level1', name: '一级', icon: '⭐' },
    { id: 'level2', name: '二级', icon: '⭐⭐' },
    { id: 'locked', name: '待解锁', icon: '🔒' }
  ];

  // V7.3.2.1 娃娃数据（更新后的经济模型）
  const dolls = [
    {
      id: 1, 
      name: '萌新宝宝', 
      emoji: '👶', 
      price: 50, 
      output: 0.88, 
      rarity: '⭐',
      level: 1,
      days: 60,
      recycle: '0.88-8.88积分 + 30经验',
      category: 'level1',
      stock: 999,
      description: '新用户的入门级伙伴，价格低廉，是体验平台产出的基础'
    },
    {
      id: 2, 
      name: '元气宝贝', 
      emoji: '⚡', 
      price: 250, 
      output: 3.88, 
      rarity: '⭐⭐',
      level: 2,
      days: 70,
      recycle: '随机积分 + 30经验',
      category: 'level2',
      stock: 500,
      description: '进阶用户的更优选择，产出效率更高'
    },
    {
      id: 3, 
      name: '三级娃娃', 
      emoji: '🔒', 
      price: 0, 
      output: 0, 
      rarity: '⭐⭐⭐',
      level: 3,
      days: 0,
      recycle: '敬请期待',
      category: 'locked',
      stock: 0,
      description: '3-10级娃娃处于待更新状态，等后续开放'
    },
    {
      id: 4, 
      name: '高级娃娃', 
      emoji: '🔒', 
      price: 0, 
      output: 0, 
      rarity: '⭐⭐⭐⭐',
      level: 4,
      days: 0,
      recycle: '敬请期待',
      category: 'locked',
      stock: 0,
      description: '更高级别的娃娃，敬请期待'
    }
  ];

  const filteredDolls = dolls.filter(doll => 
    selectedCategory === 'all' || doll.category === selectedCategory
  );

  const sortedDolls = [...filteredDolls].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'output-high':
        return b.output - a.output;
      case 'level-high':
        return b.level - a.level;
      default:
        return a.level - b.level;
    }
  });

  // 🔧 V7.4.1 融合全局状态的购买函数
  const handleBuy = async (doll) => {
    if (doll.price === 0) {
      alert('该娃娃暂未开放，敬请期待后续更新！');
      return;
    }

    if (points >= doll.price) {
      const confirmMessage = `确认购买 ${doll.name}？\n\n` +
        `价格：${doll.price} 积分\n` +
        `产出：+${doll.output}/天\n` +
        `持续：${doll.days}天\n` +
        `回收：${doll.recycle}\n\n` +
        `当前积分：${points}\n` +
        `购买后积分：${points - doll.price}`;
      
      if (window.confirm(confirmMessage)) {
        try {
          // 🔧 V7.4.1 使用全局购买方法
          const result = await purchaseDoll(doll);
          
          if (result.success) {
            alert(`购买成功！获得 ${doll.name}，开始为你产出积分吧！`);
            console.log('✅ 娃娃购买成功:', result.doll);
          } else {
            throw new Error(result.error || '购买失败');
          }
        } catch (error) {
          console.error('❌ 购买娃娃失败:', error);
          setError('购买娃娃失败: ' + error.message);
          alert('购买失败: ' + error.message);
        }
      }
    } else {
      alert(`积分不足！\n需要：${doll.price} 积分\n当前：${points} 积分\n还差：${doll.price - points} 积分`);
    }
  };

  return (
    <div className="doll-shop-page">
      {/* 页面头部 */}
      <div className="shop-header">
        <button className="back-btn" onClick={() => navigate('/mall')}>‹ 返回</button>
        <h2>🧸 娃娃商城</h2>
        <div className="user-points">
          <span>💰 {points}</span>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="category-filter">
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 排序选项 */}
      <div className="sort-options">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
          <option value="default">默认排序</option>
          <option value="level-high">等级从高到低</option>
          <option value="price-low">价格从低到高</option>
          <option value="price-high">价格从高到低</option>
          <option value="output-high">产出从高到低</option>
        </select>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {/* 娃娃列表 */}
      <div className="doll-list">
        {sortedDolls.map((doll) => (
          <div key={doll.id} className={`doll-item ${doll.price === 0 ? 'locked' : 'available'}`}>
            <div className="doll-emoji">{doll.emoji}</div>
            <div className="doll-info">
              <h3 className="doll-name">{doll.name}</h3>
              <p className="doll-rarity">{doll.rarity} Lv.{doll.level}</p>
              <div className="doll-stats">
                <span className="stat-item">
                  <span className="stat-label">产出:</span>
                  <span className="stat-value">+{doll.output}/天</span>
                </span>
                <span className="stat-item">
                  <span className="stat-label">持续:</span>
                  <span className="stat-value">{doll.days}天</span>
                </span>
              </div>
              <div className="doll-recycle-info">
                <span className="recycle-label">回收:</span>
                <span className="recycle-value">{doll.recycle}</span>
              </div>
              <div className="doll-description">
                {doll.description}
              </div>
              <div className="stock-info">
                {doll.stock > 0 ? `库存: ${doll.stock}件` : '暂无库存'}
              </div>
            </div>
            <div className="purchase-section">
              <div className="price-display">
                <span className="price">
                  {doll.price > 0 ? `💰 ${doll.price}` : '🔒 待更新'}
                </span>
              </div>
              <button 
                className={`buy-button ${points >= doll.price && doll.price > 0 ? 'available' : 'insufficient'}`}
                onClick={() => handleBuy(doll)}
                disabled={loading || points < doll.price || doll.price === 0}
              >
                {loading ? '处理中...' : 
                 doll.price === 0 ? '待解锁' : 
                 points >= doll.price ? '购买' : '积分不足'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部占位 */}
      <div className="bottom-spacer"></div>
    </div>
  );
};

export default DollShopPage;
