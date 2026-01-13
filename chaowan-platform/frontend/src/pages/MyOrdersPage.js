// frontend/src/pages/MyOrdersPage.js
import React, { useState, useEffect } from 'react';
import { api } from '../config/api';
import './MyOrdersPage.css';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shop/orders'); // 假设这里是获取当前用户订单的接口
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch (error) {
      console.error('获取订单失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    const map = {
      'pending_payment': '待支付',
      'paid': '待发货',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return map[status] || status;
  };

  return (
    <div className="my-orders-page">
      <div className="header">
        <h1>我的订单</h1>
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
                        <div className="item-name">{item.productName || item.productName}</div>
                        <div className="item-sku">{item.skuName} x {item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ✅ 物流信息展示区 */}
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
                  <div className="actions">
                    {order.status === 'shipped' && (
                      <button className="btn-logistics" onClick={() => alert('查看物流进度功能开发中')}>查看物流</button>
                    )}
                    {order.status === 'paid' && (
                      <button className="btn-contact">联系客服</button>
                    )}
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
