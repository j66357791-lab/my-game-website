// frontend/src/components/MysteryCard/TaskCenter.js - 修复版
import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useMysteryCard } from '../../contexts/MysteryCardContext';

const TaskCenter = ({ onClose }) => {
  // 🔧 修复1：直接从 Context 解构出独立的 todayWins 变量
  const { user, updateUser, todayWins } = useUser();
  const { gameState } = useMysteryCard();
  
  // 每日任务数据
  const [dailyTasks, setDailyTasks] = useState([
    { id: 1, name: '当日赢取10000积分', target: 10000, reward: 88, completed: false, claimed: false },
    { id: 2, name: '当日赢取50000积分', target: 50000, reward: 588, completed: false, claimed: false },
    { id: 3, name: '当日赢取200000积分', target: 200000, reward: 2888, completed: false, claimed: false },
    { id: 4, name: '当日赢取1000000积分', target: 1000000, reward: 8888, completed: false, claimed: false }
  ]);

  // 当前选中的任务类型
  const [activeTab, setActiveTab] = useState('daily');

  // 检查任务完成状态
  useEffect(() => {
    if (!gameState || !user) return;

    const today = new Date().toDateString();
    const lastCheckDate = localStorage.getItem('taskCheckDate');
    
    // 如果是新的一天，重置任务
    if (lastCheckDate !== today) {
      setDailyTasks(prev => prev.map(task => ({
        ...task,
        completed: false,
        claimed: false
      })));
      localStorage.setItem('taskCheckDate', today);
    }

    // 🔧 修复2：使用独立的 todayWins 变量，而不是 user.todayWins
    setDailyTasks(prev => prev.map(task => {
      const progress = todayWins || 0; // 修改点
      const isCompleted = progress >= task.target;
      return {
        ...task,
        completed: isCompleted,
        claimed: isCompleted && task.claimed
      };
    }));
    // 🔧 修复3：依赖项中加入 todayWins
  }, [gameState, user, todayWins]);

  // 领取奖励
  const claimReward = (taskId) => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task || !task.completed || task.claimed) return;

    // 更新用户积分
    const newPoints = user.points + task.reward;
    updateUser({ points: newPoints });
    
    // 标记为已领取
    setDailyTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, claimed: true } : t
    ));
    
    // 保存到本地存储
    const claimedTasks = JSON.parse(localStorage.getItem('claimedTasks') || '[]');
    claimedTasks.push(taskId);
    localStorage.setItem('claimedTasks', JSON.stringify(claimedTasks));
  };

  // 获取当前显示的任务
  const getCurrentTasks = () => {
    switch (activeTab) {
      case 'daily':
        return dailyTasks;
      case 'weekly':
      case 'monthly':
      case 'yearly':
        return [{ name: '该功能正在开发中，敬请期待！', completed: false, claimed: false }];
      default:
        return dailyTasks;
    }
  };

  return (
    <div className="task-center">
      <div className="task-header">
        <h2>任务中心</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="task-tabs">
        <button 
          className={`tab-button ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          每日任务
        </button>
        <button 
          className={`tab-button ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          每周任务
        </button>
        <button 
          className={`tab-button ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          每月任务
        </button>
        <button 
          className={`tab-button ${activeTab === 'yearly' ? 'active' : ''}`}
          onClick={() => setActiveTab('yearly')}
        >
          年度奖励
        </button>
      </div>

      <div className="task-content">
        {getCurrentTasks().map((task, index) => (
          <div key={index} className="task-item">
            {task.name.includes('开发中') ? (
              <div className="coming-soon">
                {task.name}
              </div>
            ) : (
              <>
                <div className="task-info">
                  <span className="task-name">{task.name}</span>
                  <span className="task-reward">
                    奖励: {task.reward} 积分
                  </span>
                </div>
                <div className="task-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      // 🔧 修复4：显示进度时也使用 todayWins
                      style={{ width: `${Math.min(100, (todayWins || 0) / task.target * 100)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {todayWins || 0} / {task.target}
                  </span>
                </div>
                <button 
                  className={`claim-button ${task.completed && !task.claimed ? 'active' : ''}`}
                  onClick={() => claimReward(task.id)}
                  disabled={!task.completed || task.claimed}
                >
                  {task.claimed ? '已领取' : task.completed ? '领取奖励' : '进行中'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskCenter;
