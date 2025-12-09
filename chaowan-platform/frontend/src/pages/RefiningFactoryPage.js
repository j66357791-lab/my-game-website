// frontend/src/pages/RefiningFactoryPage.js - 修复时间显示
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useUser } from '../contexts/UserContext';
import './RefiningFactoryPage.css';

const RefiningFactoryPage = ({ user, onUpdateUser, globalPoints, syncUserData }) => {
  const navigate = useNavigate();
  const [factoryData, setFactoryData] = useState(null);
  const [blindBoxData, setBlindBoxData] = useState(null);
  const [selectedChar, setSelectedChar] = useState('');
  const [inputCount, setInputCount] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 加载盲盒活动数据以获取用户字符背包
  const loadBlindBoxData = useCallback(async () => {
    try {
      const result = await api.get('/blindBox/activity');
      setBlindBoxData(result.data);
      setError('');
    } catch (error) {
      setError(error.message || '加载字符背包数据失败');
    }
  }, []);

  // 加载炼化工厂数据
  const loadFactoryData = useCallback(async () => {
    try {
      const result = await api.get('/refining-factory/data');
      setFactoryData(result.data);
      setError('');
    } catch (error) {
      setError(error.message || '加载炼化工厂数据失败');
    }
  }, []);

  useEffect(() => {
    loadBlindBoxData();
    loadFactoryData();
  }, [loadBlindBoxData, loadFactoryData]);

  // 🔧 修复：计算用户字符背包中每个字符的数量（直接使用背包数据）
  const getUserCharCounts = useCallback(() => {
    if (!blindBoxData || !blindBoxData.collectedChars) {
      return {};
    }
    
    const charCounts = {};
    blindBoxData.collectedChars.forEach(char => {
      charCounts[char] = (charCounts[char] || 0) + 1;
    });
    
    return charCounts;
  }, [blindBoxData]);

  // 获取特定字符的拥有数量
  const getUserCharCount = (char) => {
    const charCounts = getUserCharCounts();
    return Math.max(0, charCounts[char] || 0);
  };

  // 获取可用的字符列表（用户拥有的字符）
  const getAvailableChars = () => {
    const charCounts = getUserCharCounts();
    return Object.keys(charCounts).filter(char => charCounts[char] > 0);
  };

  // 🔧 新增：格式化时间显示
  const formatTimeDisplay = (seconds) => {
    if (seconds >= 60 * 60) {
      // 小时显示
      const hours = seconds / (60 * 60);
      return {
        value: hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10,
        unit: '小时'
      };
    } else if (seconds >= 60) {
      // 分钟显示
      const minutes = seconds / 60;
      return {
        value: minutes >= 10 ? Math.round(minutes) : Math.round(minutes * 10) / 10,
        unit: '分钟'
      };
    } else {
      // 秒显示
      return {
        value: Math.round(seconds),
        unit: '秒'
      };
    }
  };

  // 🔧 修复：获取炼化速度显示
  const getRefiningSpeedDisplay = () => {
    if (!factoryData || !factoryData.refiningSpeed) {
      return { value: 24, unit: '小时' };
    }
    
    return factoryData.speedDisplay || formatTimeDisplay(factoryData.refiningSpeed);
  };

  // 🔧 修复：获取剩余时间显示
  const getRemainingTimeDisplay = () => {
    if (!factoryData || !factoryData.remainingTime) {
      return { value: 0, unit: '小时' };
    }
    
    return formatTimeDisplay(factoryData.remainingTime);
  };

  const handleInputChars = async () => {
    if (!selectedChar) {
      setError('请选择要投入的汉字');
      return;
    }

    if (inputCount < 1) {
      setError('投入数量不能小于1');
      return;
    }

    const userCharCount = getUserCharCount(selectedChar);
    if (inputCount > userCharCount) {
      setError(`您只有${userCharCount}个"${selectedChar}"字，无法投入${inputCount}个`);
      return;
    }

    try {
      // 创建投入的汉字数组
      const chars = Array(inputCount).fill(selectedChar);
      
      const result = await api.post('/refining-factory/input', { chars });
      setSuccess(`成功投入${inputCount}个"${selectedChar}"字`);
      setSelectedChar('');
      setInputCount(1);
      
      // 重新加载数据（先工厂后背包）
      await loadFactoryData();
      await loadBlindBoxData();
      
      if (syncUserData) {
        syncUserData({ points: result.data.newPoints });
      }
    } catch (error) {
      setError(error.message || '投入失败');
    }
  };

  const handleWithdrawChars = async () => {
    try {
      const result = await api.post('/refining-factory/withdraw');
      setSuccess(`取出成功，获得 ${result.data.withdrawnChars.join('')} 个汉字`);
      
      // 重新加载数据（先工厂后背包）
      await loadFactoryData();
      await loadBlindBoxData();
    } catch (error) {
      setError(error.message || '取出失败');
    }
  };

  const handleClaimPoints = async () => {
    try {
      const result = await api.post('/refining-factory/claim');
      setSuccess(`领取成功，获得 ${result.data.points} 积分`);
      await loadFactoryData();
      
      if (syncUserData) {
        syncUserData({ points: result.data.newPoints });
      }
    } catch (error) {
      setError(error.message || '领取失败');
    }
  };

  // 字符选择处理
  const handleCharSelect = (char) => {
    if (getUserCharCount(char) > 0) {
      setSelectedChar(char);
      setInputCount(1);
    }
  };

  // 数量输入处理
  const handleCountChange = (value) => {
    const count = parseInt(value) || 1;
    const maxCount = getUserCharCount(selectedChar);
    setInputCount(Math.min(maxCount, Math.max(1, count)));
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

  // 加载状态
  if (!factoryData || !blindBoxData) {
    return (
      <div className="refining-factory-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  const availableChars = getAvailableChars();
  const allPossibleChars = ['内', '测', '红', '包', '天', '领'];
  const speedDisplay = getRefiningSpeedDisplay();
  const remainingTimeDisplay = getRemainingTimeDisplay();

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
                <span className="status-value">
                  {remainingTimeDisplay.value}{remainingTimeDisplay.unit}
                </span>
              </div>
            )}
            <div className="status-item">
              <span className="status-label">炼化速度:</span>
              <span className="status-value speed-highlight">
                {speedDisplay.value}{speedDisplay.unit}/个
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">累计投入:</span>
              <span className="status-value">{factoryData.totalChars || 0}个汉字</span>
            </div>
            {/* 🔧 修复：下次速度提升提示 */}
            <div className="status-item">
              <span className="status-label">下次加速:</span>
              <span className="status-value">
                还需{500 - (factoryData.totalChars % 500)}个汉字
              </span>
            </div>
            {/* 🔧 新增：速度等级显示 */}
            <div className="status-item">
              <span className="status-label">速度等级:</span>
              <span className="status-value">
                Lv.{Math.floor((factoryData.totalChars || 0) / 500) + 1}
              </span>
            </div>
          </div>
        </div>

        {/* 投入/取出区域 */}
        <div className="action-area">
          <div className="input-section">
            <h3>投入汉字</h3>
            <div className="char-selector">
              {allPossibleChars.map(char => {
                const userCount = getUserCharCount(char);
                const isAvailable = userCount > 0;
                const isSelected = selectedChar === char;
                
                return (
                  <button
                    key={char}
                    className={`char-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                    onClick={() => handleCharSelect(char)}
                    disabled={!isAvailable}
                  >
                    <span className="char-text">{char}</span>
                    <span className="char-count">({userCount})</span>
                  </button>
                );
              })}
            </div>
            
            {selectedChar && (
              <div className="input-count-section">
                <label>投入数量:</label>
                <input
                  type="number"
                  min="1"
                  max={getUserCharCount(selectedChar)}
                  value={inputCount}
                  onChange={(e) => handleCountChange(e.target.value)}
                  className="count-input"
                />
                <span className="max-count">/ {getUserCharCount(selectedChar)}</span>
              </div>
            )}
            
            <button 
              className="input-btn"
              onClick={handleInputChars}
              disabled={!selectedChar || inputCount < 1}
            >
              投入 {inputCount} 个 {selectedChar && `"${selectedChar}"`}
            </button>
          </div>

          <div className="withdraw-section">
            <h3>取出汉字</h3>
            <p className="withdraw-info">
              当前投入: {factoryData.inputChars ? factoryData.inputChars.length : 0}个汉字
              <span> (可取出: {factoryData.inputChars ? Math.floor(factoryData.inputChars.length * 0.95) : 0}个)</span>
            </p>
            <button 
              className="withdraw-btn"
              onClick={handleWithdrawChars}
              disabled={!factoryData.inputChars || factoryData.inputChars.length === 0}
            >
              取出 (5%手续费)
            </button>
          </div>
        </div>

        {/* 积分领取 */}
        <div className="claim-section">
          <h3>领取积分</h3>
          <p className="claim-info">
            已炼化积分: {factoryData.refinedPoints || 0}积分
            {factoryData.canClaim && (
              <span className="claim-available"> (可领取)</span>
            )}
          </p>
          <button 
            className="claim-btn"
            onClick={handleClaimPoints}
            disabled={!factoryData.canClaim || (factoryData.refinedPoints || 0) === 0}
          >
            领取积分
          </button>
        </div>

        {/* 字符背包预览 */}
        <div className="char-backpack-section">
          <h3>我的字符背包</h3>
          <div className="backpack-chars">
            {availableChars.length > 0 ? (
              availableChars.map(char => (
                <div key={char} className="backpack-char">
                  <span className="char-display">{char}</span>
                  <span className="char-amount">×{getUserCharCount(char)}</span>
                </div>
              ))
            ) : (
              <p className="no-chars">暂无字符，快去盲盒天天乐抽取吧！</p>
            )}
          </div>
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
