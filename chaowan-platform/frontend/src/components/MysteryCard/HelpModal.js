// frontend/src/components/MysteryCard/HelpModal.js
import React, { useState } from 'react';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose, gameState }) => {
  const [activeTab, setActiveTab] = useState('rules');

  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>游戏帮助</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="help-modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            📜 游戏规则
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📊 历史记录
          </button>
        </div>

        <div className="help-modal-body">
          {activeTab === 'rules' && (
            <div className="rules-content">
              <h3>游戏规则</h3>
              <ul>
                <li>每轮游戏开始时，系统会随机生成一张领主卡牌</li>
                <li>四位战将（东、南、西、北）也会随机生成卡牌</li>
                <li>玩家可以对自己认为会赢的战将进行下注</li>
                <li>下注时间结束后，系统会揭示所有卡牌</li>
                <li>战将卡牌大于领主卡牌即为获胜</li>
                <li>获胜的战将下注金额翻倍，失败则失去下注金额</li>
                <li>相同时为平局，返还下注金额</li>
              </ul>
              
              <h3>卡牌大小</h3>
              <p>A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2</p>
              
              <h3>下注说明</h3>
              <ul>
                <li>最小下注金额：1积分</li>
                <li>最大下注金额：1000积分</li>
                <li>可以同时对多个战将下注</li>
              </ul>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-content">
              <h3>游戏历史</h3>
              {gameState.gameHistory && gameState.gameHistory.length > 0 ? (
                <div className="history-list">
                  {gameState.gameHistory.map((record, index) => (
                    <div key={index} className="history-item">
                      <div className="history-header">
                        <span className="round-number">第 {record.round} 轮</span>
                        <span className="history-time">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="history-details">
                        <div className="card-result">
                          <span>领主: {record.lordCard}</span>
                        </div>
                        <div className="generals-result">
                          {Object.entries(record.generalsCards).map(([position, card]) => (
                            <span key={position} className="general-result">
                              {position === 'east' ? '东' : 
                               position === 'south' ? '南' : 
                               position === 'west' ? '西' : '北'}: {card}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-history">暂无游戏记录</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
