import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Fireworks from '../Fireworks/Fireworks';
import './BottomNavigation.css';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fireworks, setFireworks] = useState({ show: false, position: { x: 0, y: 0 } });

  // 🔥 临时使用在线图片，确保构建通过
  const navItems = [
    { 
      path: '/', 
      label: '首页',
      icon: 'https://cdn-icons-png.flaticon.com/24/25/25694.png'
    },
    { 
      path: '/game-center', 
      label: '游戏中心',
      icon: 'https://cdn-icons-png.flaticon.com/24/4144/4144755.png'
    },
    { 
      path: '/mall', 
      label: '商城',
      icon: 'https://cdn-icons-png.flaticon.com/24/3081/3081559.png'
    },
    { 
      path: '/profile', 
      label: '个人中心',
      icon: 'https://cdn-icons-png.flaticon.com/24/149/149071.png'
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
