// frontend/src/pages/DollShopPage.js - 添加批量购买功能
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DollShopPage.css';

const DollShopPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [shopDolls, setShopDolls] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchShopDolls();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.data.user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const fetchShopDolls = async () => {
    try {
      const response = await fetch('https://tianchuang.onrender.com/api/dolls/shop');
      const data = await response.json();
      if (data.success) {
        setShopDolls(data.data);
        // 初始化数量
        const initialQuantities = {};
        data.data.forEach(doll => {
          initialQuantities[doll.level] = 0;
        });
        setQuantities(initialQuantities);
      }
    } catch (error) {
      console.error('获取商店数据失败:', error);
    }
  };

  const handleQuantityChange = (dollLevel, change) => {
    const newQuantities = { ...quantities };
    const newValue = newQuantities[dollLevel] + change;
    if (newValue >= 0 && newValue <= 99) {
      newQuantities[dollLevel] = newValue;
      setQuantities(newQuantities);
    }
  };

  const calculateTotalCost = () => {
    return shopDolls.reduce((total, doll) => {
      return total + (doll.purchasePrice * quantities[doll.level]);
    }, 0);
  };

  const getTotalDolls = () => {
    return Object.values(quantities).reduce((total, qty) => total + qty, 0);
  };

  const handleSinglePurchase = async (doll) => {
    if (!user || user.points < doll.purchasePrice) {
      alert('积分不足！');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/dolls/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dollLevel: doll.level
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`购买成功！${data.data.experienceGained > 0 ? ` 获得 ${data.data.experienceGained} 经验` : ''}`);
        setUser(prev => ({ ...prev, points: data.data.newPoints }));
        setQuantities({ ...quantities, [doll.level]: 0 });
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('购买失败:', error);
      alert('购买失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchPurchase = async () => {
    const totalDolls = getTotalDolls();
    if (totalDolls === 0) {
      alert('请选择要购买的娃娃数量！');
      return;
    }

    if (!user || user.points < calculateTotalCost()) {
      alert('积分不足！');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const purchases = shopDolls
        .filter(doll => quantities[doll.level] > 0)
        .map(doll => ({
          dollLevel: doll.level,
          quantity: quantities[doll.level]
        }));

      const response = await fetch('https://tianchuang.onrender.com/api/dolls/purchase-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ purchases })
      });

      const data = await response.json();
      if (data.success) {
        alert(`批量购买成功！购买 ${data.data.dolls.length} 个娃娃${data.data.experienceGained > 0 ? `，获得 ${data.data.experienceGained} 经验` : ''}`);
        setUser(prev => ({ ...prev, points: data.data.newPoints }));
        // 重置数量
        const resetQuantities = {};
        shopDolls.forEach(doll => {
          resetQuantities[doll.level] = 0;
        });
        setQuantities(resetQuantities);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('批量购买失败:', error);
      alert('批量购买失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doll-shop-page">
      <div className="shop-header">
        <h1>🧸 娃娃商店</h1>
        <div className="user-info">
          <span>积分: {user?.points || 0}</span>
          <span>经验: {user?.experience || 0}</span>
        </div>
      </div>

      <div className="shop-controls">
        <button 
          className={`mode-toggle ${batchMode ? 'batch-mode' : 'single-mode'}`}
          onClick={() => setBatchMode(!batchMode)}
        >
          {batchMode ? '🛒 批量购买模式' : '🛍️ 单个购买模式'}
        </button>
      </div>

      <div className="dolls-grid">
        {shopDolls.map(doll => (
          <div key={doll.level} className="doll-card">
            <div className="doll-emoji">{doll.emoji}</div>
            <h3>{doll.name}</h3>
            <div className="doll-info">
              <p>等级: {doll.level}</p>
              <p>稀有度: {doll.rarity}</p>
              <p>价格: {doll.purchasePrice} 积分</p>
              <p>每日产出: {doll.productionPerDay} 积分</p>
              <p>有效期: {doll.totalDays} 天</p>
              {doll.level === 2 && <p className="exp-bonus">🎁 购买获得180经验</p>}
            </div>
            
            {batchMode ? (
              <div className="quantity-selector">
                <button 
                  onClick={() => handleQuantityChange(doll.level, -1)}
                  disabled={quantities[doll.level] === 0}
                >
                  -
                </button>
                <span>{quantities[doll.level]}</span>
                <button 
                  onClick={() => handleQuantityChange(doll.level, 1)}
                  disabled={quantities[doll.level] >= 99}
                >
                  +
                </button>
              </div>
            ) : (
              <button 
                className="purchase-btn"
                onClick={() => handleSinglePurchase(doll)}
                disabled={loading || (user && user.points < doll.purchasePrice)}
              >
                {user && user.points < doll.purchasePrice ? '积分不足' : '立即购买'}
              </button>
            )}
          </div>
        ))}
      </div>

      {batchMode && (
        <div className="batch-summary">
          <div className="summary-info">
            <span>总计: {getTotalDolls()} 个娃娃</span>
            <span>费用: {calculateTotalCost()} 积分</span>
          </div>
          <button 
            className="batch-purchase-btn"
            onClick={handleBatchPurchase}
            disabled={loading || getTotalDolls() === 0 || (user && user.points < calculateTotalCost())}
          >
            {loading ? '购买中...' : `批量购买 (${getTotalDolls()}个)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default DollShopPage;
