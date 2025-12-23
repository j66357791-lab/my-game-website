// src/pages/HomePage.js - 完整可爱风格版
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import GlobalLoader from '../components/GlobalLoader';
import { playSound, addSoundToElement } from '../utils/cuteSoundEffects';
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
  const [activeButton, setActiveButton] = useState(null);
  
  // 使用 ref 引用 DOM 元素
  const heroButtonRef = useRef(null);
  const quickAccessItemsRef = useRef([]);
  const projectCardsRef = useRef([]);
  const statItemsRef = useRef([]);
  const modalButtonRef = useRef(null);
  
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

  // 初始化音效绑定
  useEffect(() => {
    // 为所有交互元素绑定音效
    const allButtons = document.querySelectorAll('.hero-button, .quick-access-item, .project-card, .stat-item, .modal-content button');
    
    allButtons.forEach(button => {
      button.addEventListener('click', () => {
        playSound('click');
        
        // 添加视觉反馈
        button.classList.add('sound-feedback-click');
        setTimeout(() => {
          button.classList.remove('sound-feedback-click');
        }, 300);
      });
    });

    // 为快速访问项目添加悬停音效
    const quickItems = document.querySelectorAll('.quick-access-item');
    quickItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        playSound('focus');
      });
    });

    // 为项目卡片添加悬停音效
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        playSound('focus');
      });
    });

    // 清理函数
    return () => {
      allButtons.forEach(button => {
        button.removeEventListener('click', () => {});
      });
      quickItems.forEach(item => {
        item.removeEventListener('mouseenter', () => {});
      });
      projectCards.forEach(card => {
        card.removeEventListener('mouseenter', () => {});
      });
    };
  }, []);

  // 刷新用户数据
  const refreshUserData = useCallback(async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      setError('');
      playSound('switch');
      
      // 模拟刷新延迟
      setTimeout(() => {
        setRefreshing(false);
        playSound('success');
      }, 800);
      
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      setError(error.message);
      playSound('error');
    }
  }, [refreshing]);

  // 处理按钮点击
  const handleButtonClick = useCallback((action, buttonName) => {
    setActiveButton(buttonName);
    
    // 播放不同的音效
    switch(action) {
      case 'blindBox':
        playSound('popup');
        setTimeout(() => navigate('/blindBox-activity'), 300);
        break;
      case 'dollCenter':
        playSound('success');
        setTimeout(() => navigate('/doll-center'), 300);
        break;
      default:
        playSound('switch');
        setTimeout(() => alert('正在开发中，敬请期待'), 200);
    }
    
    // 重置活动按钮状态
    setTimeout(() => setActiveButton(null), 500);
  }, [navigate]);

  // 处理项目卡片点击
  const handleProjectClick = useCallback((projectId) => {
    playSound('reward');
    // 这里可以添加具体的项目处理逻辑
    console.log(`点击了项目: ${projectId}`);
  }, []);

  // 处理收益展示点击
  const handleStatClick = useCallback((statType) => {
    playSound('reward');
    // 这里可以添加统计数据的详细查看逻辑
    console.log(`查看${statType}详情`);
  }, []);

  // 显示签到模态框
  const showCheckin = useCallback(() => {
    playSound('popup');
    setShowCheckinModal(true);
  }, []);

  // 关闭模态框
  const closeModal = useCallback(() => {
    playSound('click');
    setShowCheckinModal(false);
  }, []);

  // 如果正在加载，显示骨架屏
  if (isInitialLoading) {
    return <GlobalLoader text="加载用户数据中..." />;
  }

  return (
    <div className="home-page">
      {/* 背景装饰 */}
      <div className="background-decorations">
        <div className="decoration bubble1">🎈</div>
        <div className="decoration bubble2">✨</div>
        <div className="decoration bubble3">💖</div>
        <div className="decoration bubble4">🍭</div>
      </div>

      {/* 下拉刷新 */}
      <div 
        className={`pull-refresh ${refreshing ? 'refreshing' : ''}`} 
        onClick={refreshUserData}
      >
        {refreshing ? (
          <div className="refresh-loading">
            <span className="loading-dot"></span>
            <span className="loading-dot"></span>
            <span className="loading-dot"></span>
          </div>
        ) : (
          '🔄 下拉刷新'
        )}
      </div>

      {/* 错误提示 */}
      {(error || globalError) && (
        <div className="error-message">
          <p>❌ {error || globalError}</p>
          <button 
            onClick={() => { 
              setError(''); 
              setGlobalError('');
              playSound('click');
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* 🎯 顶部宣传横幅 */}
      <div className="hero-section">
        <div className="hero-content">
          <h2>开启幸运盲盒，获得娃娃！</h2>
          <p className="hero-subtitle">每一件都藏着惊喜，等你来发现！✨</p>
          <button 
            ref={heroButtonRef}
            className={`hero-button ${activeButton === 'blindBox' ? 'active' : ''}`}
            onClick={() => handleButtonClick('blindBox', 'blindBox')}
          >
            立即开启 <span>🎁</span>
          </button>
        </div>
      </div>

      {/* 🎯 中部快捷入口区 */}
      <div className="quick-access-section">
        <div className="section-title">
          <span>🎯</span> 快速入口
        </div>
        <div className="quick-access-grid">
          {[
            { icon: '🎁', label: '活动', action: 'blindBox', name: 'activity' },
            { icon: '🧸', label: '娃娃中心', action: 'dollCenter', name: 'dollCenter' },
            { icon: '⏰', label: '限时活动', action: 'other', name: 'timedEvent' },
            { icon: '🧮', label: '数学藏品', action: 'other', name: 'mathCollection' },
            { icon: '🏆', label: '好物拍卖', action: 'other', name: 'auction' }
          ].map((item, index) => (
            <button 
              key={index}
              ref={el => quickAccessItemsRef.current[index] = el}
              className={`quick-access-item ${activeButton === item.name ? 'active' : ''}`}
              onClick={() => handleButtonClick(item.action, item.name)}
            >
              <div className="icon">{item.icon}</div>
              <div className="label">{item.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 🎯 热门项目展示区 */}
      <div className="hot-projects-section">
        <div className="section-title">
          <span>🔥</span> 热门项目
        </div>
        <div className="projects-grid">
          {[
            { 
              id: 1, 
              icon: '🧸', 
              title: '招募员工', 
              description: '开启盲盒，获得属于自己的数字Npc',
              price: '30',
              tag: '热'
            },
            { 
              id: 2, 
              icon: '💎', 
              title: '靓号选购', 
              description: '专属邀请码',
              price: '300起',
              tag: '热'
            },
            { 
              id: 3, 
              icon: '💰', 
              title: '购买宝石', 
              description: '消耗金钥匙，随机抽取宝石、初级工人和减税卡',
              price: '50',
              tag: '预告'
            }
          ].map((project, index) => (
            <div 
              key={project.id}
              ref={el => projectCardsRef.current[index] = el}
              className="project-card"
              onClick={() => {
                handleProjectClick(project.id);
                handleButtonClick('other', `project-${project.id}`);
              }}
            >
              <div className="project-image">
                <span className="project-icon">{project.icon}</span>
              </div>
              <div className="project-content">
                <h4>{project.title}</h4>
                <p>{project.description}</p>
                <div className="project-price">{project.price}</div>
              </div>
              <div className="project-tag">{project.tag}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 🎯 用户收益展示 */}
      <div className="user-stats-section">
        <div className="section-title">
          <span>📊</span> 我的收益
        </div>
        <div className="stats-grid">
          {[
            { 
              value: safeToLocaleString(todayTotalOutput), 
              label: '今日产出星源币',
              type: 'today'
            },
            { 
              value: totalOutput, 
              label: '总产出星源币',
              type: 'total'
            },
            { 
              value: `${deployedSlots}/5`, 
              label: '出战位',
              type: 'slots'
            }
          ].map((stat, index) => (
            <div 
              key={index}
              ref={el => statItemsRef.current[index] = el}
              className="stat-item"
              onClick={() => handleStatClick(stat.type)}
            >
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="bottom-actions">
        <button 
          className="action-button checkin-button"
          onClick={showCheckin}
        >
          <span className="action-icon">📅</span>
          <span className="action-label">每日签到</span>
        </button>
        <button 
          className="action-button task-button"
          onClick={() => {
            playSound('switch');
            alert('任务功能即将上线！');
          }}
        >
          <span className="action-icon">✅</span>
          <span className="action-label">每日任务</span>
        </button>
      </div>

      {/* 签到弹窗 */}
      {showCheckinModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎉 每日签到</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="checkin-animation">
                <div className="checkin-icon">🎁</div>
                <div className="checkin-text">签到成功！</div>
                <div className="checkin-reward">+10 积分</div>
              </div>
              <p>连续签到有更多奖励哦！</p>
            </div>
            <div className="modal-footer">
              <button 
                ref={modalButtonRef}
                className="modal-button"
                onClick={closeModal}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;