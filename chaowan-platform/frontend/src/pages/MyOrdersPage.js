// frontend/src/pages/MyOrdersPage.js - 强制显示优化版
import React, { useState, useEffect } from 'react';
import { api } from '../config/api';
import './MyOrdersPage.css';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 筛选与搜索状态
  const [filter, setFilter] = useState('all'); // all, paid, shipped, completed
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get('/shop/orders', { params });
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch (error) {
      console.error('获取订单失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOrders();
  };

  const getStatusText = (status) => {
    const map = {
      'pending_payment': '待支付',
      'paid': '待发货',
      'shipped': '已发货',
      'completed': '已签收',
      'cancelled': '已取消'
    };
    return map[status] || status;
  };

  return (
    <div className="my-orders-page">
      <div className="header">
        <h1>我的订单</h1>
      </div>

      {/* ✅ 强制样式：筛选与搜索栏 */}
      <div style={{ 
        background: 'white', 
        padding: '15px', 
        marginBottom: '15px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)' 
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', overflowX: 'auto' }}>
          <button 
            onClick={() => setFilter('all')} 
            style={{ 
              padding: '8px 16px', 
              border: filter === 'all' ? '1px solid #1890ff' : '1px solid #e0e0e0', 
              background: filter === 'all' ? '#1890ff' : 'white', 
              color: filter === 'all' ? 'white' : '#333',
              borderRadius: '20px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >全部订单</button>
          <button 
            onClick={() => setFilter('paid')} 
            style={{ 
              padding: '8px 16px', 
              border: filter === 'paid' ? '1px solid #faad14' : '1px solid #e0e0e0', 
              background: filter === 'paid' ? '#faad14' : 'white', 
              color: filter === 'paid' ? 'white' : '#333',
              borderRadius: '20px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >待发货</button>
          <button 
            onClick={() => setFilter('shipped')} 
            style={{ 
              padding: '8px 16px', 
              border: filter === 'shipped' ? '1px solid #1890ff' : '1px solid #e0e0e0', 
              background: filter === 'shipped' ? '#1890ff' : 'white', 
              color: filter === 'shipped' ? 'white' : '#333',
              borderRadius: '20px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >已发货</button>
          <button 
            onClick={() => setFilter('completed')} 
            style={{ 
              padding: '8px 16px', 
              border: filter === 'completed' ? '1px solid #52c41a' : '1px solid #e0e0e0', 
              background: filter === 'completed' ? '#52c41a' : 'white', 
              color: filter === 'completed' ? 'white' : '#333',
              borderRadius: '20px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >已签收</button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="搜索订单号/商品名" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              flex: 1, 
              padding: '8px 12px', 
              border: '1px solid #ddd', 
              borderRadius: '20px',
              outline: 'none'
            }}
          />
          <button 
            onClick={handleSearch}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#1890ff',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}
          >🔍</button>
        </div>
      </div>

      <div className="order-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          orders.length === 0 ? (
            <div className="empty">暂无订单</div>
          ) : (
            orders.map(order => (
              <div key={order._id} className="order-card" style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                  <span className="order-number" style={{ fontSize: '14px', color: '#666' }}>{order.orderNumber}</span>
                  <span className={`status ${order.status}`} style={{ 
                    background: order.status === 'paid' ? '#fff7e6' : order.status === 'shipped' ? '#e6f7ff' : '#f6ffed',
                    color: order.status === 'paid' ? '#faad14' : order.status === 'shipped' ? '#1890ff' : '#52c41a',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="card-body">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="item-row" style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                      <img src={item.image || '/api/placeholder/80/80'} alt="" className="item-img" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', background: '#f0f0f0' }} />
                      <div className="item-info" style={{ flex: 1 }}>
                        <div className="item-name" style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{item.productName}</div>
                        <div className="item-sku" style={{ fontSize: '14px', color: '#666' }}>{item.skuName} x {item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 物流信息展示 */}
                {order.status === 'shipped' && order.shipping && (
                  <div className="logistics-section" style={{ marginTop: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '4px', fontSize: '13px', color: '#666' }}>
                    <div className="logistics-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', fontWeight: 'bold' }}>
                      <span className="icon" style={{ marginRight: '5px' }}>🚚</span>
                      <span className="title">物流信息</span>
                    </div>
                    <div className="logistics-detail">
                      <div className="row" style={{ marginBottom: '4px' }}>
                        <span>发货方式:</span>
                        <span className="value" style={{ fontWeight: 'bold', color: '#333' }}>{order.shipping.method === 'express' ? '快递' : '无需快递'}</span>
                      </div>
                      {order.shipping.method === 'express' && (
                        <div className="row">
                          <span>快递单号:</span>
                          <span className="value tracking-no" style={{ color: '#1890ff', fontWeight: '500' }}>{order.shipping.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <div className="total-price" style={{ fontSize: '14px' }}>
                    <span>实付: </span>
                    {order.totalPoints > 0 && <span className="points" style={{ color: '#faad14', fontWeight: 'bold' }}>💎{order.totalPoints}</span>}
                    {order.totalCash > 0 && <span className="cash" style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{order.totalCash.toFixed(2)}</span>}
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
