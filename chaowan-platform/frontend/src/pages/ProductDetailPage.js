// frontend/src/pages/ProductDetailPage.js - 修复崩溃版
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopService } from '../services/shopService';
import { useUser } from '../contexts/UserContext';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { points, cashBalance, refreshData } = useUser();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedSku, setSelectedSku] = useState(null);
  const [quantity, setQuantity] = useState(1);
  
  // 弹窗状态
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  // 表单数据
  const [address, setAddress] = useState({ receiver: '', mobile: '', detail: '' });
  
  // ✅ 支付选择状态 (新增)
  const [paymentMode, setPaymentMode] = useState('auto'); // auto: 自动计算, points: 全积分, cash: 全现金

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
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBuy = () => {
    if (product.skus.length === 1) setSelectedSku(product.skus[0]);
    setShowSkuModal(true);
  };

  const handleConfirmSku = () => {
    if (!selectedSku) return alert('请选择规格');
    if (selectedSku.stock <= 0) return alert('已售罄');
    setShowSkuModal(false);
    setShowAddressModal(true);
  };

  // ✅ 安全的计算函数 (纯计算，不setState)
  const calculateCost = () => {
    if (!selectedSku) return { totalPoints: 0, totalCash: 0 };
    const itemTotalPoints = selectedSku.pricePoints * quantity;
    const itemTotalCash = selectedSku.priceCash * quantity;
    
    let payPoints = 0;
    let payCash = 0;

    // 根据用户选择的支付模式计算
    if (paymentMode === 'points') {
      // 全积分
      payPoints = itemTotalPoints + (itemTotalCash * 100); // 假设1元=100积分
      payCash = 0;
    } else if (paymentMode === 'cash') {
      // 全现金
      payPoints = 0;
      payCash = itemTotalCash + (itemTotalPoints / 100); 
    } else {
      // 自动/混合 (默认：先扣积分，不够扣现金)
      payPoints = Math.min(points, itemTotalPoints);
      const remainingPointsNeed = itemTotalPoints - payPoints;
      payCash = remainingPointsNeed + itemTotalCash; 
    }

    return { totalPoints: itemTotalPoints, totalCash: itemTotalCash, payPoints, payCash };
  };

  const confirmOrder = async () => {
    if (!address.receiver || !address.mobile || !address.detail) return alert('请填写地址');
    
    const cost = calculateCost();

    if (cost.payPoints > points) return alert('积分不足');
    if (cost.payCash > cashBalance) return alert('余额不足');

    try {
      await shopService.createOrder({
        items: [{ productId: product._id, skuId: selectedSku.id, quantity }],
        address,
        paymentMethod: 'mix', 
        usePoints: cost.payPoints,
        useCash: cost.payCash
      });

      alert('下单成功');
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
      <div className="product-gallery">
        <img src={product.images?.[0] || '/api/placeholder/400/400'} alt={product.name} className="main-image" />
      </div>

      <div className="price-card">
        <div className="price-row">
          <span className="price-tag cash">¥{selectedSku?.priceCash * quantity}</span>
          <span className="price-tag points">💎{selectedSku?.pricePoints * quantity}</span>
        </div>
        <h1 className="product-title">{product.name}</h1>
        <div className="product-stats">
          <span>销量 {product.salesCount || 0}</span>
          <span>库存 {selectedSku?.stock || 0}</span>
        </div>
      </div>

      <div className="section-card sku-selector" onClick={() => setShowSkuModal(true)}>
        <div className="label">规格</div>
        <div className="value">{selectedSku ? selectedSku.name : '请选择'}<span className="arrow">›</span></div>
      </div>

      <div className="section-card description">
        <div className="section-title">商品详情</div>
        {/* ✅ 安全处理HTML，避免DOM结构破坏 */}
        <div className="desc-content">
          {product.description ? <div dangerouslySetInnerHTML={{ __html: product.description }} /> : <p>暂无详情</p>}
        </div>
      </div>

      <div className="page-action-wrapper">
        <button className="big-red-buy-btn" onClick={handleOpenBuy}>立即购买</button>
        <div className="bottom-spacer"></div>
      </div>

      {/* SKU弹窗 */}
      <div className={`bottom-sheet-mask ${showSkuModal ? 'active' : ''}`} onClick={() => setShowSkuModal(false)}>
        <div className={`bottom-sheet-content ${showSkuModal ? 'slide-up' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="sheet-header"><div className="drag-handle"></div></div>
          <div className="sku-modal-body">
            <div className="sku-visual">
              <img src={product.images?.[0]} alt="" />
              <div className="info">
                <div className="price">
                  {selectedSku?.pricePoints > 0 && <span>💎{selectedSku.pricePoints}</span>}
                  {selectedSku?.priceCash > 0 && <span>¥{selectedSku.priceCash}</span>}
                </div>
                <div className="stock">库存: {selectedSku?.stock}</div>
              </div>
            </div>
            <div className="sku-list-section">
              <div className="sku-title">规格</div>
              <div className="sku-options">
                {product.skus.map(sku => (
                  <button key={sku.id} className={`sku-btn ${selectedSku?.id === sku.id ? 'active' : ''}`} onClick={() => setSelectedSku(sku)}>
                    {sku.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="sku-quantity-section">
              <div className="sku-title">数量</div>
              <div className="stepper">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <input type="number" value={quantity} readOnly />
                <button onClick={() => setQuantity(Math.min(selectedSku?.stock || 999, quantity + 1))}>+</button>
              </div>
            </div>
            <button className="sheet-confirm-btn" onClick={handleConfirmSku}>确定</button>
          </div>
        </div>
      </div>

      {/* 地址与支付弹窗 */}
      <div className={`bottom-sheet-mask ${showAddressModal ? 'active' : ''}`} onClick={() => setShowAddressModal(false)}>
        <div className={`bottom-sheet-content ${showAddressModal ? 'slide-up' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="sheet-header"><div className="drag-handle"></div></div>
          <div className="address-modal-body">
            <h3>确认订单</h3>
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

            {/* ✅ 支付方式选择 */}
            <div className="payment-selector">
              <div className="payment-title">支付方式</div>
              <div className="payment-options">
                <div className={`payment-option ${paymentMode === 'auto' ? 'active' : ''}`} onClick={() => setPaymentMode('auto')}>
                  <div className="option-header">
                    <div className="radio-circle"></div>
                    <span className="option-name">自动混合支付</span>
                  </div>
                  <div className="option-desc">优先扣除积分，不足部分自动扣除现金</div>
                </div>
                <div className={`payment-option ${paymentMode === 'points' ? 'active' : ''}`} onClick={() => setPaymentMode('points')}>
                  <div className="option-header">
                    <div className="radio-circle"></div>
                    <span className="option-name">全积分支付</span>
                  </div>
                  <div className="option-desc">现金部分按 1:100 汇率折算为积分</div>
                </div>
                <div className={`payment-option ${paymentMode === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMode('cash')}>
                  <div className="option-header">
                    <div className="radio-circle"></div>
                    <span className="option-name">全现金支付</span>
                  </div>
                  <div className="option-desc">积分部分按 100:1 汇率折算为现金</div>
                </div>
              </div>
            </div>

            <div className="payment-calc">
               <div className="row highlight">
                <span>需支付</span>
                <span>💎{calculateCost().payPoints} + ¥{calculateCost().payCash.toFixed(2)}</span>
              </div>
            </div>
            <button className="sheet-confirm-btn" onClick={confirmOrder}>立即支付</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
