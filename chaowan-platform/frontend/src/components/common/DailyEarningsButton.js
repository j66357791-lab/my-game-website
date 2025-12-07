// src/components/common/DailyEarningsButton.js
import React, { useState, useEffect } from 'react';
import './DailyEarningsButton.css';

const DailyEarningsButton = ({ onEarningsClaimed }) => {
  const [canClaim, setCanClaim] = useState(true);
  const [loading, setLoading] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    checkClaimStatus();
  }, []);

  const checkClaimStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/transactions/cash', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const today = new Date().toDateString();
        const todayTransaction = data.data.transactions.find(t => 
          t.type === 'production' && 
          new Date(t.createdAt).toDateString() === today
        );
        setCanClaim(!todayTransaction);
        if (todayTransaction) {
          setTodayEarnings(todayTransaction.amount);
        }
      }
    } catch (error) {
      console.error('检查领取状态失败:', error);
    }
  };

  const handleClaimEarnings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/dolls/claim-earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCanClaim(false);
        setTodayEarnings(data.data.totalEarnings);
        if (onEarningsClaimed) {
          onEarningsClaimed(data.data);
        }
        alert(`成功领取今日收益 ${data.data.totalEarnings} 积分！`);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('领取收益失败:', error);
      alert('领取收益失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="daily-earnings-button">
      {canClaim ? (
        <button 
          className="claim-btn"
          onClick={handleClaimEarnings}
          disabled={loading}
        >
          {loading ? '领取中...' : '💰 一键领取今日收益'}
        </button>
      ) : (
        <div className="claimed-info">
          <span className="claimed-text">✅ 今日已领取 {todayEarnings} 积分</span>
          <span className="next-time">明天再来吧！</span>
        </div>
      )}
    </div>
  );
};

export default DailyEarningsButton;
