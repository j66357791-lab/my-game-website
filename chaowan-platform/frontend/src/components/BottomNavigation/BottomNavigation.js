// src/components/BottomNavigation/BottomNavigation.js - 完整增强版
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import './BottomNavigation.css';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, points, cashBalance } = useUser();
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState('');

  // 🎯 5个导航项配置 - 增强版
  const navItems = [
    { 
      id: 'home', 
      name: '首页', 
      icon: '🏠', 
      path: '/home',
      badge: null,
      description: '返回首页'
    },
    { 
      id: 'doll-center', 
      name: '娃娃中心', 
      icon: '🧸', 
      path: '/doll-center',
      badge: null,
      description: '管理你的娃娃'
    },
    { 
      id: 'game-center', 
      name: '游戏中心', 
      icon: '🎮', 
      path: '/game-center',
      badge: 'hot',
      description: '更多游戏玩法'
    },
    { 
      id: 'mall', 
      name: '商城', 
      icon: '🛍️', 
      path: '/mall',
      badge: 'new',
      description: '购买娃娃和道具'
    },
    { 
      id: 'profile', 
      name: '我的', 
      icon: '👤', 
      path: '/profile',
      badge: hasNewNotifications ? '!' : null,
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

  // 检查新通知
  useEffect(() => {
    // 模拟检查新通知
    const checkNotifications = () => {
      // 这里可以调用API检查是否有新通知
      const hasNew = Math.random() > 0.8; // 模拟20%概率有新通知
      setHasNewNotifications(hasNew);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 30000); // 每30秒检查一次
    return () => clearInterval(interval);
  }, []);

  // 处理导航点击
  const handleNavClick = (item) => {
    // 添加点击反馈
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(50); // 震动反馈50ms
    }

    // 记录用户行为
    console.log(`📍 用户导航到: ${item.name} (${item.path})`);
    
    // 执行导航
    navigate(item.path);
  };

  // 长按处理
  const handleLongPress = (item, e) => {
    e.preventDefault();
    
    // 显示快捷菜单
    const quickActions = {
      'home': ['刷新', '设置'],
      'doll-center': ['快速出战', '娃娃图鉴'],
      'game-center': ['每日任务', '活动中心'],
      'mall': ['限时优惠', '充值中心'],
      'profile': ['切换账号', '退出登录']
    };

    const actions = quickActions[item.id] || [];
    if (actions.length > 0) {
      // 这里可以显示一个快捷菜单
      console.log(`📋 ${item.name} 快捷操作:`, actions);
      alert(`${item.name} 快捷操作:\n${actions.join('\n')}`);
    }
  };

  // 获取徽章内容
  const getBadgeContent = (badge) => {
    switch (badge) {
      case 'hot': return '🔥';
      case 'new': return '✨';
      case '!': return '!';
      default: return badge;
    }
  };

  return (
    <div className="bottom-navigation">
      {/* 装饰性背景元素 */}
      <div className="nav-background">
        <div className="nav-gradient"></div>
        <div className="nav-pattern"></div>
      </div>

      {/* 导航项容器 */}
      <div className="nav-container">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const hasBadge = item.badge !== null;
          
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''} ${hasBadge ? 'has-badge' : ''}`}
              onClick={() => handleNavClick(item)}
              onContextMenu={(e) => handleLongPress(item, e)}
              title={item.description}
              aria-label={`${item.name} - ${item.description}`}
            >
              {/* 图标容器 */}
              <div className="nav-icon-container">
                <span className={`nav-icon ${isActive ? 'active' : ''}`}>
                  {item.icon}
                </span>
                
                {/* 活跃状态指示器 */}
                {isActive && (
                  <div className="active-indicator">
                    <div className="indicator-dot"></div>
                  </div>
                )}
                
                {/* 徽章 */}
                {hasBadge && (
                  <div className="nav-badge">
                    <span className="badge-content">
                      {getBadgeContent(item.badge)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 标签 */}
              <span className={`nav-label ${isActive ? 'active' : ''}`}>
                {item.name}
              </span>
              
              {/* 波纹效果 */}
              <div className="ripple-effect"></div>
            </button>
          );
        })}
      </div>

      {/* 快捷操作提示 */}
      <div className="nav-hint">
        <span>长按查看更多选项</span>
      </div>

      {/* 用户信息悬浮提示 */}
      {(points !== undefined || cashBalance !== undefined) && (
        <div className="user-info-tooltip">
          {points !== undefined && (
            <div className="info-item">
              <span className="info-icon">💰</span>
              <span className="info-value">{points.toLocaleString()}</span>
            </div>
          )}
          {cashBalance !== undefined && (
            <div className="info-item">
              <span className="info-icon">💵</span>
              <span className="info-value">¥{parseFloat(cashBalance).toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BottomNavigation;
