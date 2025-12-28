// frontend/src/pages/AdminDashboardPage.js - 完整功能版
import React, { useState, useEffect } from 'react';
import { api } from '../config/api';
import './AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // --- 商城管理状态 ---
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // 发布商品弹窗
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', description: '', images: '', categoryId: '', tags: [],
    skus: [{ id: 'sku1', name: '默认规格', pricePoints: 0, priceCash: 0, stock: 100 }]
  });

  // 编辑商品弹窗
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // ✅ 发货弹窗状态
  const [shipModal, setShipModal] = useState({ show: false, orderId: '', method: 'express', trackingNumber: '' });

  // --- 游戏控制状态 ---
  const [bossConfig, setBossConfig] = useState({ name: '千羽', hp: 100000, reward: 100 });
  const [mysteryConfig, setMysteryConfig] = useState({ betLimit: 1000, winRate: 50 });

  useEffect(() => {
    if (activeTab === 'shop') fetchAdminData();
    if (activeTab === 'games') fetchGameConfigs();
  }, [activeTab]);

  const fetchGameConfigs = async () => {
    setLoading(true);
    try {
      const resBoss = await api.get('/admin/boss/status').catch(() => ({})); 
      if(resBoss && resBoss.boss) setBossConfig({ name: resBoss.boss.name, hp: resBoss.boss.maxHp, reward: resBoss.boss.rewardMin });
      const resMystery = await api.get('/admin/mystery-card/config').catch(() => ({}));
      if(resMystery && resMystery.data) setMysteryConfig(resMystery.data);
    } catch (error) {
      console.error('获取游戏配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGameConfig = async (type) => {
    try {
      if (type === 'boss') await api.post('/admin/boss/update', bossConfig);
      if (type === 'mystery') await api.post('/admin/mystery-card/config', mysteryConfig);
      alert('配置保存成功');
    } catch (error) {
      alert('保存失败');
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const resProducts = await api.get('/admin/shop/products').catch(() => ({ success: false }));
      const resOrders = await api.get('/admin/shop/orders').catch(() => ({ success: false }));
      if (resProducts.success) setProducts(resProducts.data.products || []);
      if (resOrders.success) setOrders(resOrders.data || []);
    } catch (error) {
      console.error('获取商城数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      let payload = {
        ...productForm,
        images: productForm.images.split(',').map(s => s.trim()).filter(s => s),
        tags: productForm.tags.length > 0 ? productForm.tags : ['all']
      };
      if (!payload.categoryId || payload.categoryId === "") payload.categoryId = null;
      await api.post('/admin/shop/products', payload);
      alert('✅ 商品发布成功！');
      setShowProductModal(false);
      setProductForm({ name: '', description: '', images: '', categoryId: '', tags: [], skus: [{ id: 'sku1', name: '默认规格', pricePoints: 0, priceCash: 0, stock: 100 }] });
      fetchAdminData();
    } catch (error) {
      const errorMsg = error.response?.data?.message || '发布失败';
      alert('❌ 发布失败: ' + errorMsg);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('确定要下架该商品吗？')) return;
    try {
      await api.delete(`/admin/shop/products/${productId}`);
      alert('✅ 商品已下架');
      fetchAdminData();
    } catch (error) {
      alert('❌ 操作失败');
    }
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      images: product.images ? product.images.join(', ') : '',
      categoryId: product.categoryId || '',
      tags: product.tags || [],
      skus: product.skus || []
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      let payload = {
        ...productForm,
        images: productForm.images.split(',').map(s => s.trim()).filter(s => s),
        tags: productForm.tags.length > 0 ? productForm.tags : ['all']
      };
      if (!payload.categoryId || payload.categoryId === "") payload.categoryId = null;
      await api.put(`/admin/shop/products/${editingProduct._id}`, payload);
      alert('✅ 商品修改成功！');
      setShowEditModal(false);
      setEditingProduct(null);
      fetchAdminData();
    } catch (error) {
      alert('❌ 修改失败: ' + (error.response?.data?.message || error.message));
    }
  };

  // ✅ 发货逻辑
  const openShipModal = (orderId) => {
    setShipModal({ show: true, orderId, method: 'express', trackingNumber: '' });
  };

  const confirmShip = async () => {
    if (shipModal.method === 'express' && !shipModal.trackingNumber) {
      return alert('请填写快递单号');
    }
    if (shipModal.method === 'none') {
      if (!window.confirm('确定该商品无需快递直接发货？')) return;
    }

    try {
      await api.put(`/admin/shop/orders/${shipModal.orderId}/ship`, {
        method: shipModal.method,
        trackingNumber: shipModal.trackingNumber
      });
      alert('发货成功');
      setShipModal({ ...shipModal, show: false });
      fetchAdminData();
    } catch (error) {
      alert('发货失败: ' + (error.response?.data?.message || ''));
    }
  };

  if (!user || user.role !== 'admin') {
    return <div className="admin-dashboard"><div className="dashboard-header"><h2>🚫 访问被拒绝</h2></div></div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>🛠️ 管理员后台</h2>
        <p>欢迎回来，{user.username}</p>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>📊 仪表板</button>
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👥 用户管理</button>
        <button className={activeTab === 'points' ? 'active' : ''} onClick={() => setActiveTab('points')}>💰 积分管理</button>
        <button className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>🛍️ 商城管理</button>
        <button className={activeTab === 'games' ? 'active' : ''} onClick={() => setActiveTab('games')}>🎮 游戏控制</button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'dashboard' && (
          <div>
            <h3>📊 仪表板</h3>
            <div className="metrics-grid">
              <div className="metric-card"><div className="metric-icon">👥</div><div className="metric-info"><h3>{products.length}</h3><p>商城商品</p></div></div>
              <div className="metric-card"><div className="metric-icon">📦</div><div className="metric-info"><h3>{orders.length}</h3><p>订单总数</p></div></div>
            </div>
          </div>
        )}
        {activeTab === 'users' && <div><h3>👥 用户管理</h3><p>请前往 /admin/users</p></div>}
        {activeTab === 'points' && <div><h3>💰 积分管理</h3><p>请前往 /admin/points</p></div>}

        {activeTab === 'games' && (
          <div className="shop-management">
            <h3>🎮 游戏控制中心</h3>
            <div className="section">
              <h4>Boss 挑战配置</h4>
              <div className="form-group">
                <label>Boss 名称</label>
                <input value={bossConfig.name} onChange={e => setBossConfig({...bossConfig, name: e.target.value})} />
              </div>
              <button className="btn-primary" onClick={() => handleSaveGameConfig('boss')}>保存 Boss 配置</button>
            </div>
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="shop-management">
            <div className="shop-header">
              <h3>🛍️ 商城管理</h3>
              <button className="btn-primary" onClick={() => setShowProductModal(true)}>+ 发布商品</button>
            </div>

            <div className="section">
              <h4>商品列表 ({products.length})</h4>
              {loading ? <p>加载中...</p> : (
                <div className="admin-list">
                  {products.map(p => (
                    <div key={p._id} className="list-item">
                      <img src={p.images?.[0] || '/api/placeholder/60/60'} alt="" />
                      <div className="info">
                        <div className="name">{p.name}</div>
                        <div className="meta">
                          {p.tags.map(t => <span key={t} className="tag">{t}</span>)} 
                          库存: {p.totalStock}
                        </div>
                      </div>
                      <div className="actions">
                        <button className="btn-edit" onClick={() => handleOpenEdit(p)}>编辑</button>
                        <button className="btn-delete" onClick={() => handleDeleteProduct(p._id)}>下架</button>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && <p style={{color:'#999', textAlign:'center', padding:'20px'}}>暂无商品</p>}
                </div>
              )}
            </div>

            <div className="section">
              <h4>订单列表 ({orders.length})</h4>
              <div className="admin-list">
                {orders.map(order => (
                  <div key={order._id} className="list-item order-item">
                    <div className="info">
                      <div className="name">订单: {order.orderNumber}</div>
                      <div className="meta">
                        <span style={{color: order.status==='paid'?'#e02e24':'#999', fontWeight:'bold'}}>{order.status}</span> | 
                        总价: 💎{order.totalPoints} ¥{order.totalCash}
                      </div>
                      <div className="user-address">
                        👤 {order.username} ({order.userMobile})
                      </div>
                      {order.address && (
                        <div className="address-detail">
                          📍 {order.address.receiver} - {order.address.detail}
                        </div>
                      )}
                    </div>
                    <div className="actions">
                      {order.status === 'paid' && (
                        <button className="btn-ship" onClick={() => openShipModal(order._id)}>发货</button>
                      )}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p style={{color:'#999', textAlign:'center', padding:'20px'}}>暂无订单</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 发布商品弹窗 */}
      {showProductModal && (
        <div className="modal" onClick={() => setShowProductModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>发布新商品</h3>
            <form onSubmit={handleCreateProduct}>
              <input placeholder="商品名称" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
              <textarea placeholder="商品描述" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
              <input placeholder="图片URL (逗号分隔)" value={productForm.images} onChange={e => setProductForm({...productForm, images: e.target.value})} />
              <select value={productForm.categoryId} onChange={e => setProductForm({...productForm, categoryId: e.target.value})}>
                <option value="">无分类</option>
              </select>
              <label>✅ 商品规格 (SKU) 设置</label>
              {productForm.skus.map((sku, idx) => (
                <div key={idx} className="sku-form-row-wrapper">
                  <div className="sku-row-label">规格 #{idx + 1}</div>
                  <div className="sku-inputs">
                    <input placeholder="唯一ID" value={sku.id} onChange={e => { const s = [...productForm.skus]; s[idx].id = e.target.value; setProductForm({...productForm, skus: s}); }} required />
                    <input placeholder="规格名称" value={sku.name} onChange={e => { const s = [...productForm.skus]; s[idx].name = e.target.value; setProductForm({...productForm, skus: s}); }} required />
                  </div>
                  <div className="sku-inputs">
                    <div className="input-with-label"><label>积分</label><input type="number" value={sku.pricePoints} onChange={e => { const s = [...productForm.skus]; s[idx].pricePoints = parseInt(e.target.value); setProductForm({...productForm, skus: s}); }} /></div>
                    <div className="input-with-label"><label>现金</label><input type="number" value={sku.priceCash} onChange={e => { const s = [...productForm.skus]; s[idx].priceCash = parseFloat(e.target.value); setProductForm({...productForm, skus: s}); }} /></div>
                    <div className="input-with-label"><label>库存</label><input type="number" value={sku.stock} onChange={e => { const s = [...productForm.skus]; s[idx].stock = parseInt(e.target.value); setProductForm({...productForm, skus: s}); }} required /></div>
                  </div>
                  <button type="button" className="btn-delete-sku" onClick={() => setProductForm({...productForm, skus: productForm.skus.filter((_, i) => i !== idx)})}>删除</button>
                </div>
              ))}
              <button type="button" onClick={() => setProductForm({...productForm, skus: [...productForm.skus, { id: `sku${Date.now()}`, name: '新规格', pricePoints: 0, priceCash: 0, stock: 0 }]})}>+ 添加新规格</button>
              <div className="modal-actions"><button type="button" onClick={() => setShowProductModal(false)}>取消</button><button type="submit">发布</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑商品弹窗 */}
      {showEditModal && (
        <div className="modal" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>编辑商品</h3>
            <form onSubmit={handleUpdateProduct}>
              <input placeholder="商品名称" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
              <textarea placeholder="商品描述" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
              <input placeholder="图片URL (逗号分隔)" value={productForm.images} onChange={e => setProductForm({...productForm, images: e.target.value})} />
              <label>✅ 修改规格 (SKU)</label>
              {productForm.skus.map((sku, idx) => (
                <div key={idx} className="sku-form-row-wrapper">
                  <div className="sku-row-label">规格 #{idx + 1}</div>
                  <div className="sku-inputs">
                    <input placeholder="规格ID" value={sku.id} onChange={e => { const s = [...productForm.skus]; s[idx].id = e.target.value; setProductForm({...productForm, skus: s}); }} required />
                    <input placeholder="规格名称" value={sku.name} onChange={e => { const s = [...productForm.skus]; s[idx].name = e.target.value; setProductForm({...productForm, skus: s}); }} required />
                  </div>
                  <div className="sku-inputs">
                    <div className="input-with-label"><label>积分</label><input type="number" value={sku.pricePoints} onChange={e => { const s = [...productForm.skus]; s[idx].pricePoints = parseInt(e.target.value); setProductForm({...productForm, skus: s}); }} /></div>
                    <div className="input-with-label"><label>现金</label><input type="number" value={sku.priceCash} onChange={e => { const s = [...productForm.skus]; s[idx].priceCash = parseFloat(e.target.value); setProductForm({...productForm, skus: s}); }} /></div>
                    <div className="input-with-label"><label>库存</label><input type="number" value={sku.stock} onChange={e => { const s = [...productForm.skus]; s[idx].stock = parseInt(e.target.value); setProductForm({...productForm, skus: s}); }} required /></div>
                  </div>
                </div>
              ))}
              <div className="modal-actions"><button type="button" onClick={() => setShowEditModal(false)}>取消</button><button type="submit">保存修改</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ 发货弹窗 */}
      {shipModal.show && (
        <div className="modal" onClick={() => setShipModal({ ...shipModal, show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>订单发货</h3>
            <div className="ship-options">
              <label className="radio-label">
                <input type="radio" name="shipMethod" checked={shipModal.method === 'express'} onChange={() => setShipModal({ ...shipModal, method: 'express' })} />
                <span>快递发货</span>
              </label>
              {shipModal.method === 'express' && (
                <input className="tracking-input" placeholder="请输入快递单号" value={shipModal.trackingNumber} onChange={e => setShipModal({ ...shipModal, trackingNumber: e.target.value })} />
              )}
              
              <label className="radio-label">
                <input type="radio" name="shipMethod" checked={shipModal.method === 'none'} onChange={() => setShipModal({ ...shipModal, method: 'none' })} />
                <span>无需快递 (虚拟/自提)</span>
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShipModal({ ...shipModal, show: false })}>取消</button>
              <button onClick={confirmShip} className="btn-primary">确认发货</button>
            </div>
          </div>
        </div>
      )}
      
      {loading && (<div className="loading-overlay"><div className="loading-spinner">加载中...</div></div>)}
    </div>
  );
};

export default AdminDashboardPage;
