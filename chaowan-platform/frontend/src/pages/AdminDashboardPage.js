// frontend/src/pages/AdminDashboardPage.js - 完整优化版 (含商城管理 + 游戏控制)
import React, { useState, useEffect } from 'react';
import { api } from '../config/api';
import './AdminDashboardPage.css';

const AdminDashboardPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // --- 商城管理状态 ---
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // --- 游戏控制状态 (恢复) ---
  const [bossConfig, setBossConfig] = useState({ name: '千羽', hp: 100000, reward: 100 });
  const [mysteryConfig, setMysteryConfig] = useState({ betLimit: 1000, winRate: 50 });

  // 新增商品表单
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    images: '',
    categoryId: '',
    tags: [],
    skus: [{ id: 'sku1', name: '默认规格', pricePoints: 0, priceCash: 0, stock: 100 }]
  });

  useEffect(() => {
    if (activeTab === 'shop') fetchAdminData();
    if (activeTab === 'games') fetchGameConfigs();
  }, [activeTab]);

  // 获取游戏配置
  const fetchGameConfigs = async () => {
    setLoading(true);
    try {
      // 注意：这里的接口路径需要根据你的后端 server.js 确认
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

  // 保存游戏配置
  const handleSaveGameConfig = async (type) => {
    try {
      if (type === 'boss') await api.post('/admin/boss/update', bossConfig);
      if (type === 'mystery') await api.post('/admin/mystery-card/config', mysteryConfig);
      alert('配置保存成功');
    } catch (error) {
      alert('保存失败: ' + (error.response?.data?.message || error.message));
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
      setProductForm({
        name: '',
        description: '',
        images: '',
        categoryId: '',
        tags: [],
        skus: [{ id: 'sku1', name: '默认规格', pricePoints: 0, priceCash: 0, stock: 100 }]
      });
      fetchAdminData();
    } catch (error) {
      const errorMsg = error.response?.data?.message || '发布失败，请检查输入';
      console.error('发布失败详情:', errorMsg);
      alert('❌ 发布失败: ' + errorMsg);
    }
  };

  const handleShipOrder = async (orderId) => {
    if (!window.confirm('确认发货？')) return;
    try {
      await api.put(`/admin/shop/orders/${orderId}/ship`);
      alert('发货成功');
      fetchAdminData();
    } catch (error) {
      alert('发货失败');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h2>🚫 访问被拒绝</h2>
          <p>您没有管理员权限</p>
          <p>当前用户角色: {user?.role || '未知'}</p>
        </div>
      </div>
    );
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
        {/* --- 仪表板 --- */}
        {activeTab === 'dashboard' && (
          <div>
            <h3>📊 仪表板</h3>
            <div className="metrics-grid">
              <div className="metric-card"><div className="metric-icon">👥</div><div className="metric-info"><h3>{products.length}</h3><p>商城商品</p></div></div>
              <div className="metric-card"><div className="metric-icon">📦</div><div className="metric-info"><h3>{orders.length}</h3><p>订单总数</p></div></div>
            </div>
          </div>
        )}

        {/* --- 用户管理 (占位) --- */}
        {activeTab === 'users' && (
          <div>
            <h3>👥 用户管理</h3>
            <p>请前往 /admin/users 查看详情</p>
          </div>
        )}

        {/* --- 积分管理 (占位) --- */}
        {activeTab === 'points' && (
          <div>
            <h3>💰 积分管理</h3>
            <p>请前往 /admin/points 查看详情</p>
          </div>
        )}

        {/* --- 游戏控制 (恢复) --- */}
        {activeTab === 'games' && (
          <div className="shop-management">
            <h3>🎮 游戏控制中心</h3>
            <div className="section">
              <h4>Boss 挑战配置</h4>
              <div className="form-group">
                <label>Boss 名称</label>
                <input value={bossConfig.name} onChange={e => setBossConfig({...bossConfig, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Boss HP (血量)</label>
                <input type="number" value={bossConfig.hp} onChange={e => setBossConfig({...bossConfig, hp: e.target.value})} />
              </div>
              <button className="btn-primary" onClick={() => handleSaveGameConfig('boss')}>保存 Boss 配置</button>
            </div>

            <div className="section">
              <h4>神秘卡牌配置</h4>
              <div className="form-group">
                <label>下注限额</label>
                <input type="number" value={mysteryConfig.betLimit} onChange={e => setMysteryConfig({...mysteryConfig, betLimit: e.target.value})} />
              </div>
              <button className="btn-primary" onClick={() => handleSaveGameConfig('mystery')}>保存神秘卡牌配置</button>
            </div>
          </div>
        )}

        {/* --- 商城管理 (新增) --- */}
        {activeTab === 'shop' && (
          <div className="shop-management">
            <div className="shop-header">
              <h3>🛍️ 商城管理</h3>
              <button className="btn-primary" onClick={() => setShowProductModal(true)}>+ 发布商品</button>
            </div>

            {/* 商品列表 - 完整代码 */}
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
                        <button className="btn-edit" onClick={() => alert('编辑功能开发中')}>编辑</button>
                        <button className="btn-delete" onClick={() => alert('下架功能开发中')}>下架</button>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && <p style={{color:'#999', textAlign:'center', padding:'20px'}}>暂无商品，点击右上角发布</p>}
                </div>
              )}
            </div>

            {/* 订单列表 - 完整代码 */}
            <div className="section">
              <h4>订单列表 ({orders.length})</h4>
              <div className="admin-list">
                {orders.map(order => (
                  <div key={order._id} className="list-item">
                    <div className="info">
                      <div className="name">订单: {order.orderNumber}</div>
                      <div className="meta">
                        状态: <span style={{color: order.status==='paid'?'#e02e24':'#999'}}>{order.status}</span> | 
                        总价: 💎{order.totalPoints} ¥{order.totalCash}
                      </div>
                    </div>
                    <div className="actions">
                      {order.status === 'paid' && (
                        <button className="btn-ship" onClick={() => handleShipOrder(order._id)}>发货</button>
                      )}
                      <button className="btn-view" onClick={() => alert('详情功能开发中')}>详情</button>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p style={{color:'#999', textAlign:'center', padding:'20px'}}>暂无订单</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 发布商品弹窗 - 完整代码 */}
      {showProductModal && (
        <div className="modal" onClick={() => setShowProductModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>发布新商品</h3>
            <form onSubmit={handleCreateProduct}>
              <input 
                placeholder="商品名称" 
                value={productForm.name}
                onChange={e => setProductForm({...productForm, name: e.target.value})}
                required 
              />
              <textarea 
                placeholder="商品描述" 
                value={productForm.description}
                onChange={e => setProductForm({...productForm, description: e.target.value})}
              />
              <input 
                placeholder="图片URL (多个用逗号分隔)" 
                value={productForm.images}
                onChange={e => setProductForm({...productForm, images: e.target.value})}
              />
              <select 
                value={productForm.categoryId}
                onChange={e => setProductForm({...productForm, categoryId: e.target.value})}
              >
                <option value="">无分类 (暂不选择)</option>
              </select>
              
              <label>✅ 商品规格 (SKU) 设置</label>
              {productForm.skus.map((sku, idx) => (
                <div key={idx} className="sku-form-row-wrapper">
                  <div className="sku-row-label">规格 #{idx + 1}</div>
                  <div className="sku-inputs">
                    <input placeholder="唯一ID (如 red_l)" value={sku.id} onChange={e => {
                      const skus = [...productForm.skus]; skus[idx].id = e.target.value; setProductForm({...productForm, skus});
                    }} required />
                    <input placeholder="规格名称 (如 红色大号)" value={sku.name} onChange={e => {
                      const skus = [...productForm.skus]; skus[idx].name = e.target.value; setProductForm({...productForm, skus});
                    }} required />
                  </div>
                  <div className="sku-inputs">
                    <div className="input-with-label">
                      <label>积分价</label>
                      <input type="number" placeholder="0" value={sku.pricePoints} onChange={e => {
                        const skus = [...productForm.skus]; skus[idx].pricePoints = parseInt(e.target.value); setProductForm({...productForm, skus});
                      }} />
                    </div>
                    <div className="input-with-label">
                      <label>现金价</label>
                      <input type="number" placeholder="0.0" value={sku.priceCash} onChange={e => {
                        const skus = [...productForm.skus]; skus[idx].priceCash = parseFloat(e.target.value); setProductForm({...productForm, skus});
                      }} />
                    </div>
                    <div className="input-with-label">
                      <label>库存数</label>
                      <input type="number" placeholder="99" value={sku.stock} onChange={e => {
                        const skus = [...productForm.skus]; skus[idx].stock = parseInt(e.target.value); setProductForm({...productForm, skus});
                      }} required />
                    </div>
                  </div>
                  <button type="button" className="btn-delete-sku" onClick={() => setProductForm({...productForm, skus: productForm.skus.filter((_, i) => i !== idx)})}>删除</button>
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => setProductForm({
                  ...productForm, 
                  skus: [...productForm.skus, { id: `sku${Date.now()}`, name: '新规格', pricePoints: 0, priceCash: 0, stock: 0 }]
                })}
              >
                + 添加新规格
              </button>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowProductModal(false)}>取消</button>
                <button type="submit">发布</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">加载中...</div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
