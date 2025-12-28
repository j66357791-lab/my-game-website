// frontend/src/pages/MyOrdersPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopService } from '../services/shopService';
import './MyOrdersPage.css';

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all, paid, shipped

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await shopService.getMyOrders();
      setOrders(data || []);
    } catch (error) {
      console.error('获取订单失败', error);
    }
  };

  const handleConfirmReceive = async (orderId) => {
    if (!window.confirm('确认已收到商品吗？')) return;
    try {
      await shopService.confirmReceive(orderId);
      alert('确认成功');
      fetchOrders();
    } catch (error) {
      alert(error.message || '操作失败');
    }
  };

  const statusMap = {
    'pending_payment': '待支付',
    'paid': '待发货',
    'shipped': '待收货',
    'received': '已完成',
    'cancelled': '已取消'
  };

  const statusColorMap = {
    'pending_payment': '#ff5000',
    'paid': '#0091ff',
    'shipped': '#ff5000',
    'received': '#00c853',
    'cancelled': '#999'
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'paid') return order.status === 'paid' || order.status === 'pending_payment';
    if (activeTab === 'shipped') return order.status === 'shipped';
    return true;
  });

  return (
    <div className="orders-page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>‹</button>
        <h2>我的订单</h2>
      </div>

      <div className="tabs">
        {['all', 'paid', 'shipped'].map(tab => (
          <div 
            key={tab} 
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? '全部' : tab === 'paid' ? '待发货' : '待收货'}
          </div>
        ))}
      </div>

      <div className="order-list">
        {filteredOrders.length === 0 && <div className="empty">暂无相关订单</div>}
        
        {filteredOrders.map(order => (
          <div key={order._id} className="order-card">
            <div className="card-header">
              <span className="order-no">订单号: {order.orderNumber}</span>
              <span className="status" style={{ color: statusColorMap[order.status] }}>
                {statusMap[order.status]}
              </span>
            </div>
            
            <div className="card-body">
              {order.items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <img src={item.productImage || '/api/placeholder/80/80'} alt="" />
                  <div className="item-info">
                    <div className="name">{item.productName}</div>
                    <div className="sku">{item.skuName}</div>
                    <div className="price-row">
                      {item.pricePointsPaid > 0 && <span className="points">💎{item.pricePointsPaid}</span>}
                      {item.priceCashPaid > 0 && <span className="cash">¥{item.priceCashPaid.toFixed(2)}</span>}
                      <span className="count">x{item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-footer">
              <div className="total">
                实付: 
                {order.totalPoints > 0 && <span className="points">💎{order.totalPoints}</span>}
                {order.totalCash > 0 && <span className="cash">¥{order.totalCash.toFixed(2)}</span>}
              </div>
              {order.status === 'shipped' && (
                <button className="btn-confirm" onClick={() => handleConfirmReceive(order._id)}>
                  确认收货
                </button>
              )}
              {order.status === 'paid' && (
                <button className="btn-contact">联系客服</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOrdersPage;
