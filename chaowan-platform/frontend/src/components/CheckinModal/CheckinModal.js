// src/components/CheckinModal/CheckinModal.js
import React, { useState, useEffect } from 'react';
import { api } from '../../config/api';
import './CheckinModal.css';

const CheckinModal = ({ isOpen, onClose, user, onCheckinSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [checkinData, setCheckinData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchCheckinStatus();
    }
  }, [isOpen]);

  const fetchCheckinStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

      const result = await api.getCheckinStatus(token);
      
      if (result.success) {
        setCheckinData(result.data);
      }
    } catch (error) {
      console.error('❌ 获取签到状态失败:', error);
    }
  };

  const handleCheckin = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

      console.log('🎯 开始签到...');
      const result = await api.checkin(token);
      
      if (result.success) {
        console.log('✅ 签到成功:', result.data);
        onCheckinSuccess(result.data);
        
        // 显示成功消息
        setTimeout(() => {
          alert(`签到成功！获得 ${result.data.reward} 积分${result.data.levelUp ? '，恭喜升级！' : ''}`);
          onClose();
        }, 500);
      } else {
        throw new Error(result.message || '签到失败');
      }
    } catch (error) {
      console.error('❌ 签到失败:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="checkin-modal-overlay" onClick={onClose}>
      <div className="checkin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="checkin-modal-header">
          <h2>🎁 每日签到</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="checkin-modal-content">
          {checkinData ? (
            <>
              {checkinData.hasCheckedInToday ? (
                <div className="checkin-done">
                  <div className="checkin-icon">✅</div>
                  <h3>今日已签到</h3>
                  <p>连续签到 {checkinData.checkinStreak} 天</p>
                  <p>明天再来签到吧！</p>
                </div>
              ) : (
                <div className="checkin-pending">
                  <div className="checkin-icon">🎁</div>
                  <h3>今日签到</h3>
                  <div className="checkin-rewards">
                    <div className="reward-item">
                      <span className="reward-label">基础奖励</span>
                      <span className="reward-value">+{checkinData.baseReward} 积分</span>
                    </div>
                    {checkinData.todayReward > checkinData.baseReward && (
                      <div className="reward-item">
                        <span className="reward-label">等级加成</span>
                        <span className="reward-value">+{checkinData.todayReward - checkinData.baseReward} 积分</span>
                      </div>
                    )}
                    <div className="reward-total">
                      <span className="total-label">今日总计</span>
                      <span className="total-value">+{checkinData.todayReward} 积分</span>
                    </div>
                  </div>
                  <div className="checkin-streak-info">
                    <p>连续签到: {checkinData.checkinStreak} 天</p>
                  </div>
                  <button 
                    className="checkin-submit-btn"
                    onClick={handleCheckin}
                    disabled={loading}
                  >
                    {loading ? '签到中...' : '立即签到'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="checkin-loading">
              <div className="loading-spinner"></div>
              <p>加载签到信息...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckinModal;

