import React, { useState } from 'react';
import api from '../../config/api';
import './CultivationIntro.css';

const CultivationIntro = ({ onEnterSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (gender) => {
    setLoading(true);
    try {
      const res = await api.post('/cultivation/init', { gender });
      if (res.data.success) {
        onEnterSuccess(); // 通知父组件进入主页
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert('初始化失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cultivation-intro-container">
      <h2 className="intro-title">🌟 修仙之路开启 🌟</h2>
      <p className="intro-desc">请选择你的转世灵体</p>
      
      <div className="gender-cards">
        <div 
          className={`gender-card male ${loading ? 'disabled' : ''}`}
          onClick={() => !loading && handleSelect('male')}
        >
          <div className="avatar">👦</div>
          <div className="name">少侠</div>
          <div className="bonus">初始攻击 +1</div>
        </div>
        
        <div 
          className={`gender-card female ${loading ? 'disabled' : ''}`}
          onClick={() => !loading && handleSelect('female')}
        >
          <div className="avatar">👧</div>
          <div className="name">女侠</div>
          <div className="bonus">初始生命 +10</div>
        </div>
      </div>
      
      {loading && <div className="loading-overlay">正在重塑灵根...</div>}
    </div>
  );
};

export default CultivationIntro;
