// frontend/src/pages/AdminDashboardPage.js - 修复版 (含商城管理)
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
  
  // 新增商品表单
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    images: '',
    categoryId: '', // 这里初始是空字符串
    tags: [],
    skus: [{ id: 'sku1', name: '默认规格', pricePoints: 0, priceCash: 0, stock: 100 }]
  });

  useEffect(() => {
    console.log('AdminDashboardPage mounted, user:', user);
  }, [user]);

  useEffect(() => {
    if (activeTab === 'shop') {
      fetchAdminData();
    }
  }, [activeTab]);

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

  // ✅ 修复后的发布商品函数
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      // 1. 准备基础数据
      let payload = {
        ...productForm,
        // 图片字符串转数组
        images: productForm.images.split(',').map(s => s.trim()).filter(s => s),
        // 标签处理：如果没选，默认为 'all'
        tags: productForm.tags.length > 0 ? productForm.tags : ['all']
      };

      // ✅ 关键修复：如果分类ID为空字符串，强制置为 null，防止数据库报错
      if (!payload.categoryId || payload.categoryId === "") {
        payload.categoryId = null;
      }

      // 3. 发送请求
      await api.post('/admin/shop/products', payload);
      
      alert('✅ 商品发布成功！');
      setShowProductModal(false);
      // 重置表单
      setProductForm({
        name: '',
        description: '',
        images: '',
        categoryId: '',
        tags: [],
        skus: [{ id: 'sku1', name: '默认规格', pricePoints: 0, priceCash: 0, stock: 100 }]
      });
      fetchAdminData(); // 刷新列表
    } catch (error) {
      // 错误处理更详细一点
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
        {/* ✅ 新增 Tab */}
        <button className={activeTab === 'shop' ? 'active' : ''} onClick={() => setActiveTab('shop')}>🛍️ 商城管理</button>
      </div>

      <div className="dashboard-content">
        {/* --- 仪表板 --- */}
        {activeTab === 'dashboard' && (
          <div>
            <h3>📊 仪表板</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">👥</div>
                <div className="metric-info">
                  <h3>1234</h3>
                  <p>总用户数</p>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon">💳</div>
                <div className="metric-info">
                  <h3>567</h3>
                  <p>总交易数</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 用户管理 (占位) --- */}
        {activeTab === 'users' && (
          <div>
            <h3>👥 用户管理</h3>
            <p>这里是用户管理内容 (请前往 /admin/users 查看详情)</p>
          </div>
        )}

        {/* --- 积分管理 (占位) --- */}
        {activeTab === 'points' && (
          <div>
            <h3>💰 积分管理</h3>
            <p>这里是积分管理内容</p>
          </div>
        )}

        {/* ✅ --- 商城管理 (新增) --- */}
        {activeTab === 'shop' && (
          <div className="shop-management">
            <div className="shop-header">
              <h3>🛍️ 商城管理</h3>
              <button className="btn-primary" onClick={() => setShowProductModal(true)}>+ 发布商品</button>
            </div>

            {/* 商品列表 */}
            <div className="section">
              <h4>商品列表</h4>
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
                        <button className="btn-edit">编辑</button>
                        <button className="btn-delete">下架</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 订单列表 */}
            <div className="section">
              <h4>订单列表</h4>
              <div className="admin-list">
                {orders.map(order => (
                  <div key={order._id} className="list-item">
                    <div className="info">
                      <div className="name">订单号: {order.orderNumber}</div>
                      <div className="meta">
                        状态: <span style={{color: '#e02e24'}}>{order.status}</span> | 
                        总价: 💎{order.totalPoints} ¥{order.totalCash}
                      </div>
                    </div>
                    <div className="actions">
                      {order.status === 'paid' && (
                        <button className="btn-ship" onClick={() => handleShipOrder(order._id)}>发货</button>
                      )}
                      <button className="btn-view">详情</button>
                    </div>
                  </div>
                ))}
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
                {/* 这里应该从后端获取分类，暂时留空 */}
              </select>
              
              <label>规格 (SKU)</label>
              {productForm.skus.map((sku, idx) => (
                <div key={idx} className="sku-form-row">
                  <input 
                    placeholder="规格ID (唯一)" 
                    value={sku.id} 
                    onChange={e => {
                      const newSkus = [...productForm.skus];
                      newSkus[idx].id = e.target.value;
                      setProductForm({...productForm, skus: newSkus});
                    }}
                    required
                  />
                  <input 
                    placeholder="规格名称" 
                    value={sku.name} 
                    onChange={e => {
                      const newSkus = [...productForm.skus];
                      newSkus[idx].name = e.target.value;
                      setProductForm({...productForm, skus: newSkus});
                    }}
                    required
                  />
                  <input 
                    type="number" 
                    placeholder="积分价" 
                    value={sku.pricePoints} 
                    onChange={e => {
                      const newSkus = [...productForm.skus];
                      newSkus[idx].pricePoints = parseInt(e.target.value);
                      setProductForm({...productForm, skus: newSkus});
                    }}
                  />
                  <input 
                    type="number" 
                    placeholder="现金价" 
                    value={sku.priceCash} 
                    onChange={e => {
                      const newSkus = [...productForm.skus];
                      newSkus[idx].priceCash = parseFloat(e.target.value);
                      setProductForm({...productForm, skus: newSkus});
                    }}
                  />
                  <input 
                    type="number" 
                    placeholder="库存" 
                    value={sku.stock} 
                    onChange={e => {
                      const newSkus = [...productForm.skus];
                      newSkus[idx].stock = parseInt(e.target.value);
                      setProductForm({...productForm, skus: newSkus});
                    }}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      const newSkus = productForm.skus.filter((_, i) => i !== idx);
                      setProductForm({...productForm, skus: newSkus});
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => setProductForm({
                  ...productForm, 
                  skus: [...productForm.skus, { id: `sku${Date.now()}`, name: '新规格', pricePoints: 0, priceCash: 0, stock: 0 }]
                })}
              >
                + 添加规格
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
