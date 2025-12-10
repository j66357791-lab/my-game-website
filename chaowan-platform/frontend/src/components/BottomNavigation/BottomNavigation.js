import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Fireworks from '../Fireworks/Fireworks';
import './BottomNavigation.css';

// 🔥 1. 先导入图片（在组件外部导入）
import homeIcon from '../assets/nav-icons/home.png';
import gameIcon from '../assets/nav-icons/game.png';
import shopIcon from '../assets/nav-icons/shop.png';
import profileIcon from '../assets/nav-icons/profile.png';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fireworks, setFireworks] = useState({ show: false, position: { x: 0, y: 0 } });

  // 🔥 2. 使用导入的变量（在组件内部使用）
  const navItems = [
    { 
      path: '/', 
      label: '首页',
      icon: homeIcon  // 使用上面导入的 homeIcon 变量
    },
    { 
      path: '/game-center', 
      label: '游戏中心',
      icon: gameIcon  // 使用上面导入的 gameIcon 变量
    },
    { 
      path: '/mall', 
      label: '商城',
      icon: shopIcon  // 使用上面导入的 shopIcon 变量
    },
    { 
      path: '/profile', 
      label: '个人中心',
      icon: profileIcon  // 使用上面导入的 profileIcon 变量
    }
  ];

  const handleNavClick = (path, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    setFireworks({ show: true, position: { x, y } });
    navigate(path);
    
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
