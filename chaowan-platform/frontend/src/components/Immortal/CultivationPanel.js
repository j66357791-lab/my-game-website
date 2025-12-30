// frontend/src/components/Immortal/CultivationPanel.js
import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './CultivationPanel.css';

const CultivationPanel = ({ doll, onDollUpdate }) => {
  const [loading, setLoading] = useState(false);

  // 计算下一次领取需要等待多久（UI展示用）
  const getPoolCost = () => {
    // 简单的成本计算，与后端逻辑保持一致
    const baseCost = 50;
    const costMultiplier = 1.5;
    return Math.floor(baseCost * Math.pow(costMultiplier, doll.spiritPool.level - 1));
  };

  // 领取灵气
  const handleCollect = async () => {
    setLoading(true);
    try {
      const res = await api.post('/immortal/collect-spirit');
      if (res.success) {
        alert(res.message);
        // 通知父组件更新全局数据
        onDollUpdate(res.data.doll);
      }
    } catch (error) {
      alert(error.message || '领取失败');
    } finally {
      setLoading(false);
    }
  };

  // 升级灵气池
  const handleUpgrade = async () => {
    const cost = getPoolCost();
    if (!window.confirm(`确认消耗 ${cost} 星源币升级灵气池吗？`)) return;

    setLoading(true);
    try {
      const res = await api.post('/immortal/upgrade-pool');
      if (res.success) {
        alert(res.message);
        // 这里除了更新娃娃，可能还需要刷新用户的星源币余额，所以最好刷新全局
        if (onDollUpdate) onDollUpdate(res.data.doll, true); 
      }
    } catch (error) {
      alert(error.message || '升级失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cultivation-panel">
      <div className="panel-header">
        <span className="panel-title">🧘 灵气修炼</span>
        <span className="pool-level">Lv.{doll.spiritPool.level}</span>
      </div>

      <div className="spirit-display">
        <div className="spirit-icon">☁️</div>
        <div className="spirit-info">
          <div className="spirit-value">{doll.spiritualEnergy}</div>
          <div className="spirit-label">当前灵气</div>
        </div>
      </div>

      <div className="production-info">
        <div className="info-row">
          <span>灵气池等级</span>
          <span className="highlight">Lv.{doll.spiritPool.level}</span>
        </div>
        <div className="info-row">
          <span>灵气产出</span>
          <span className="highlight">+{doll.spiritPool.productionRate}/h</span>
        </div>
      </div>

      <div className="action-area">
        <button 
          className="collect-btn" 
          onClick={handleCollect} 
          disabled={loading}
        >
          {loading ? '...' : '领 取 灵 气'}
        </button>

        <button 
          className="upgrade-btn" 
          onClick={handleUpgrade}
          disabled={loading}
        >
          <div className="btn-row">
            <span>升级灵气池</span>
            <span className="cost-tag">{getPoolCost()} 星源币</span>
          </div>
          <div className="btn-desc">产出 +{doll.spiritPool.productionRate + 1}/h</div>
        </button>
      </div>
    </div>
  );
};

export default CultivationPanel;
