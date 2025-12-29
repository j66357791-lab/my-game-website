import React, { useState, useEffect } from 'react';
import './CultivationPage.css';
import { cultivationService } from '../services/cultivationService';

const CultivationPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await cultivationService.getData();
      if (res.success) {
        if (res.exists) {
          setData(res.data);
        } else {
          setData({ exists: false });
        }
      }
    } catch (error) {
      console.error('获取修仙数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    const res = await cultivationService.claim();
    if (res.success) {
      alert(`获得 ${res.gained} 灵气`);
      fetchData();
    }
  };

  if (loading) return <div>加载中...</div>;
  if (!data || !data.exists) return <div>请先创建修仙角色！</div>;

  return (
    <div className="cultivation-container">
      <div className="status-bar">
        <span>境界: {data.realm} {data.level}级</span>
        <span>战力: {data.power}</span>
        <span>灵气: {data.exp}</span>
      </div>

      <div className="main-panel">
        <div className="avatar-section">
          <img src="/images/doll_placeholder.png" alt="Doll" />
          <h2>娃娃</h2>
        </div>
        
        <div className="actions">
          <button onClick={handleClaim} className="btn-cultivate">
            领取修炼收益
          </button>
          <button className="btn-upgrade-pool">
            升级灵气池 (Lv.{data.homePoolLevel})
          </button>
        </div>
      </div>

      <div className="attributes-panel">
        <h3>属性分配 (剩余: {data.availablePoints})</h3>
        <AttributeList attributes={data.attributes} />
      </div>
    </div>
  );
};

export default CultivationPage;
