import React, { useState, useEffect } from 'react';
import './CultivationPage.css';
import { cultivationService } from '../services/cultivationService';

const CultivationPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 添加错误状态

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await cultivationService.getData();
      if (res.success) {
        if (res.exists) {
          setData(res.data); // 有档案，设置数据
        } else {
          setData({ exists: false }); // 无档案，设置标记
        }
      } else {
        // 后端返回 success: false（如 500 错误）
        setError('服务器返回错误，请稍后重试');
      }
    } catch (error) {
      console.error('获取修仙数据失败:', error);
      setError('网络错误，请检查连接');
    } finally {
      setLoading(false); // 无论成功与否，停止加载
    }
  };

  const handleClaim = async () => {
    const res = await cultivationService.claim();
    if (res.success) {
      alert(`获得 ${res.gained} 灵气`);
      fetchData();
    }
  };

  // 渲染逻辑：优先显示错误，再显示加载状态，最后显示内容
  if (error) return <div className="error-message">{error}</div>;
  if (loading) return <div className="loading-message">加载中...</div>;

  // 无数据时显示提示（即使 data 为 null）
  if (!data || !data.exists) {
    return (
      <div className="empty-state">
        <h2>请先创建修仙角色！</h2>
        <button className="create-btn" onClick={() => alert('跳转到创建角色页面')}>
          创建角色
        </button>
      </div>
    );
  }

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
