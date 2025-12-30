// src/components/BottomNavigation/BottomNavigation.js - 修仙版
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import './BottomNavigation.css';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, points, cashBalance } = useUser();
  const [activeTab, setActiveTab] = useState('');

  const navItems = [
    { 
      id: 'home', 
      name: '首页', 
      icon: '🏠', 
      path: '/home',
    },
    { 
      id: 'game-center', 
      name: '游戏', 
      icon: '🎮', 
      path: '/game-center',
    },
    // ✅ 新增：修仙入口 (放在中间)
    { 
      id: 'immortal', 
      name: '修仙', 
      icon: '仙', 
      path: '/immortal-game',
      isCenter: true // 标记为中间按钮
    },
    { 
      id: 'mall', 
      name: '商城', 
      icon: '🛍️', 
      path: '/mall',
    },
    { 
      id: 'profile', 
      name: '我的', 
      icon: '👤', 
      path: '/profile',
    }
  ];

  useEffect(() => {
    const currentTab = navItems.find(item => 
      location.pathname === item.path || 
      location.pathname.startsWith(item.path + '/')
    );
    setActiveTab(currentTab?.id || '');
  }, [location.pathname]);

  const handleNavClick = (item) => {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(30);
    }
    navigate(item.path);
  };

  return (
    <div className="bottom-navigation">
      <div className="nav-container">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''} ${item.isCenter ? 'center-fab' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              {/* 如果是中间按钮，渲染特殊的结构 */}
              {item.isCenter ? (
                <div className="fab-content">
                  <span className="nav-icon-fairy">{item.icon}</span>
                  <div className="glow-effect"></div>
                </div>
              ) : (
                <>
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.name}</span>
                  {isActive && <div className="active-indicator" />}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
