import React, { useState, useEffect, useCallback } from 'react';
import './BlindBoxActivity.css';
import blindBoxService from '../../services/blindBoxService';
import ExchangeModal from './ExchangeModal';

const BlindBoxActivity = ({ user, globalPoints, syncUserData }) => {
  const [activityData, setActivityData] = useState(null);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadActivityData = useCallback(async () => {
    try {
      const data = await blindBoxService.getActivityData();
      setActivityData(data);
      setError('');
    } catch (error) {
      setError(error.message || '加载活动数据失败');
    }
  }, []);

  useEffect(() => {
    loadActivityData();
  }, [loadActivityData]);

  const handleSingleDraw = async () => {
    if (isDrawing) return;
    
    setIsDrawing(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await blindBoxService.singleDraw();
      setDrawResult([result.char]);
      setSuccess(`获得字符: ${result.char}`);
      
      if (syncUserData) {
        syncUserData({ points: result.remainingPoints });
      }
      
      await loadActivityData();
    } catch (error) {
      setError(error.message || '抽取失败');
    } finally {
      setIsDrawing(false);
    }
  };

  const handleTenDraw = async () => {
    if (isDrawing) return;
    
    setIsDrawing(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await blindBoxService.tenDraw();
      setDrawResult(result.chars);
      setSuccess(`获得字符: ${result.chars.join(', ')}`);
      
      if (syncUserData) {
        syncUserData({ points: result.remainingPoints });
      }
      
      await loadActivityData();
    } catch (error) {
      setError(error.message || '抽取失败');
    } finally {
      setIsDrawing(false);
    }
  };

  const handleExchangeSuccess = (data) => {
    setSuccess(`兑换成功！获得 ¥${data.reward}`);
    setShowExchangeModal(false);
    loadActivityData();
    
    if (syncUserData) {
      syncUserData({ cashBalance: data.newCashBalance });
    }
  };

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!activityData) {
    return (
      <div className="blindbox-activity loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  // 🔧 移除时间检查状态，活动一直有效
  return (
    <div className="blindbox-activity">
      <div className="activity-header">
        <h1 className="activity-title">盲盒天天乐</h1>
        <div className="activity-period">
          长期活动
        </div>
      </div>

      <div className="floating-boxes">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`floating-box box-${i}`}></div>
        ))}
      </div>

      <div className="main-blindbox">
        <div className="blindbox-container">
          <div className="blindbox-main">
            {drawResult.length > 0 ? (
              <div className="draw-result">
                {drawResult.map((char, index) => (
                  <span key={index} className="char-display">{char}</span>
                ))}
              </div>
            ) : (
              <div className="blindbox-image">🎁</div>
            )}
          </div>
        </div>

        <div className="draw-buttons">
          <button 
            className="single-draw-btn"
            onClick={handleSingleDraw}
            disabled={isDrawing || (globalPoints || activityData.userPoints) < 10}
          >
            {isDrawing ? '抽取中...' : '单抽 (10积分)'}
          </button>
          <button 
            className="ten-draw-btn"
            onClick={handleTenDraw}
            disabled={isDrawing || (globalPoints || activityData.userPoints) < 95}
          >
            {isDrawing ? '抽取中...' : '十连抽 (95积分)'}
          </button>
        </div>

        <button 
          className="exchange-btn"
          onClick={() => setShowExchangeModal(true)}
          disabled={activityData.collectedChars.length === 0}
        >
          奖励兑换 ({activityData.collectedChars.length}个字符)
        </button>
      </div>

      <div className="collected-chars">
        <h3>我的字符</h3>
        <div className="chars-display">
          {activityData.collectedChars.length > 0 ? (
            activityData.collectedChars.map((char, index) => (
              <span key={index} className="collected-char">{char}</span>
            ))
          ) : (
            <p className="no-chars">暂无字符，快去抽取吧！</p>
          )}
        </div>
      </div>

      <div className="activity-rules">
        <h3>玩法规则</h3>
        <div className="rules-content">
          <div className="rule-item">
            <span className="rule-title">抽取条件:</span>
            <span className="rule-desc">单抽10积分，十连抽95积分</span>
          </div>
          <div className="rule-item">
            <span className="rule-title">奖励兑换:</span>
            <span className="rule-desc">不同字符组合可兑换不同红包</span>
          </div>
          <div className="rule-item">
            <span className="rule-title">活动状态:</span>
            <span className="rule-desc">长期活动，永久有效</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <p>✅ {success}</p>
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {showExchangeModal && (
        <ExchangeModal 
          onClose={() => setShowExchangeModal(false)}
          collectedChars={activityData.collectedChars}
          onExchangeSuccess={handleExchangeSuccess}
        />
      )}
    </div>
  );
};

export default BlindBoxActivity;
