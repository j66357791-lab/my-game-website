// src/components/BottomNavigation/BottomNavigation.js - 手机端优化版
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import './BottomNavigation.css';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, points, cashBalance } = useUser();
  const [activeTab, setActiveTab] = useState('');

  // 🎯 手机端4个导航项 - 简洁设计
  const navItems = [
    { 
      id: 'home', 
      name: '首页', 
      icon: '🏠', 
      path: '/home',
      description: '返回首页'
    },
    { 
      id: 'game-center', 
      name: '游戏', 
      icon: '🎮', 
      path: '/game-center',
      description: '游戏中心'
    },
    { 
      id: 'mall', 
      name: '商城', 
      icon: '🛍️', 
      path: '/mall',
      description: '商城购物'
    },
    { 
      id: 'profile', 
      name: '我的', 
      icon: '👤', 
      path: '/profile',
      description: '个人中心'
    }
  ];

  // 检查活跃标签
  useEffect(() => {
    const currentTab = navItems.find(item => 
      location.pathname === item.path || 
      location.pathname.startsWith(item.path + '/')
    );
    setActiveTab(currentTab?.id || '');
  }, [location.pathname]);

  // 处理导航点击
  const handleNavClick = (item) => {
    // 移动端震动反馈
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
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
              title={item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.name}</span>
              {isActive && <div className="active-indicator" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
