// src/pages/GameCenterPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';  // 🔧 添加导航
import './GameCenterPage.css';

const GameCenterPage = ({ user, onUpdateUser }) => {
  const navigate = useNavigate();  // 🔧 添加导航钩子

  const games = [
    {
      id: 1,
      name: '娃娃连连看',
      icon: '🎯',
      description: '经典消除游戏，赢取积分奖励',
      status: 'available',
      reward: '10-50积分'
    },
    {
      id: 2,
      name: '幸运转盘',
      icon: '🎡',
      description: '每日免费转盘，赢取稀有娃娃',
      status: 'available',
      reward: '娃娃/积分'
    },
    {
      id: 3,
      name: '图标大乱斗',  // 🔧 新增游戏
      icon: '🎲',
      description: '下注图标，赢取积分大奖',
      status: 'available',  // 🔧 设置为可用状态
      reward: '10-10000积分'
    },
    {
      id: 4,
      name: '娃娃对战',
      icon: '⚔️',
      description: '策略对战，展示你的娃娃实力',
      status: 'coming-soon',
      reward: '荣誉/积分'
    },
    {
      id: 5,
      name: '合成工坊',
      icon: '🔬',
      description: '合成低级娃娃，获得高级藏品',
      status: 'coming-soon',
      reward: '高级娃娃'
    }
  ];

  // 🔧 新增：处理游戏点击
  const handleGameClick = (game) => {
    if (game.status === 'coming-soon') {
      return;
    }

    switch (game.id) {
      case 3:  // 图标大乱斗
        navigate('/icon-brawl');
        break;
      case 1:  // 娃娃连连看
        // navigate('/doll-match');
        alert('娃娃连连看即将上线！');
        break;
      case 2:  // 幸运转盘
        // navigate('/lucky-wheel');
        alert('幸运转盘即将上线！');
        break;
      default:
        alert('该游戏即将上线！');
    }
  };

  return (
    <div className="game-center-page">
      <div className="page-header">
        <h2>🎮 游戏中心</h2>
        <p>玩游戏，赢奖励，乐趣无穷！</p>
      </div>

      <div className="games-grid">
        {games.map(game => (
          <div 
            key={game.id} 
            className={`game-card ${game.status}`}
            onClick={() => handleGameClick(game)}  // 🔧 添加点击事件
          >
            <div className="game-icon">{game.icon}</div>
            <div className="game-info">
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <div className="game-reward">奖励：{game.reward}</div>
            </div>
            <button 
              className={`game-btn ${game.status}`}
              disabled={game.status === 'coming-soon'}
              onClick={(e) => {
                e.stopPropagation();  // 防止事件冒泡
                handleGameClick(game);
              }}
            >
              {game.status === 'available' ? '开始游戏' : '敬请期待'}
            </button>
          </div>
        ))}
      </div>

      {/* 每日任务区域 */}
      <div className="daily-missions">
        <h3>📅 每日任务</h3>
        <div className="mission-list">
          <div className="mission-item">
            <span className="mission-icon">🎯</span>
            <div className="mission-info">
              <h4>完成3次游戏</h4>
              <p>进度：1/3</p>
            </div>
            <span className="mission-reward">+20积分</span>
          </div>
          <div className="mission-item">
            <span className="mission-icon">🎰</span>
            <div className="mission-info">
              <h4>图标大乱斗1次</h4>  {/* 🔧 更新任务 */}
              <p>进度：0/1</p>
            </div>
            <span className="mission-reward">+10积分</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCenterPage;
