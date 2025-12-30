import React, { useState, useEffect } from 'react';
import './CultivationPage.css';
import { cultivationService } from '../services/cultivationService';
import AttributeList from './AttributeList'; // 导入属性列表组件
// import DungeonModal from './DungeonModal'; // 若需使用，取消注释
// import EquipmentGrid from './EquipmentGrid'; // 若需使用，取消注释

const CultivationPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000); // 每5秒刷新数据
    return () => clearInterval(timer); // 组件卸载时清除定时器
  }, []);

  const fetchData = async () => {
    try {
      setError(null); // 重置错误状态
      const res = await cultivationService.getData();
      console.log('后端返回数据:', res); // 调试日志

      if (res.success && res.data) {
        setData(res.data); // 更新数据
      } else {
        console.warn('接口返回成功但无数据');
      }
    } catch (err) {
      console.error('获取数据失败:', err);
      setError('获取数据失败，请检查网络或后端服务');
    } finally {
      setLoading(false); // 无论成功失败，取消加载状态
    }
  };

  const handleClaim = async () => {
    try {
      const res = await cultivationService.claim();
      if (res.success) {
        alert(`获得 ${res.gained} 灵气`); // 提示领取成功
        fetchData(); // 刷新数据
      } else {
        alert('领取失败: ' + (res.message || '未知错误')); // 提示失败原因
      }
    } catch (err) {
      console.error('领取失败:', err);
      alert('请求发生错误');
    }
  };

  // 加载中状态
  if (loading) return <div className="loading">加载中...</div>;

  // 错误状态
  if (error) return <div className="error">{error}</div>;

  // 数据为空时
  if (!data) return <div>暂无数据</div>;

  return (
    <div className="cultivation-container">
      {/* 顶部信息栏 */}
      <div className="status-bar">
        <span>境界: {data.realm || '未知'} {data.level || 0}级</span>
        <span>战力: {data.power || 0}</span>
        <span>灵气: {data.exp || 0}</span>
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
            升级灵气池 (Lv.{data.homePoolLevel || 0})
          </button>
        </div>
      </div>

      {/* 属性面板 */}
      <div className="attributes-panel">
        <h3>属性分配 (剩余: {data.availablePoints || 0})</h3>
        <AttributeList attributes={data.attributes} /> {/* 使用属性列表组件 */}
      </div>

      {/* 若需使用地牢模态框或装备网格，取消注释以下代码 */}
      {/* <DungeonModal /> */}
      {/* <EquipmentGrid /> */}
    </div>
  );
};

export default CultivationPage;
