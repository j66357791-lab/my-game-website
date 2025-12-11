// frontend/src/components/BlindBoxActivity/BlindBoxActivity.js - 修复版本
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../config/api';
import ExchangeModal from './ExchangeModal';
import './BlindBoxActivity.css';

const BlindBoxActivity = ({ user, globalPoints, syncUserData }) => {
  const navigate = useNavigate();
  const [activityData, setActivityData] = useState(null);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadActivityData = useCallback(async () => {
    try {
      const response = await api.get('/blindBox/activity');
      // 🔧 修复：使用 response.data 而不是 response
      setActivityData(response.data);
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
      const result = await api.post('/blindBox/single-draw');
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
      const result = await api.post('/blindBox/ten-draw');
      setDrawResult(result.chars || []);
      setSuccess(`获得字符: ${(result.chars || []).join(', ')}`);
      
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

  // 🔧 新增：一百连抽功能
  const handleHundredDraw = async () => {
    if (isDrawing) return;
    
    setIsDrawing(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await api.post('/blindBox/hundred-draw');
      setDrawResult(result.chars || []);
      setSuccess(`获得字符: ${(result.chars || []).slice(0, 20).join(', ')}${(result.chars || []).length > 20 ? '...' : ''}`);
      
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

  // 🔧 修复：添加防御性检查
  const collectedChars = activityData.collectedChars || [];
  const userPoints = globalPoints || activityData.userPoints || 0;

  return (
    <div className="blindbox-activity">
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
            disabled={isDrawing || userPoints < 10}
          >
            {isDrawing ? '抽取中...' : '单抽 (10积分)'}
          </button>
          <button 
            className="ten-draw-btn"
            onClick={handleTenDraw}
            disabled={isDrawing || userPoints < 95}
          >
            {isDrawing ? '抽取中...' : '十连抽 (95积分)'}
          </button>
          {/* 🔧 新增：一百连抽按钮 */}
          <button 
            className="hundred-draw-btn"
            onClick={handleHundredDraw}
            disabled={isDrawing || userPoints < 899}
          >
            {isDrawing ? '抽取中...' : '一百连抽 (899积分)'}
          </button>
        </div>

        <button 
          className="exchange-btn"
          onClick={() => setShowExchangeModal(true)}
          disabled={collectedChars.length === 0}
        >
          奖励兑换 ({collectedChars.length}个字符)
        </button>
      </div>

      {/* 🔧 新增：炼化工厂按钮 */}
      <div className="refining-factory-btn">
        <button onClick={() => navigate('/refining-factory')}>
          🔥 炼化工厂
        </button>
      </div>

      <div className="collected-chars">
        <h3>我的字符</h3>
        <div className="chars-display">
          {collectedChars.length > 0 ? (
            collectedChars.map((char, index) => (
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
            <span className="rule-desc">单抽10积分，十连抽95积分，一百连抽899积分</span>
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
          collectedChars={collectedChars}
          onExchangeSuccess={handleExchangeSuccess}
        />
      )}
    </div>
  );
};

export default BlindBoxActivity;
