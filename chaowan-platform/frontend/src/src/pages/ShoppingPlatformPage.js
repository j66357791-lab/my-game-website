// src/pages/ShoppingPlatformPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ShoppingPlatformPage.css';

const ShoppingPlatformPage = ({ user }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'toys', name: '玩具手办' },
    { id: 'clothing', name: '服装配饰' },
    { id: 'electronics', name: '数码电子' },
    { id: 'home', name: '家居生活' }
  ];

  const products = [
    {
      id: 1,
      name: '潮玩盲盒系列 第一季',
      price: 89,
      originalPrice: 129,
      image: '/api/placeholder/200/200',
      category: 'toys',
      rating: 4.9,
      sales: 2000,
      tag: '热销'
    },
    {
      id: 2,
      name: '可爱毛绒公仔 大号',
      price: 59,
      originalPrice: 89,
      image: '/api/placeholder/200/200',
      category: 'toys',
      rating: 4.8,
      sales: 1500,
      tag: '新品'
    },
    {
      id: 3,
      name: '限量版徽章套装',
      price: 39,
      originalPrice: 59,
      image: '/api/placeholder/200/200',
      category: 'clothing',
      rating: 5.0,
      sales: 800,
      tag: '限量'
    },
    {
      id: 4,
      name: '无线蓝牙耳机',
      price: 199,
      originalPrice: 299,
      image: '/api/placeholder/200/200',
      category: 'electronics',
      rating: 4.7,
      sales: 3000,
      tag: '爆款'
    },
    {
      id: 5,
      name: '创意台灯',
      price: 79,
      originalPrice: 119,
      image: '/api/placeholder/200/200',
      category: 'home',
      rating: 4.6,
      sales: 600,
      tag: '推荐'
    },
    {
      id: 6,
      name: '潮流T恤',
      price: 49,
      originalPrice: 79,
      image: '/api/placeholder/200/200',
      category: 'clothing',
      rating: 4.5,
      sales: 1200,
      tag: '特价'
    }
  ];

  const filteredProducts = products.filter(product => 
    selectedCategory === 'all' || product.category === selectedCategory
  );

  return (
    <div className="shopping-platform-page">
      {/* 页面头部 */}
      <div className="platform-header">
        <button className="back-btn" onClick={() => navigate('/mall')}>‹ 返回</button>
        <h2>🛍️ 购物平台</h2>
        <button className="cart-btn">
          🛒
          <span className="cart-count">0</span>
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="search-bar">
        <input 
          type="text" 
          placeholder="搜索商品..." 
          className="search-input"
        />
        <button className="search-btn">🔍</button>
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
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* 商品列表 */}
      <div className="product-list">
        {filteredProducts.map((product) => (
          <div key={product.id} className="product-item">
            <div className="product-image">
              <img src={product.image} alt={product.name} />
              {product.tag && (
                <span className="product-tag">{product.tag}</span>
              )}
            </div>
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <div className="product-rating">
                <span className="stars">⭐ {product.rating}</span>
                <span className="sales">月销{product.sales}+</span>
              </div>
              <div className="product-price">
                <span className="current-price">¥{product.price}</span>
                <span className="original-price">¥{product.originalPrice}</span>
              </div>
            </div>
            <div className="product-actions">
              <button className="add-to-cart">加入购物车</button>
              <button className="buy-now">立即购买</button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部占位 */}
      <div className="bottom-spacer"></div>
    </div>
  );
};

export default ShoppingPlatformPage;

