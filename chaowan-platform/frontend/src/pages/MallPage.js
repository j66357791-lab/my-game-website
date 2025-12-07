// src/pages/MallPage.js - V7.4.1 全局状态融合版
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './MallPage.css';

const MallPage = ({ user }) => {
  const navigate = useNavigate();
  const [currentRecommendIndex, setCurrentRecommendIndex] = useState(0);

  // 🔧 V7.4.1 使用全局状态
  const { 
    points, 
    loading, 
    error, 
    purchaseDoll,
    setError 
  } = useUser();

  // V7.3.2.1 今日推荐娃娃数据（更新后的经济模型）
  const recommendedDolls = [
    { 
      id: 1, 
      name: '萌新宝宝', 
      emoji: '👶', 
      price: 50, 
      output: 0.88, 
      rarity: '⭐',
      level: 1,
      days: 60,
      tag: '热销',
      description: '新用户入门级伙伴'
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
      tag: '推荐',
      description: '进阶用户更优选择'
    },
    { 
      id: 3, 
      name: '待解锁娃娃', 
      emoji: '🔒', 
      price: 0, 
      output: 0, 
      rarity: '⭐⭐⭐',
      level: 3,
      days: 0,
      tag: '敬请期待',
      description: '3-10级娃娃待更新'
    }
  ];

  // 自动轮播推荐
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentRecommendIndex((prev) => (prev + 1) % recommendedDolls.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [recommendedDolls.length]);

  const handleDotClick = (index) => {
    setCurrentRecommendIndex(index);
  };

  const navigateToDollShop = () => {
    navigate('/doll-shop');
  };

  const navigateToShoppingPlatform = () => {
    navigate('/shopping-platform');
  };

  // 🔧 V7.4.1 融合全局状态的购买函数
  const handleBuy = async (doll) => {
    if (doll.price === 0) {
      alert('该娃娃暂未开放，敬请期待！');
      return;
    }
    
    if (points >= doll.price) {
      try {
        // 🔧 V7.4.1 使用全局购买方法
        const result = await purchaseDoll(doll);
        
        if (result.success) {
          alert(`购买成功！获得 ${doll.name}`);
          console.log('✅ 娃娃购买成功:', result.doll);
        } else {
          throw new Error(result.error || '购买失败');
        }
      } catch (error) {
        console.error('❌ 购买娃娃失败:', error);
        setError('购买娃娃失败: ' + error.message);
        alert('购买失败: ' + error.message);
      }
    } else {
      alert(`积分不足！需要 ${doll.price} 积分，当前只有 ${points} 积分`);
    }
  };

  return (
    <div className="mall-page">
      {/* 第一：顶部今日推荐版块 */}
      <div className="recommendation-section">
        <div className="recommendation-header">
          <h3>🔥 今日推荐</h3>
          <div className="carousel-dots">
            {recommendedDolls.map((_, index) => (
              <span 
                key={index} 
                className={`dot ${index === currentRecommendIndex ? 'active' : ''}`}
                onClick={() => handleDotClick(index)}
              ></span>
            ))}
          </div>
        </div>
        
        <div className="recommendation-carousel">
          {recommendedDolls.map((doll, index) => (
            <div 
              key={doll.id} 
              className={`recommendation-card ${index === currentRecommendIndex ? 'active' : ''}`}
            >
              <div className="recommendation-emoji">{doll.emoji}</div>
              <div className="recommendation-info">
                <div className="recommendation-tag">{doll.tag}</div>
                <h4 className="recommendation-name">{doll.name}</h4>
                <p className="recommendation-rarity">{doll.rarity} Lv.{doll.level}</p>
                <p className="recommendation-output">产出: +{doll.output}/天</p>
                <p className="recommendation-days">持续: {doll.days}天</p>
                <p className="recommendation-desc">{doll.description}</p>
              </div>
              <div className="recommendation-price">
                <span className="price-amount">💰 {doll.price}</span>
                <button 
                  className="quick-buy-btn"
                  onClick={() => handleBuy(doll)}
                  disabled={loading || doll.price === 0}
                >
                  {loading ? '处理中...' : 
                   doll.price > 0 ? '立即购买' : '待解锁'}
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

      {/* 第二：两个小方块版块 */}
      <div className="platform-entrances">
        <div className="entrance-card doll-shop" onClick={navigateToDollShop}>
          <div className="entrance-icon">🧸</div>
          <div className="entrance-content">
            <h4>娃娃商城</h4>
            <p>虚拟娃娃 收集养成</p>
            <div className="entrance-stats">
              <span>2款娃娃</span>
              <span>›</span>
            </div>
          </div>
        </div>

        <div className="entrance-card shopping-platform" onClick={navigateToShoppingPlatform}>
          <div className="entrance-icon">🛍️</div>
          <div className="entrance-content">
            <h4>购物平台</h4>
            <p>实物商品 正品保证</p>
            <div className="entrance-stats">
              <span>5000+商品</span>
              <span>›</span>
            </div>
          </div>
        </div>
      </div>

      {/* 第三：娃娃商城版块（V7.3.2.1 更新） */}
      <div className="doll-shop-section">
        <div className="section-header">
          <h3>🧸 娃娃商城</h3>
          <button className="view-more-btn" onClick={navigateToDollShop}>查看更多 ›</button>
        </div>
        
        <div className="doll-grid">
          {/* 一级娃娃 - 萌新宝宝 */}
          <div className="doll-card available">
            <div className="doll-emoji">👶</div>
            <div className="doll-info">
              <h4 className="doll-name">萌新宝宝</h4>
              <p className="doll-rarity">⭐ Lv.1</p>
              <p className="doll-output">产出: +0.88/天</p>
              <p className="doll-days">持续: 60天</p>
              <p className="doll-recycle">回收: 0.88-8.88积分 + 30经验</p>
            </div>
            <div className="doll-price">
              <span className="price">💰 50</span>
              <button 
                className="buy-btn"
                onClick={() => handleBuy({ id: 1, name: '萌新宝宝', price: 50, emoji: '👶', output: 0.88, level: 1, days: 60 })}
                disabled={loading}
              >
                {loading ? '处理中...' : '购买'}
              </button>
            </div>
          </div>

          {/* 二级娃娃 - 元气宝贝 */}
          <div className="doll-card available">
            <div className="doll-emoji">⚡</div>
            <div className="doll-info">
              <h4 className="doll-name">元气宝贝</h4>
              <p className="doll-rarity">⭐⭐ Lv.2</p>
              <p className="doll-output">产出: +3.88/天</p>
              <p className="doll-days">持续: 70天</p>
              <p className="doll-recycle">回收: 随机积分 + 30经验</p>
            </div>
            <div className="doll-price">
              <span className="price">💰 250</span>
              <button 
                className="buy-btn"
                onClick={() => handleBuy({ id: 2, name: '元气宝贝', price: 250, emoji: '⚡', output: 3.88, level: 2, days: 70 })}
                disabled={loading}
              >
                {loading ? '处理中...' : '购买'}
              </button>
            </div>
          </div>

          {/* 3-10级娃娃 - 待更新状态 */}
          <div className="doll-card coming-soon">
            <div className="doll-emoji">🔒</div>
            <div className="doll-info">
              <h4 className="doll-name">三级娃娃</h4>
              <p className="doll-rarity">⭐⭐⭐ Lv.3</p>
              <p className="doll-output">待更新</p>
              <p className="doll-days">待更新</p>
              <p className="doll-recycle">敬请期待</p>
            </div>
            <div className="doll-price">
              <span className="price">🔒 待更新</span>
              <button className="buy-btn locked" disabled>
                <span className="lock-icon">🔒</span>
              </button>
            </div>
          </div>

          <div className="doll-card coming-soon">
            <div className="doll-emoji">🔒</div>
            <div className="doll-info">
              <h4 className="doll-name">高级娃娃</h4>
              <p className="doll-rarity">⭐⭐⭐⭐ Lv.4-10</p>
              <p className="doll-output">待更新</p>
              <p className="doll-days">待更新</p>
              <p className="doll-recycle">敬请期待</p>
            </div>
            <div className="doll-price">
              <span className="price">🔒 待更新</span>
              <button className="buy-btn locked" disabled>
                <span className="lock-icon">🔒</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 第四：购物平台版块 */}
      <div className="shopping-platform-section">
        <div className="section-header">
          <h3>🛍️ 购物平台</h3>
          <button className="view-more-btn" onClick={navigateToShoppingPlatform}>进入平台 ›</button>
        </div>
        
        <div className="product-grid">
          <div className="product-card">
            <div className="product-image">
              <img src="/api/placeholder/200/200" alt="潮玩手办" />
              <span className="product-tag">热销</span>
            </div>
            <div className="product-info">
              <h4 className="product-name">潮玩盲盒系列</h4>
              <p className="product-desc">正版授权 精美手办</p>
              <div className="product-price">
                <span className="current-price">¥89</span>
                <span className="original-price">¥129</span>
              </div>
              <div className="product-stats">
                <span>⭐ 4.9分</span>
                <span>月销2000+</span>
              </div>
            </div>
          </div>

          <div className="product-card">
            <div className="product-image">
              <img src="/api/placeholder/200/200" alt="毛绒玩具" />
              <span className="product-tag">新品</span>
            </div>
            <div className="product-info">
              <h4 className="product-name">可爱毛绒公仔</h4>
              <p className="product-desc">柔软材质 安全环保</p>
              <div className="product-price">
                <span className="current-price">¥59</span>
                <span className="original-price">¥89</span>
              </div>
              <div className="product-stats">
                <span>⭐ 4.8分</span>
                <span>月销1500+</span>
              </div>
            </div>
          </div>

          <div className="product-card">
            <div className="product-image">
              <img src="/api/placeholder/200/200" alt="周边配件" />
              <span className="product-tag">限量</span>
            </div>
            <div className="product-info">
              <h4 className="product-name">限量版徽章套装</h4>
              <p className="product-desc">金属材质 精工制作</p>
              <div className="product-price">
                <span className="current-price">¥39</span>
                <span className="original-price">¥59</span>
              </div>
              <div className="product-stats">
                <span>⭐ 5.0分</span>
                <span>仅剩100件</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 第五：下面留空待定 */}
      <div className="reserved-section">
        <div className="placeholder-box">
          <span className="placeholder-icon">🚧</span>
          <span className="placeholder-text">更多精彩功能，敬请期待</span>
        </div>
      </div>
    </div>
  );
};

export default MallPage;
