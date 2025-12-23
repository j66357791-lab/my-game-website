// frontend/src/components/VipSystem/VipShopPage.js
import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { userService } from '../../services/userService';
import './VipShopPage.css';

const VipShopPage = () => {
  const { updateUser } = useUser();
  const [loading, setLoading] = useState('');

  const VIP_CARDS = [
    { type: 'monthly', name: '月卡', price: 1980, duration: '30天' },
    { type: 'quarterly', name: '季卡', price: 5666, duration: '90天' },
    { type: 'yearly', name: '年卡', price: 20999, duration: '360天' },
  ];

  const handlePurchase = async (cardType) => {
    setLoading(cardType);
    try {
      const token = localStorage.getItem('token');
      const result = await userService.purchaseVipCard(cardType, token);
      if (result.success) {
        alert(result.message);
        // 刷新用户数据以更新积分和VIP天数
        // 这里可以调用一个全局刷新函数，或者手动更新状态
        updateUser({ integral: result.data.newIntegral, vip_days_left: result.data.newVipDays });
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('购买失败: ' + error.response?.data?.message || error.message);
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="vip-shop-page">
      <h1>VIP商店</h1>
      <div className="vip-cards-list">
        {VIP_CARDS.map(card => (
          <div key={card.type} className="vip-card">
            <h3>{card.name}</h3>
            <p>价格: {card.price} 积分</p>
            <p>时长: {card.duration}</p>
            <p>每日奖励: 66 星源币</p>
            <button 
              onClick={() => handlePurchase(card.type)}
              disabled={loading === card.type}
            >
              {loading === card.type ? '购买中...' : '购买'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VipShopPage;
