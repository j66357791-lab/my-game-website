import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BlindBoxActivity from '../components/BlindBoxActivity/BlindBoxActivity';
import { useUser } from '../contexts/UserContext';
import './BlindBoxActivityPage.css';

const BlindBoxActivityPage = ({ user, onUpdateUser, globalPoints, syncUserData }) => {
  const navigate = useNavigate();
  const { refreshAllData } = useUser();

  const handleBack = () => {
    navigate('/');
  };

  // 🔧 新增：页面挂载时刷新数据
  useEffect(() => {
    refreshAllData();
    
    // 添加定时刷新（每30秒）
    const interval = setInterval(refreshAllData, 30000);
    
    return () => clearInterval(interval);
  }, [refreshAllData]);

  return (
    <div className="blindbox-activity-page">
      <div className="activity-header">
        <button className="back-btn" onClick={handleBack}>← 返回</button>
        <h1 className="activity-title">盲盒天天乐</h1>
        <div className="activity-period">
          长期活动
        </div>
      </div>

      <BlindBoxActivity 
        user={user} 
        onUpdateUser={onUpdateUser}
        globalPoints={globalPoints}
        syncUserData={syncUserData || refreshAllData}
      />
    </div>
  );
};

export default BlindBoxActivityPage;
