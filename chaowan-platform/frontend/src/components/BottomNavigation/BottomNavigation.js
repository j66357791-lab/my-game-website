import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Fireworks from '../Fireworks/Fireworks';
import './BottomNavigation.css';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fireworks, setFireworks] = useState({ show: false, position: { x: 0, y: 0 } });

  const navItems = [
    { 
      path: '/', 
      label: '首页',
      icon: '/images/nav-icons/home.png'
    },
    { 
      path: '/game-center', 
      label: '游戏中心',
      icon: '/images/nav-icons/game.png'
    },
    { 
      path: '/mall', 
      label: '商城',
      icon: '/images/nav-icons/shop.png'
    },
    { 
      path: '/profile', 
      label: '个人中心',
      icon: '/images/nav-icons/profile.png'
    }
  ];

  const handleNavClick = (path, event) => {
    // 获取点击位置
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // 触发烟花效果
    setFireworks({ show: true, position: { x, y } });
    
    // 导航到目标页面
    navigate(path);
    
    // 1秒后清除烟花效果
    setTimeout(() => {
      setFireworks({ show: false, position: { x: 0, y: 0 } });
    }, 1000);
  };

  return (
    <>
      <div className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={(e) => handleNavClick(item.path, e)}
          >
            <div className="icon-wrapper">
              <img 
                src={item.icon} 
                alt={item.label}
                className="nav-icon"
              />
              {location.pathname === item.path && (
                <div className="active-glow" />
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
      <Fireworks 
        trigger={fireworks.show} 
        position={fireworks.position} 
      />
    </>
  );
};

export default BottomNavigation;
