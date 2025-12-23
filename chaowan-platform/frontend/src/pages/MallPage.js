// src/pages/MallPage.js - 真实购买流程版
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './MallPage.css';

const MallPage = ({ user }) => {
  const navigate = useNavigate();
  const [currentRecommendIndex, setCurrentRecommendIndex] = useState(0);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [hasPurchasedNewCustomer, setHasPurchasedNewCustomer] = useState(false);

  // 🔧 使用全局状态
  const { 
    points, 
    loading, 
    error, 
    purchaseDoll,
    setError,
    cashBalance,
    updateUser,
    refreshData
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
      image: 'https://via.placeholder.com/200x200?text=蒙牛牛奶',
      type: 'physical' // 实物商品需要地址
    },
    {
      id: 2,
      name: '9.9首充花费',
      price: 9.9,
      rewardPoints: 99,
      description: '赠送积分99，仅限购买一次',
      image: 'https://via.placeholder.com/200x200?text=首充礼包',
      type: 'digital' // 数字商品需要手机号
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

  // 打开购买确认弹窗
  const handleBuyProduct = (product) => {
    if (hasPurchasedNewCustomer && (product.id === 1 || product.id === 2)) {
      alert('您已经购买过新人首单商品，每个账号仅限购买一次！');
      return;
    }
    
    setSelectedProduct(product);
    setShowPurchaseModal(true);
  };

  // 确认购买
  const confirmPurchase = async () => {
    if (!selectedProduct) return;
    
    // 检查余额
    if (cashBalance < selectedProduct.price) {
      alert(`余额不足！需要 ${selectedProduct.price} 元，当前只有 ${cashBalance} 元`);
      setShowPurchaseModal(false);
      return;
    }

    try {
      // 显示确认信息
      const remainingBalance = cashBalance - selectedProduct.price;
      const confirmMessage = `您确定需要购买${selectedProduct.name}吗？\n您的余额目前有${cashBalance}元，购买完成之后剩余${remainingBalance.toFixed(2)}元`;
      
      if (!window.confirm(confirmMessage)) {
        setShowPurchaseModal(false);
        return;
      }

      // 模拟购买流程
      setShowPurchaseModal(false);
      
      // 更新用户余额
      updateUser({ cashBalance: remainingBalance });
      
      // 赠送积分
      const newPoints = points + selectedProduct.rewardPoints;
      updateUser({ points: newPoints });
      
      // 添加购买记录（这里应该调用后端API）
      console.log('✅ 购买成功:', {
        product: selectedProduct,
        remainingBalance,
        newPoints
      });
      
      // 如果是新人首单，标记已购买
      if (selectedProduct.id === 1 || selectedProduct.id === 2) {
        setHasPurchasedNewCustomer(true);
      }
      
      // 显示成功消息
      alert(`购买成功！${selectedProduct.name}\n已赠送${selectedProduct.rewardPoints}积分`);
      
      // 刷新数据
      refreshData({
        points: newPoints,
        cashBalance: remainingBalance
      });
      
    } catch (error) {
      console.error('❌ 购买失败:', error);
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

      {/* 购物平台入口 */}
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
                  onClick={() => handleBuyProduct(product)}
                  disabled={loading || hasPurchasedNewCustomer && (product.id === 1 || product.id === 2)}
                >
                  {loading ? '处理中...' : 
                   hasPurchasedNewCustomer && (product.id === 1 || product.id === 2) ? '已购买' : '立即购买'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 购买确认弹窗 */}
      {showPurchaseModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>购买确认</h3>
            
            <div className="modal-product-info">
              <div className="product-image">
                <img src={selectedProduct.image} alt={selectedProduct.name} />
              </div>
              <div className="product-details">
                <h4>{selectedProduct.name}</h4>
                <p>{selectedProduct.description}</p>
                <p className="product-price">价格: ¥{selectedProduct.price}</p>
                <p className="reward-points">赠送积分: +{selectedProduct.rewardPoints}</p>
              </div>
            </div>

            {/* 根据商品类型显示不同的输入框 */}
            {selectedProduct.type === 'physical' ? (
              <div className="input-group">
                <label>收货地址:</label>
                <input 
                  type="text" 
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  placeholder="请输入收货地址"
                  required
                />
              </div>
            ) : (
              <div className="input-group">
                <label>手机号码:</label>
                <input 
                  type="tel" 
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="请输入手机号码"
                  required
                />
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="confirm-btn"
                onClick={confirmPurchase}
              >
                确认购买
              </button>
              <button 
                className="cancel-btn"
                onClick={() => setShowPurchaseModal(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MallPage;
