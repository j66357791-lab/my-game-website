import React, { useState, useEffect } from 'react';
import './CultivationPage.css';
import { cultivationService } from '../services/cultivationService';

const CultivationPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // 定时器用于刷新界面 (实际应由WebSocket推送)
    const timer = setInterval(fetchData, 5000); 
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    const res = await cultivationService.getData();
    if (res.success) setData(res.data);
    setLoading(false);
  };

  const handleClaim = async () => {
    const res = await cultivationService.claim();
    if (res.success) {
      alert(`获得 ${res.gained} 灵气`);
      fetchData();
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div className="cultivation-container">
      {/* 顶部信息栏 */}
      <div className="status-bar">
        <span>境界: {data.realm} {data.level}级</span>
        <span>战力: {data.power}</span>
        <span>灵气: {data.exp}</span>
      </div>

      {/* 核心操作区 */}
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

      {/* 属性面板 */}
      <div className="attributes-panel">
        <h3>属性分配 (剩余: {data.availablePoints})</h3>
        {/* 属性列表组件 */}
        <AttributeList attributes={data.attributes} />
      </div>
    </div>
  );
};

export default CultivationPage;
