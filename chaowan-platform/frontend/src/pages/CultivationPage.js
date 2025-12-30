import React, { useState, useEffect } from 'react';
import './CultivationPage.css';
import { cultivationService } from '../services/cultivationService';
// 请确保你创建了 AttributeList 组件并在这里引入
// import AttributeList from './AttributeList'; 

const CultivationPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 新增：用于存储错误信息

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000); 
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setError(null); // 重置错误
      const res = await cultivationService.getData();
      
      // 增加日志，方便你在控制台查看后端到底返回了什么
      console.log('后端返回数据:', res);

      if (res.success && res.data) {
        setData(res.data);
      } else {
        console.warn('接口返回成功但无数据');
        // 即使无数据，如果之前有数据，可以选择不覆盖，或者设为默认对象
      }
    } catch (err) {
      console.error('获取数据失败:', err);
      setError('获取数据失败，请检查网络或后端服务');
    } finally {
      // 无论成功失败，都取消 Loading 状态
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    try {
      const res = await cultivationService.claim();
      if (res.success) {
        alert(`获得 ${res.gained} 灵气`);
        fetchData(); // 刷新数据
      } else {
        alert('领取失败: ' + (res.message || '未知错误'));
      }
    } catch (err) {
      console.error('领取失败:', err);
      alert('请求发生错误');
    }
  };

  // 1. 加载中状态
  if (loading) return <div className="loading">加载中...</div>;

  // 2. 错误状态显示
  if (error) return <div className="error">{error}</div>;

  // 3. 防御性编程：如果 data 还是没有值，返回空或提示
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
          {/* 确保图片路径正确 */}
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
        {/* 
           这里注释掉 AttributeList，直到你确保它已导入且定义正确
           或者你可以用一个简单的 div 代替测试
        */}
        <div style={{padding: '10px', border: '1px dashed #ccc'}}>
           {/* <AttributeList attributes={data.attributes} /> */}
           属性列表组件占位 (当前属性: {JSON.stringify(data.attributes)})
        </div>
      </div>
    </div>
  );
};

export default CultivationPage;
