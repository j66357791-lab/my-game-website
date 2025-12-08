import React, { useState, useEffect, useCallback } from 'react';
import './.css';
import blindBoxService from '../../services/blindBoxService';
import ExchangeModal from './ExchangeModal';

const BlindBoxActivity = ({ user, globalPoints, syncUserData }) => {
  const [activityData, setActivityData] = useState(null);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 加载活动数据
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

  // 单抽处理
  const handleSingleDraw = async () => {
    if (isDrawing) return;
    
    setIsDrawing(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await blindBoxService.singleDraw();
      setDrawResult([result.char]);
      setSuccess(`获得字符: ${result.char}`);
      
      // 更新全局状态
      if (syncUserData) {
        syncUserData({ points: result.remainingPoints });
      }
      
      // 重新加载活动数据
      await loadActivityData();
    } catch (error) {
      setError(error.message || '抽取失败');
    } finally {
      setIsDrawing(false);
    }
  };

  // 十连抽处理
  const handleTenDraw = async () => {
    if (isDrawing) return;
    
    setIsDrawing(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await blindBoxService.tenDraw();
      setDrawResult(result.chars);
      setSuccess(`获得字符: ${result.chars.join(', ')}`);
      
      // 更新全局状态
      if (syncUserData) {
        syncUserData({ points: result.remainingPoints });
      }
      
      // 重新加载活动数据
      await loadActivityData();
    } catch (error) {
      setError(error.message || '抽取失败');
    } finally {
      setIsDrawing(false);
    }
  };

  // 兑换成功处理
  const handleExchangeSuccess = (data) => {
    setSuccess(`兑换成功！获得 ¥${data.reward}`);
    setShowExchangeModal(false);
    loadActivityData();
    
    // 更新全局状态
    if (syncUserData) {
      syncUserData({ cashBalance: data.newCashBalance });
    }
  };

  // 清除提示信息
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
      <div className="blindBox-activity loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  // 活动未开始或已结束
  if (activityData.status === 'not_started') {
    return (
      <div className="blindBox-activity not-started">
        <h2>🎁 盲盒天天乐</h2>
        <p>活动尚未开始</p>
        <p>开始时间: {new Date(activityData.activityStart).toLocaleDateString()}</p>
      </div>
    );
  }

  if (activityData.status === 'ended') {
    return (
      <div className="blindBox-activity ended">
        <h2>🎁 盲盒天天乐</h2>
        <p>活动已结束</p>
        <p>感谢您的参与！</p>
      </div>
    );
  }

  return (
    <div className="blindBox-activity">
      {/* 活动标题 */}
      <div className="activity-header">
        <h1 className="activity-title">盲盒天天乐</h1>
        <div className="activity-period">
          活动时间: 12.8-12.30
        </div>
      </div>

      {/* 漂浮的盲盒背景 */}
      <div className="floating-boxes">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`floating-box box-${i}`}></div>
        ))}
      </div>

      {/* 主盲盒 */}
      <div className="main-blindBox">
        <div className="blindBox-container">
          <div className="blindBox-main">
            {drawResult.length > 0 ? (
              <div className="draw-result">
                {drawResult.map((char, index) => (
                  <span key={index} className="char-display">{char}</span>
                ))}
              </div>
            ) : (
              <div className="blindBox-image">🎁</div>
            )}
          </div>
        </div>

        {/* 抽取按钮 */}
        <div className="draw-buttons">
          <button 
            className="single-draw-btn"
            onClick={handleSingleDraw}
            disabled={isDrawing || !activityData.canDraw || (globalPoints || activityData.userPoints) < 10}
          >
            {isDrawing ? '抽取中...' : '单抽 (10积分)'}
          </button>
          <button 
            className="ten-draw-btn"
            onClick={handleTenDraw}
            disabled={isDrawing || !activityData.canDraw || (globalPoints || activityData.userPoints) < 95}
          >
            {isDrawing ? '抽取中...' : '十连抽 (95积分)'}
          </button>
        </div>

        {/* 兑换按钮 */}
        <button 
          className="exchange-btn"
          onClick={() => setShowExchangeModal(true)}
          disabled={!activityData.canExchange || activityData.collectedChars.length === 0}
        >
          奖励兑换 ({activityData.collectedChars.length}个字符)
        </button>
      </div>

      {/* 收集的字符展示 */}
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

      {/* 规则说明 */}
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
            <span className="rule-title">活动时间:</span>
            <span className="rule-desc">12.8-12.30，兑换截止12.31</span>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
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

      {/* 兑换弹窗 */}
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
