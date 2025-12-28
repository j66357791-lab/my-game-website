// src/pages/DollShopPage.js - 完全修复版（安全格式化）
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DollShopPage.css';

// 🔧 安全的数字格式化函数
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return '0.00';
  }
  
  return num.toFixed(decimals);
};

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
      const response = await fetch('https://tianchang.zeabur.app/api/auth/user', {
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
      const response = await fetch('https://tianchang.zeabur.app/api/dolls/shop');
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
      return total + (parseFloat(doll.purchasePrice || 0) * quantities[doll.level]);
    }, 0);
  };

  const getTotalDolls = () => {
    return Object.values(quantities).reduce((total, qty) => total + qty, 0);
  };

  // 🔧 修复：添加错误检查和安全处理
  const handleSinglePurchase = async (doll) => {
    // 🔧 安全检查
    if (!user || user.points === undefined || user.points === null) {
      alert('用户信息异常，请刷新页面重试');
      return;
    }

    const userPoints = parseFloat(user.points || 0);
    const dollPrice = parseFloat(doll.purchasePrice || 0);
    
    if (userPoints < dollPrice) {
      alert('积分不足！');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchang.zeabur.app/api/dolls/purchase', {
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
        // 🔧 安全处理响应数据
        const newPoints = parseFloat(data.data?.newPoints || 0);
        const newExperience = parseFloat(data.data?.newExperience || 0);
        const experienceGained = parseFloat(data.data?.experienceGained || 0);
        
        // 🔧 更新用户信息
        setUser(prev => ({
          ...prev,
          points: newPoints,
          experience: newExperience
        }));
        
        // 🔧 构建成功消息
        let successMessage = '购买成功！';
        if (experienceGained > 0) {
          successMessage += ` 获得 ${safeToFixed(experienceGained)} 经验`;
        }
        
        alert(successMessage);
        setQuantities({ ...quantities, [doll.level]: 0 });
        
        // 🔧 刷新用户数据
        await fetchUserData();
      } else {
        alert(data.message || '购买失败');
      }
    } catch (error) {
      console.error('购买失败:', error);
      alert('购买失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 🔧 修复：批量购买也添加安全处理
  const handleBatchPurchase = async () => {
    const totalDolls = getTotalDolls();
    if (totalDolls === 0) {
      alert('请选择要购买的娃娃数量！');
      return;
    }

    // 🔧 安全检查
    if (!user || user.points === undefined || user.points === null) {
      alert('用户信息异常，请刷新页面重试');
      return;
    }

    const userPoints = parseFloat(user.points || 0);
    const totalCost = parseFloat(calculateTotalCost()) || 0;
    
    if (userPoints < totalCost) {
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

      const response = await fetch('https://tianchang.zeabur.app/api/dolls/purchase-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ purchases })
      });

      const data = await response.json();
      
      if (data.success) {
        // 🔧 安全处理响应数据
        const newPoints = parseFloat(data.data?.newPoints || 0);
        const newExperience = parseFloat(data.data?.newExperience || 0);
        const experienceGained = parseFloat(data.data?.experienceGained || 0);
        const dollsCount = data.data?.dolls?.length || 0;
        
        // 🔧 更新用户信息
        setUser(prev => ({
          ...prev,
          points: newPoints,
          experience: newExperience
        }));
        
        // 🔧 构建成功消息
        let successMessage = `批量购买成功！购买 ${dollsCount} 个娃娃`;
        if (experienceGained > 0) {
          successMessage += `，获得 ${safeToFixed(experienceGained)} 经验`;
        }
        
        alert(successMessage);
        
        // 🔧 重置数量
        const resetQuantities = {};
        shopDolls.forEach(doll => {
          resetQuantities[doll.level] = 0;
        });
        setQuantities(resetQuantities);
        
        // 🔧 刷新用户数据
        await fetchUserData();
      } else {
        alert(data.message || '批量购买失败');
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
          {/* 🔧 修复积分显示精度 */}
          <span>积分: {user ? safeToFixed(user.points) : '0.00'}</span>
          <span>经验: {user ? safeToFixed(user.experience) : '0.00'}</span>
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
              {/* 🔧 修复价格显示精度 */}
              <p>价格: {safeToFixed(doll.purchasePrice)} 积分</p>
              <p>每日产出: {safeToFixed(doll.productionPerDay)} 积分</p>
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
                disabled={loading || (user && parseFloat(user.points || 0) < parseFloat(doll.purchasePrice || 0))}
              >
                {user && parseFloat(user.points || 0) < parseFloat(doll.purchasePrice || 0) ? '积分不足' : '立即购买'}
              </button>
            )}
          </div>
        ))}
      </div>

      {batchMode && (
        <div className="batch-summary">
          <div className="summary-info">
            {/* 🔧 修复总计显示精度 */}
            <span>总计: {getTotalDolls()} 个娃娃</span>
            <span>费用: {safeToFixed(calculateTotalCost())} 积分</span>
          </div>
          <button 
            className="batch-purchase-btn"
            onClick={handleBatchPurchase}
            disabled={loading || getTotalDolls() === 0 || (user && parseFloat(user.points || 0) < parseFloat(calculateTotalCost() || 0))}
          >
            {loading ? '购买中...' : `批量购买 (${getTotalDolls()}个)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default DollShopPage;
