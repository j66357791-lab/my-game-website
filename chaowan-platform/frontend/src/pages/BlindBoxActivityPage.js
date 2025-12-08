import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import BlindBoxActivity from '../components/BlindBoxActivity/BlindBoxActivity';
import './BlindBoxActivityPage.css';

const BlindBoxActivityPage = ({ user, onUpdateUser, globalPoints, syncUserData }) => {
  const navigate = useNavigate();

  // 返回首页
  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="blindbox-activity-page">
      {/* 活动头部 */}
      <div className="activity-header">
        <button className="back-btn" onClick={handleBack}>← 返回</button>
        <h1 className="activity-title">盲盒天天乐</h1>
        <div className="activity-period">
          活动时间: 12.8-12.30
        </div>
      </div>

      {/* 盲盒活动组件 */}
      <BlindBoxActivity 
        user={user} 
        onUpdateUser={onUpdateUser}
        globalPoints={globalPoints}
        syncUserData={syncUserData}
      />
    </div>
  );
};

export default BlindBoxActivityPage;
