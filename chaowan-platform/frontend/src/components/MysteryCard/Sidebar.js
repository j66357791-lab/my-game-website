// frontend/src/components/MysteryCard/Sidebar.js
import React from 'react';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>游戏信息</h2>
      </div>
      <div className="sidebar-content">
        <div className="game-rules">
          <h3>游戏规则</h3>
          <ul>
            <li>领主卡牌 vs 战将卡牌</li>
            <li>点数大的获胜</li>
            <li>下注赢取积分</li>
          </ul>
        </div>
        <div className="game-history">
          <h3>历史记录</h3>
          {/* 历史记录将在这里显示 */}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
