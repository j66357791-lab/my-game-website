// frontend/src/pages/MyOrdersPage.js - 完整优化版
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

      {/* 筛选与搜索栏 */}
      <div className="order-filter-bar">
        <div className="filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部</button>
          <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>待发货</button>
          <button className={filter === 'shipped' ? 'active' : ''} onClick={() => setFilter('shipped')}>已发货</button>
          <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>已签收</button>
        </div>
        <div className="search-box">
          <input 
            type="text" 
            placeholder="搜索订单号/商品名" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={handleSearch}>🔍</button>
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
              <div key={order._id} className="order-card">
                <div className="card-header">
                  <span className="order-number">{order.orderNumber}</span>
                  <span className={`status ${order.status}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="card-body">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="item-row">
                      <img src={item.image || '/api/placeholder/80/80'} alt="" className="item-img" />
                      <div className="item-info">
                        <div className="item-name">{item.productName}</div>
                        <div className="item-sku">{item.skuName} x {item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 物流信息展示 */}
                {order.status === 'shipped' && order.shipping && (
                  <div className="logistics-section">
                    <div className="logistics-header">
                      <span className="icon">🚚</span>
                      <span className="title">物流信息</span>
                    </div>
                    <div className="logistics-detail">
                      <div className="row">
                        <span>发货方式:</span>
                        <span className="value">{order.shipping.method === 'express' ? '快递' : '无需快递'}</span>
                      </div>
                      {order.shipping.method === 'express' && (
                        <div className="row">
                          <span>快递单号:</span>
                          <span className="value tracking-no">{order.shipping.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="card-footer">
                  <div className="total-price">
                    <span>实付: </span>
                    {order.totalPoints > 0 && <span className="points">💎{order.totalPoints}</span>}
                    {order.totalCash > 0 && <span className="cash">¥{order.totalCash.toFixed(2)}</span>}
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
