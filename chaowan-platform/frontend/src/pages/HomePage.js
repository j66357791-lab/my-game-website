// src/pages/HomePage.js - 全新设计版
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import GlobalLoader from '../components/GlobalLoader';
import './HomePage.css';

// 🔧 安全的数字格式化函数
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
};

const safeToLocaleString = (value, decimals = 0) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals).toLocaleString();
};

const HomePage = () => {
  const navigate = useNavigate();
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // 🔧 从 UserContext 获取所有需要的状态
  const { 
    user, 
    points, 
    dolls, 
    loading: isUserLoading,
    error: globalError,
    setError: setGlobalError,
    updateUser
  } = useUser();

  // 🎯 计算今日总产出
  const todayTotalOutput = useMemo(() => {
    return dolls
      .filter(doll => doll.status === 'active')
      .reduce((sum, doll) => sum + (parseFloat(doll.output || 0) || 0), 0);
  }, [dolls]);

  // 🎯 计算总产出
  const totalOutput = useMemo(() => {
    return safeToLocaleString(todayTotalOutput * 30);
  }, [todayTotalOutput]);

  // 🎯 计算出战位数量
  const deployedSlots = useMemo(() => {
    return dolls.filter(doll => doll.status === 'active').length;
  }, [dolls]);

  // 🎯 统一加载状态
  const isInitialLoading = useMemo(() => {
    return isUserLoading || points === null || points === undefined;
  }, [isUserLoading, points]);

  // 刷新用户数据
  const refreshUserData = useCallback(async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      setError('');
      // 这里可以添加实际的刷新逻辑
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  // 处理按钮点击
  const handleButtonClick = (action) => {
    switch(action) {
      case 'blindBox':
        navigate('/blindBox-activity');
        break;
      case 'dollCenter':
        navigate('/doll-center');
        break;
      default:
        alert('正在开发中，敬请期待');
    }
  };

  // 如果正在加载，显示骨架屏
  if (isInitialLoading) {
    return <GlobalLoader text="加载用户数据中..." />;
  }

  return (
    <div className="home-page">
      {/* 下拉刷新 */}
      <div className="pull-refresh" onClick={refreshUserData}>
        {refreshing ? '🔄 刷新中...' : '🔄 刷新'}
      </div>

      {/* 错误提示 */}
      {(error || globalError) && (
        <div className="error-message">
          <p>❌ {error || globalError}</p>
          <button onClick={() => { setError(''); setGlobalError(''); }}>×</button>
        </div>
      )}

      {/* 🎯 顶部宣传横幅 */}
      <div className="hero-section">
        <div className="hero-content">
          <h2>开启幸运盲盒，获得娃娃！</h2>
          <button 
            className="hero-button"
            onClick={() => handleButtonClick('blindBox')}
          >
            立即开启 <span>×30</span>
          </button>
        </div>
      </div>

      {/* 🎯 中部快捷入口区 */}
      <div className="quick-access-section">
        <div className="quick-access-grid">
          <button 
            className="quick-access-item"
            onClick={() => handleButtonClick('blindBox')}
          >
            <div className="icon">🎁</div>
            <div className="label">活动</div>
          </button>
          <button 
            className="quick-access-item"
            onClick={() => handleButtonClick('dollCenter')}
          >
            <div className="icon">🧸</div>
            <div className="label">娃娃中心</div>
          </button>
          <button 
            className="quick-access-item"
            onClick={() => alert('正在开发中，敬请期待')}
          >
            <div className="icon">⏰</div>
            <div className="label">限时活动</div>
          </button>
          <button 
            className="quick-access-item"
            onClick={() => alert('正在开发中，敬请期待')}
          >
            <div className="icon">🧮</div>
            <div className="label">数学藏品</div>
          </button>
          <button 
            className="quick-access-item"
            onClick={() => alert('正在开发中，敬请期待')}
          >
            <div className="icon">🏆</div>
            <div className="label">好物拍卖</div>
          </button>
        </div>
      </div>

      {/* 🎯 热门项目展示区 */}
      <div className="hot-projects-section">
        <div className="section-header">
          <h3>🔥 热门项目 TEMS</h3>
        </div>
        <div className="projects-grid">
          <div className="project-card">
            <div className="project-image">🧸</div>
            <div className="project-content">
              <h4>招募员工</h4>
              <p>开启盲盒，获得属于自己的数字Npc</p>
              <div className="project-price">30</div>
            </div>
            <div className="project-tag">热</div>
          </div>
          <div className="project-card">
            <div className="project-image">💎</div>
            <div className="project-content">
              <h4>靓号选购</h4>
              <p>专属邀请码</p>
              <div className="project-price">300起</div>
            </div>
            <div className="project-tag">热</div>
          </div>
          <div className="project-card">
            <div className="project-image">💰</div>
            <div className="project-content">
              <h4>购买宝石</h4>
              <p>消耗金钥匙，随机抽取，宝石、初级工人和减税卡</p>
              <div className="project-price">50</div>
            </div>
            <div className="project-tag">预告</div>
          </div>
        </div>
      </div>

      {/* 🎯 用户收益展示 */}
      <div className="user-stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{safeToLocaleString(todayTotalOutput)}</span>
            <span className="stat-label">今日产出星源币</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{totalOutput}</span>
            <span className="stat-label">总产出星源币</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{deployedSlots}/5</span>
            <span className="stat-label">出战位</span>
          </div>
        </div>
      </div>

      {/* 签到弹窗 */}
      {showCheckinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>签到</h3>
            <p>签到成功！获得10积分</p>
            <button onClick={() => setShowCheckinModal(false)}>确定</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
