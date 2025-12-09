// frontend/src/pages/RefiningFactoryPage.js - 确保API路径正确
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useUser } from '../contexts/UserContext';
import './RefiningFactoryPage.css';

const RefiningFactoryPage = ({ user, onUpdateUser, globalPoints, syncUserData }) => {
  const navigate = useNavigate();
  const [factoryData, setFactoryData] = useState(null);
  const [inputChars, setInputChars] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFactoryData = useCallback(async () => {
    try {
      // 🔧 确保API路径正确：/api/refining-factory/data
      const result = await api.get('/api/refining-factory/data');
      setFactoryData(result.data);
      setError('');
    } catch (error) {
      setError(error.message || '加载炼化工厂数据失败');
    }
  }, []);

  useEffect(() => {
    loadFactoryData();
  }, [loadFactoryData]);

  const handleInputChars = async () => {
    if (inputChars.length === 0) {
      setError('请选择要投入的汉字');
      return;
    }

    try {
      // 🔧 确保API路径正确：/api/refining-factory/input
      const result = await api.post('/api/refining-factory/input', { chars: inputChars });
      setSuccess('投入成功');
      setInputChars([]);
      loadFactoryData();
      
      if (syncUserData) {
        syncUserData({ points: result.data.newPoints });
      }
    } catch (error) {
      setError(error.message || '投入失败');
    }
  };

  const handleWithdrawChars = async () => {
    try {
      // 🔧 确保API路径正确：/api/refining-factory/withdraw
      const result = await api.post('/api/refining-factory/withdraw');
      setSuccess(`取出成功，获得 ${result.data.withdrawnChars.join('')} 个汉字`);
      loadFactoryData();
    } catch (error) {
      setError(error.message || '取出失败');
    }
  };

  const handleClaimPoints = async () => {
    try {
      // 🔧 确保API路径正确：/api/refining-factory/claim
      const result = await api.post('/api/refining-factory/claim');
      setSuccess(`领取成功，获得 ${result.data.points} 积分`);
      loadFactoryData();
      
      if (syncUserData) {
        syncUserData({ points: result.data.newPoints });
      }
    } catch (error) {
      setError(error.message || '领取失败');
    }
  };

  const toggleCharSelection = (char) => {
    if (inputChars.includes(char)) {
      setInputChars(inputChars.filter(c => c !== char));
    } else {
      setInputChars([...inputChars, char]);
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

  if (!factoryData) {
    return (
      <div className="refining-factory-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="refining-factory-page">
      <div className="factory-header">
        <button className="back-btn" onClick={() => navigate('/blindBox-activity')}>← 返回</button>
        <h1 className="factory-title">🔥 炼化工厂</h1>
      </div>

      <div className="factory-content">
        {/* 熔炉动画 */}
        <div className="furnace-container">
          <div className="furnace">
            <div className="furnace-fire"></div>
            <div className="furnace-glow"></div>
          </div>
          
          {/* 炼化状态显示 */}
          <div className="refining-status">
            <h3>炼化状态</h3>
            <div className="status-item">
              <span className="status-label">状态:</span>
              <span className={`status-value ${factoryData.status}`}>
                {factoryData.status === 'active' ? '炼化中' : 
                 factoryData.status === 'completed' ? '可领取' : '空闲'}
              </span>
            </div>
            {factoryData.status === 'active' && (
              <div className="status-item">
                <span className="status-label">剩余时间:</span>
                <span className="status-value">{factoryData.remainingTime.toFixed(1)}小时</span>
              </div>
            )}
            <div className="status-item">
              <span className="status-label">炼化速度:</span>
              <span className="status-value">{factoryData.refiningDuration}小时/个</span>
            </div>
          </div>
        </div>

        {/* 投入/取出区域 */}
        <div className="action-area">
          <div className="input-section">
            <h3>投入汉字</h3>
            <div className="char-selector">
              {['内', '测', '红', '包', '天', '领'].map(char => (
                <button
                  key={char}
                  className={`char-btn ${inputChars.includes(char) ? 'selected' : ''}`}
                  onClick={() => toggleCharSelection(char)}
                >
                  {char}
                </button>
              ))}
            </div>
            <button 
              className="input-btn"
              onClick={handleInputChars}
              disabled={inputChars.length === 0}
            >
              投入
            </button>
          </div>

          <div className="withdraw-section">
            <h3>取出汉字</h3>
            <p className="withdraw-info">
              当前投入: {factoryData.totalChars}个汉字
              {factoryData.inputChars.length > 0 && (
                <span> (可取出: {factoryData.inputChars.length}个)</span>
              )}
            </p>
            <button 
              className="withdraw-btn"
              onClick={handleWithdrawChars}
              disabled={factoryData.inputChars.length === 0}
            >
              取出 (5%手续费)
            </button>
          </div>
        </div>

        {/* 积分领取 */}
        <div className="claim-section">
          <h3>领取积分</h3>
          <p className="claim-info">
            已炼化积分: {factoryData.refinedPoints}积分
            {factoryData.canClaim && (
              <span className="claim-available"> (可领取)</span>
            )}
          </p>
          <button 
            className="claim-btn"
            onClick={handleClaimPoints}
            disabled={!factoryData.canClaim || factoryData.refinedPoints === 0}
          >
            领取积分
          </button>
        </div>

        {/* 历史记录 */}
        <div className="history-section">
          <h3>炼化历史</h3>
          <div className="history-list">
            <p className="no-history">暂无炼化历史</p>
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
    </div>
  );
};

export default RefiningFactoryPage;
