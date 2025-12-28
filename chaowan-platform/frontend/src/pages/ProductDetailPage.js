// frontend/src/pages/ProductDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopService } from '../services/shopService';
import { useUser } from '../contexts/UserContext';
import './ProductDetailPage.css'; // ✅ 确保引用了CSS

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { points, cashBalance, refreshData } = useUser();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedSku, setSelectedSku] = useState(null);
  const [quantity, setQuantity] = useState(1);
  
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState({ receiver: '', mobile: '', detail: '' });
  
  const [usePointsInput, setUsePointsInput] = useState(0);
  const [useCashInput, setUseCashInput] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const data = await shopService.getProductDetail(id);
      setProduct(data);
      if (data.skus && data.skus.length > 0) {
        setSelectedSku(data.skus.find(s => s.isActive) || data.skus[0]);
      }
    } catch (error) {
      alert('商品加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (!selectedSku) {
      alert('请选择商品规格');
      return;
    }
    if (selectedSku.stock <= 0) {
      alert('该规格已售罄');
      return;
    }
    setShowSkuModal(false);
    setShowAddressModal(true);
  };

  const calculatePayment = () => {
    if (!selectedSku) return { totalPoints: 0, totalCash: 0 };
    
    const itemTotalPoints = selectedSku.pricePoints * quantity;
    const itemTotalCash = selectedSku.priceCash * quantity;
    
    let finalPoints = Math.min(points, itemTotalPoints);
    let remainingPointsNeed = itemTotalPoints - finalPoints;
    let finalCash = remainingPointsNeed + itemTotalCash; 
    
    setUsePointsInput(finalPoints);
    setUseCashInput(finalCash);

    return { totalPoints: itemTotalPoints, totalCash: itemTotalCash, payPoints: finalPoints, payCash: finalCash };
  };

  const confirmOrder = async () => {
    if (!address.receiver || !address.mobile || !address.detail) {
      alert('请填写完整的收货地址');
      return;
    }

    const totals = calculatePayment();

    if (usePointsInput > points) return alert('积分不足');
    if (useCashInput > cashBalance) return alert('余额不足');

    const userPayInPoints = usePointsInput + (useCashInput * 100);
    const priceInPoints = totals.totalPoints + (totals.totalCash * 100);
    
    if (Math.abs(userPayInPoints - priceInPoints) > 1) {
       alert('支付金额不匹配');
       return;
    }

    try {
      await shopService.createOrder({
        items: [{ productId: product._id, skuId: selectedSku.id, quantity }],
        address,
        paymentMethod: 'mix', 
        usePoints: usePointsInput,
        useCash: useCashInput
      });

      alert('🎉 下单成功！');
      refreshData(); 
      navigate('/my-orders');
    } catch (error) {
      alert(error.response?.data?.message || '下单失败');
    }
  };

  if (loading) return <div className="loading-page">加载中...</div>;
  if (!product) return <div className="error-page">商品不存在</div>;

  return (
    <div className="pdd-product-page">
      {/* 1. 商品图片区域 */}
      <div className="product-gallery">
        <img src={product.images?.[0] || '/api/placeholder/400/400'} alt={product.name} className="main-image" />
        {product.tags?.includes('flash_sale') && <div className="badge-sale">限时</div>}
      </div>

      {/* 2. 价格信息 */}
      <div className="price-card">
        <div className="price-row">
          {selectedSku?.pricePoints > 0 && (
            <div className="price-tag points">
              <span className="symbol">💎</span>
              <span className="amount">{selectedSku.pricePoints * quantity}</span>
              <span className="unit">积分</span>
            </div>
          )}
          {selectedSku?.priceCash > 0 && (
            <div className="price-tag cash">
              <span className="symbol">¥</span>
              <span className="amount">{(selectedSku.priceCash * quantity).toFixed(2)}</span>
            </div>
          )}
        </div>
        <h1 className="product-title">{product.name}</h1>
        <div className="product-stats">
          <span>销量 {product.salesCount || 0}</span>
          <span>库存 {selectedSku?.stock || 0}</span>
        </div>
      </div>

      {/* 3. 规格选择 */}
      <div className="section-card sku-selector" onClick={() => setShowSkuModal(true)}>
        <div className="label">规格</div>
        <div className="value">
          {selectedSku ? selectedSku.name : '请选择规格'}
          <span className="arrow">›</span>
        </div>
      </div>

      {/* 4. 商品详情 */}
      <div className="section-card description">
        <div className="section-title">商品详情</div>
        <div className="desc-content" dangerouslySetInnerHTML={{ __html: product.description }} />
      </div>

      {/* ✅ 5. 底部操作栏 (包含购买按钮) */}
      <div className="bottom-bar">
        <div className="bar-icons">
          <div className="icon-item" onClick={() => navigate('/mall')}>
            <span className="icon">🏠</span>
            <span className="text">首页</span>
          </div>
          <div className="icon-item">
            <span className="icon">🛒</span>
            <span className="text">购物车</span>
          </div>
        </div>
        <button className="btn-buy-single" onClick={() => setShowSkuModal(true)}>
          加入购物车
        </button>
        <button className="btn-buy-now" onClick={() => setShowSkuModal(true)}>
          立即购买
        </button>
      </div>

      {/* SKU 选择弹窗 */}
      {showSkuModal && (
        <div className="modal-mask" onClick={() => setShowSkuModal(false)}>
          <div className="modal-content sku-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="img-wrap">
                <img src={product.images?.[0]} alt="" />
              </div>
              <div className="info">
                <div className="price">
                  {selectedSku?.pricePoints > 0 && <span>💎{selectedSku.pricePoints}</span>}
                  {selectedSku?.priceCash > 0 && <span>¥{selectedSku.priceCash}</span>}
                </div>
                <div className="stock">库存: {selectedSku?.stock}</div>
              </div>
            </div>
            
            <div className="sku-list">
              <div className="sku-title">规格</div>
              <div className="sku-options">
                {product.skus.map(sku => (
                  <button 
                    key={sku.id} 
                    className={`sku-btn ${selectedSku?.id === sku.id ? 'active' : ''} ${sku.stock <= 0 ? 'disabled' : ''}`}
                    onClick={() => sku.stock > 0 && setSelectedSku(sku)}
                  >
                    {sku.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="sku-quantity">
              <div className="sku-title">数量</div>
              <div className="stepper">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <input type="number" value={quantity} readOnly />
                <button onClick={() => setQuantity(Math.min(selectedSku?.stock || 999, quantity + 1))}>+</button>
              </div>
            </div>

            <button className="btn-confirm" onClick={handleBuyNow}>确定</button>
          </div>
        </div>
      )}

      {/* 支付确认弹窗 */}
      {showAddressModal && (
        <div className="modal-mask" onClick={() => setShowAddressModal(false)}>
          <div className="modal-content address-modal" onClick={e => e.stopPropagation()}>
            <h3>确认订单</h3>
            <div className="order-summary">
              <img src={product.images?.[0]} alt="" />
              <div className="text">
                <div className="name">{product.name}</div>
                <div className="sku">{selectedSku.name} x {quantity}</div>
              </div>
            </div>
            
            <div className="form-group">
              <label>收货人</label>
              <input value={address.receiver} onChange={e => setAddress({...address, receiver: e.target.value})} placeholder="姓名" />
            </div>
            <div className="form-group">
              <label>手机号</label>
              <input value={address.mobile} onChange={e => setAddress({...address, mobile: e.target.value})} placeholder="手机号" />
            </div>
            <div className="form-group">
              <label>详细地址</label>
              <input value={address.detail} onChange={e => setAddress({...address, detail: e.target.value})} placeholder="省市区街道门牌号" />
            </div>

            <div className="payment-calc">
              <div className="row"><span>我的积分</span><span>{points} 💎</span></div>
              <div className="row"><span>我的余额</span><span>¥{cashBalance.toFixed(2)}</span></div>
              <div className="row highlight"><span>本次支付</span><span>💎{usePointsInput} + ¥{useCashInput.toFixed(2)}</span></div>
            </div>

            <button className="btn-submit" onClick={confirmOrder}>立即支付</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
