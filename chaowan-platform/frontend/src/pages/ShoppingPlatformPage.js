// frontend/src/pages/ShoppingPlatformPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopService } from '../services/shopService';
import './ShoppingPlatformPage.css'; // ✅ 确保引入了CSS

const ShoppingPlatformPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // 淘宝式分类
  const categories = [
    { id: 'all', name: '全部' },
    { id: 'newbie_special', name: '新人特惠' },
    { id: 'flash_sale', name: '限时抢购' },
    { id: 'clearance', name: '低价清仓' },
    { id: 'virtual', name: '虚拟商品' },
    { id: 'physical', name: '实物商品' }
  ];

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await shopService.getProducts({ tag: selectedCategory === 'all' ? undefined : selectedCategory });
      setProducts(data.products || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tb-shopping-page">
      {/* 顶部搜索栏 */}
      <div className="search-header">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="搜索商品" />
        </div>
      </div>

      {/* 分类横向滚动 */}
      <div className="category-scroll">
        {categories.map(cat => (
          <div 
            key={cat.id}
            className={`cat-item ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {/* 商品列表 (双列瀑布流) */}
      <div className="product-grid">
        {loading ? (
          <div className="loading-text">加载中...</div>
        ) : (
          products.map(product => (
            <div 
              key={product._id} 
              className="product-card"
              onClick={() => navigate(`/product/${product._id}`)}
            >
              <div className="card-img">
                <img src={product.images?.[0] || '/api/placeholder/200/200'} alt={product.name} />
                {product.tags?.includes('flash_sale') && <div className="tag-hot">限时</div>}
              </div>
              <div className="card-info">
                <div className="title">{product.name}</div>
                <div className="tags">
                  {product.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
                <div className="price-row">
                  {product.skus[0]?.pricePoints > 0 && (
                    <span className="price points">💎{product.skus[0].pricePoints}</span>
                  )}
                  {product.skus[0]?.priceCash > 0 && (
                    <span className="price cash">¥{product.skus[0].priceCash}</span>
                  )}
                  <span className="sold">已售{product.salesCount || 0}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShoppingPlatformPage;
