import React from 'react';
import { useNavigate } from 'react-router-dom';
import BlindBoxActivity from '../components/BlindBoxActivity/BlindBoxActivity';
import './BlindBoxActivityPage.css';

const BlindBoxActivityPage = ({ user, onUpdateUser, globalPoints, syncUserData }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="blindbox-activity-page">
      <div className="activity-header">
        <button className="back-btn" onClick={handleBack}>← 返回</button>
        <h1 className="activity-title">盲盒天天乐</h1>
        <div className="activity-period">
          活动时间: 12.8-12.30
        </div>
      </div>

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
