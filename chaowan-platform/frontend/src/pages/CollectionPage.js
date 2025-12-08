// src/pages/CollectionPage.js - V7.4.2 轻度优化版
import React, { useState, useMemo } from 'react';
import './CollectionPage.css';

const CollectionPage = ({ user }) => {
  const [selectedDoll, setSelectedDoll] = useState(null);
  
  // 🚀 优化1: 使用useMemo缓存用户收藏数据
  const userCollection = useMemo(() => [
    { id: 1, name: '小熊布朗', rarity: 'common', obtainedDate: '2024-01-15', icon: '🧸', stars: '⭐' },
    { id: 2, name: '兔子朱迪', rarity: 'common', obtainedDate: '2024-01-16', icon: '🐰', stars: '⭐' },
    { id: 3, name: '狐狸尼克', rarity: 'rare', obtainedDate: '2024-01-17', icon: '🦊', stars: '⭐⭐' }
  ], []); // 空依赖数组，数据不变

  // 🚀 优化2: 缓存统计数据计算
  const collectionStats = useMemo(() => {
    return {
      total: userCollection.length,
      common: userCollection.filter(d => d.rarity === 'common').length,
      rare: userCollection.filter(d => d.rarity === 'rare').length,
      epic: userCollection.filter(d => d.rarity === 'epic').length,
      legendary: userCollection.filter(d => d.rarity === 'legendary').length
    };
  }, [userCollection]);

  // 🚀 优化3: 缓存关闭弹窗函数
  const handleCloseModal = useMemo(() => {
    return () => setSelectedDoll(null);
  }, []);

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h2>🧸 我的收藏</h2>
        <div className="collection-stats">
          <span>共 {collectionStats.total} 个娃娃</span>
        </div>
      </div>

      {/* 收藏统计 */}
      <div className="stats-card">
        <h3>收藏统计</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">普通</span>
            <span className="stat-value">{collectionStats.common}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">稀有</span>
            <span className="stat-value">{collectionStats.rare}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">史诗</span>
            <span className="stat-value">{collectionStats.epic}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">传说</span>
            <span className="stat-value">{collectionStats.legendary}</span>
          </div>
        </div>
      </div>

      {/* 收藏列表 */}
      <div className="collection-grid">
        {userCollection.map(doll => (
          <div 
            key={doll.id} 
            className="collection-item"
            onClick={() => setSelectedDoll(doll)}
          >
            <div className="doll-image">{doll.icon}</div>
            <div className="doll-info">
              <h4>{doll.name}</h4>
              <div className="doll-rarity">{doll.stars}</div>
              <div className="obtain-date">获得于 {doll.obtainedDate}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 娃娃详情弹窗 */}
      {selectedDoll && (
        <div className="doll-detail-modal" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDoll.name}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="doll-image-large">{selectedDoll.icon}</div>
              <div className="doll-details">
                <div className="detail-row">
                  <span className="label">稀有度：</span>
                  <span className="value">{selectedDoll.stars}</span>
                </div>
                <div className="detail-row">
                  <span className="label">获得时间：</span>
                  <span className="value">{selectedDoll.obtainedDate}</span>
                </div>
                <div className="detail-row">
                  <span className="label">收藏编号：</span>
                  <span className="value">#{selectedDoll.id.toString().padStart(4, '0')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionPage;
