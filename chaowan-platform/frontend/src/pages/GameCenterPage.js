// src/pages/GameCenterPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom'; // 添加 useNavigate
import './GameCenterPage.css';

const GameCenterPage = ({ user, onUpdateUser }) => {
  const navigate = useNavigate(); // 添加 navigate

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
      name: '娃娃对战',
      icon: '⚔️',
      description: '策略对战，展示你的娃娃实力',
      status: 'coming-soon',
      reward: '荣誉/积分'
    },
    {
      id: 4,
      name: '合成工坊',
      icon: '🔬',
      description: '合成低级娃娃，获得高级藏品',
      status: 'coming-soon',
      reward: '高级娃娃'
    },
    // 新增：龟兔赛跑游戏
    {
      id: 5,
      name: '龟兔赛跑',
      icon: '🐢🐰',
      description: '50%概率获胜，赢取1.9倍奖励',
      status: 'available',
      reward: '1.9倍率'
    }
  ];

  // 处理游戏点击
  const handleGameClick = (gameId) => {
    switch(gameId) {
      case 5: // 龟兔赛跑
        navigate('/turtle-rabbit-race');
        break;
      default:
        // 其他游戏可以添加对应的路由
        console.log(`开始游戏: ${gameId}`);
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
          <div key={game.id} className={`game-card ${game.status}`}>
            <div className="game-icon">{game.icon}</div>
            <div className="game-info">
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <div className="game-reward">奖励：{game.reward}</div>
            </div>
            <button 
              className={`game-btn ${game.status}`}
              disabled={game.status === 'coming-soon'}
              onClick={() => handleGameClick(game.id)}
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
              <h4>幸运转盘1次</h4>
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
