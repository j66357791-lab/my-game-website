// src/pages/MallPage.js - 精简优化版
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './MallPage.css';

const MallPage = ({ user }) => {
  const navigate = useNavigate();
  const [currentRecommendIndex, setCurrentRecommendIndex] = useState(0);

  // 🔧 使用全局状态
  const { 
    points, 
    loading, 
    error, 
    purchaseDoll,
    setError,
    cashBalance // 假设 UserContext 有现金余额
  } = useUser();

  // 购物平台商品数据（随机推荐）
  const shoppingProducts = [
    { 
      id: 1, 
      name: '潮玩盲盒系列', 
      price: 89, 
      originalPrice: 129, 
      rating: 4.9, 
      sales: 2000,
      tag: '热销',
      description: '正版授权 精美手办'
    },
    { 
      id: 2, 
      name: '可爱毛绒公仔', 
      price: 59, 
      originalPrice: 89, 
      rating: 4.8, 
      sales: 1500,
      tag: '新品',
      description: '柔软材质 安全环保'
    },
    { 
      id: 3, 
      name: '限量版徽章套装', 
      price: 39, 
      originalPrice: 59, 
      rating: 5.0, 
      sales: 100,
      tag: '限量',
      description: '金属材质 精工制作'
    }
  ];

  // 新人首单商品
  const newCustomerProducts = [
    {
      id: 1,
      name: '29.9元 20盒蒙牛纯牛奶',
      price: 29.9,
      rewardPoints: 299,
      description: '附赠奖励积分299',
      image: 'https://via.placeholder.com/200x200?text=蒙牛牛奶'
    },
    {
      id: 2,
      name: '9.9首充花费',
      price: 9.9,
      rewardPoints: 99,
      description: '赠送积分99，仅限购买一次',
      image: 'https://via.placeholder.com/200x200?text=首充礼包'
    }
  ];

  // 自动轮播推荐
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentRecommendIndex((prev) => (prev + 1) % shoppingProducts.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [shoppingProducts.length]);

  const handleDotClick = (index) => {
    setCurrentRecommendIndex(index);
  };

  const navigateToShoppingPlatform = () => {
    navigate('/shopping-platform');
  };

  // 购买新人商品
  const handleBuyNewProduct = async (product) => {
    if (cashBalance < product.price) {
      alert(`余额不足！需要 ${product.price} 元，当前只有 ${cashBalance} 元`);
      return;
    }
    
    try {
      // 模拟购买成功
      alert(`购买成功！获得 ${product.name}`);
      console.log('✅ 新人商品购买成功:', product);
      
      // 更新用户积分
      // 这里应该调用 UserContext 的方法更新用户积分
      // updateUser({ points: points + product.rewardPoints });
      
    } catch (error) {
      console.error('❌ 购买新人商品失败:', error);
      setError('购买失败: ' + error.message);
      alert('购买失败: ' + error.message);
    }
  };

  return (
    <div className="mall-page">
      {/* 购物平台推荐版块 */}
      <div className="recommendation-section">
        <div className="recommendation-header">
          <h3>🔥 购物平台推荐</h3>
          <div className="carousel-dots">
            {shoppingProducts.map((_, index) => (
              <span 
                key={index} 
                className={`dot ${index === currentRecommendIndex ? 'active' : ''}`}
                onClick={() => handleDotClick(index)}
              ></span>
            ))}
          </div>
        </div>
        
        <div className="recommendation-carousel">
          {shoppingProducts.map((product, index) => (
            <div 
              key={product.id} 
              className={`recommendation-card ${index === currentRecommendIndex ? 'active' : ''}`}
            >
              <div className="recommendation-emoji">🛍️</div>
              <div className="recommendation-info">
                <div className="recommendation-tag">{product.tag}</div>
                <h4 className="recommendation-name">{product.name}</h4>
                <p className="recommendation-desc">{product.description}</p>
                <div className="recommendation-stats">
                  <span>⭐ {product.rating}分</span>
                  <span>月销{product.sales}+</span>
                </div>
              </div>
              <div className="recommendation-price">
                <span className="price-amount">¥{product.price}</span>
                <span className="original-price">¥{product.originalPrice}</span>
                <button 
                  className="quick-buy-btn"
                  onClick={() => navigateToShoppingPlatform()}
                >
                  立即购买
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {/* 购物平台入口 - 修改样式和文字 */}
      <div className="platform-entrances">
        <div className="entrance-card shopping-platform" onClick={navigateToShoppingPlatform}>
          <div className="entrance-icon">🛍️</div>
          <div className="entrance-content">
            <h4>购物平台</h4>
            <p>实物商品2折正品保证</p>
            <div className="entrance-stats">
              <span>5000+商品</span>
              <span>›</span>
            </div>
          </div>
        </div>
      </div>

      {/* 新人首单版块 */}
      <div className="new-customer-section">
        <div className="section-header">
          <h3>🎁 新人首单</h3>
        </div>
        
        <div className="new-products-grid">
          {newCustomerProducts.map((product) => (
            <div key={product.id} className="new-product-card">
              <div className="product-image">
                <img src={product.image} alt={product.name} />
              </div>
              <div className="product-info">
                <h4 className="product-name">{product.name}</h4>
                <p className="product-desc">{product.description}</p>
                <div className="product-price">
                  <span className="current-price">¥{product.price}</span>
                </div>
                <button 
                  className="buy-btn"
                  onClick={() => handleBuyNewProduct(product)}
                  disabled={loading}
                >
                  {loading ? '处理中...' : '立即购买'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MallPage;
