// frontend/src/pages/ProductDetailPage.js - 优化交互与布局版
import React, { useState, useEffect } from 'react';
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
  const [showSkuModal, setShowSkuModal] = useState(false); // SKU弹窗
  const [showAddressModal, setShowAddressModal] = useState(false); // 地址弹窗
  
  // 表单数据
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

  // 点击“立即购买”按钮 -> 打开 SKU 选择（从底部滑出）
  const handleOpenBuy = () => {
    if (product.skus.length === 1) {
      // 如果只有一个规格，直接选中
      setSelectedSku(product.skus[0]);
    }
    setShowSkuModal(true);
  };

  // SKU 选择中点击“确定”
  const handleConfirmSku = () => {
    if (!selectedSku) {
      alert('请选择商品规格');
      return;
    }
    if (selectedSku.stock <= 0) {
      alert('该规格已售罄');
      return;
    }
    // 关闭 SKU 窗口，打开地址窗口（保持流畅体验，或者直接在当前窗口切换）
    // 为了符合“从下往上展示”的需求，这里我们选择切换 Modal 内容，或者关闭再打开
    // 简单起见，关闭SKU，打开地址确认
    setShowSkuModal(false);
    setShowAddressModal(true);
  };

  // 计算价格
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

      {/* 3. 规格选择 (点击可触发弹窗) */}
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

      {/* ✅ 5. 页面内底部操作栏 (红色大按钮) */}
      {/* 这个按钮在页面流内部，避免与底部导航重叠 */}
      <div className="page-action-wrapper">
        <button className="big-red-buy-btn" onClick={handleOpenBuy}>
          立即购买
        </button>
        {/* 占位符：为了防止底部导航遮挡 */}
        <div className="bottom-spacer"></div>
      </div>

      {/* ✅ SKU 选择弹窗 (从下往上滑出) */}
      <div className={`bottom-sheet-mask ${showSkuModal ? 'active' : ''}`} onClick={() => setShowSkuModal(false)}>
        <div className={`bottom-sheet-content ${showSkuModal ? 'slide-up' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <div className="drag-handle"></div>
          </div>
          
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

      {/* 地址填写弹窗 (复用样式) */}
      <div className={`bottom-sheet-mask ${showAddressModal ? 'active' : ''}`} onClick={() => setShowAddressModal(false)}>
        <div className={`bottom-sheet-content ${showAddressModal ? 'slide-up' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <div className="drag-handle"></div>
          </div>
          <div className="address-modal-body">
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
               <div className="row highlight">
                <span>需支付</span>
                <span>💎{calculatePayment().payPoints} + ¥{useCashInput.toFixed(2)}</span>
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
