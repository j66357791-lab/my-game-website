// src/components/BottomNavigation/BottomNavigation.js - 更新导航项
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNavigation.css';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/game-center', icon: '🎮', label: '游戏中心' },  // 🆕
    { path: '/blindbox-activity', icon: '🎁', label: '盲盒' },  // 🆕 盲盒活动
    { path: '/mall', icon: '🛍️', label: '商城' },             // 🔄
    { path: '/profile', icon: '👤', label: '个人中心' }        // 🔄
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomNavigation;
