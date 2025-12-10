import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Fireworks from '../Fireworks/Fireworks';
import './BottomNavigation.css';

// 🔥 使用绝对路径，从项目根目录开始
import homeIcon from '/src/chaowan-platform/frontend/src/assets/nav-icons/home.png';
import gameIcon from '/src/chaowan-platform/frontend/src/assets/nav-icons/game.png';
import shopIcon from '/src/chaowan-platform/frontend/src/assets/nav-icons/shop.png';
import profileIcon from '/src/chaowan-platform/frontend/src/assets/nav-icons/profile.png';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fireworks, setFireworks] = useState({ show: false, position: { x: 0, y: 0 } });

  const navItems = [
    { 
      path: '/', 
      label: '首页',
      icon: homeIcon
    },
    { 
      path: '/game-center', 
      label: '游戏中心',
      icon: gameIcon
    },
    { 
      path: '/mall', 
      label: '商城',
      icon: shopIcon
    },
    { 
      path: '/profile', 
      label: '个人中心',
      icon: profileIcon
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
