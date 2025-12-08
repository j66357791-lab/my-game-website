import React, { useState, useEffect } from 'react';
import './ExchangeModal.css';
import blindBoxService from '../../services/blindBoxService';

const ExchangeModal = ({ onClose, collectedChars, onExchangeSuccess }) => {
  const [selectedChars, setSelectedChars] = useState([]);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState('');
  const [availableRewards, setAvailableRewards] = useState([]);

  // 奖励配置
  const rewardConfig = [
    { id: 'single', name: '单字兑换', chars: 1, amount: 0.88, description: '选择任意单个字符' },
    { id: 'neice', name: '内测红包', chars: ['内', '测'], amount: 1.58, description: '内+测' },
    { id: 'hongbao', name: '红包奖励', chars: ['红', '包'], amount: 3.88, description: '红+包' },
    { id: 'tiantianling', name: '天天领红包', chars: ['天', '天', '领'], amount: 2.88, description: '天+天+领' },
    { id: 'neicehongbao', name: '内测红包大礼包', chars: ['内', '测', '红', '包'], amount: 5.88, description: '内+测+红+包' },
    { id: 'quanji', name: '全集大红包', chars: ['内', '测', '红', '包', '天', '天', '领'], amount: 9.88, description: '全部字符' }
  ];

  // 检查可兑换的奖励
  useEffect(() => {
    const checkAvailableRewards = () => {
      const available = [];
      
      // 检查单字兑换
      if (collectedChars.length > 0) {
        available.push(rewardConfig[0]);
      }
      
      // 检查其他组合
      const charCounts = {};
      collectedChars.forEach(char => {
        charCounts[char] = (charCounts[char] || 0) + 1;
      });
      
      rewardConfig.slice(1).forEach(reward => {
        if (Array.isArray(reward.chars)) {
          const canExchange = reward.chars.every(char => {
            return charCounts[char] >= reward.chars.filter(c => c === char).length;
          });
          if (canExchange) {
            available.push(reward);
          }
        }
      });
      
      setAvailableRewards(available);
    };
    
    checkAvailableRewards();
  }, [collectedChars]);

  // 选择字符
  const toggleCharSelection = (char) => {
    const index = selectedChars.indexOf(char);
    if (index > -1) {
      setSelectedChars(selectedChars.filter((_, i) => i !== index));
    } else {
      setSelectedChars([...selectedChars, char]);
    }
  };

  // 快速选择奖励组合
  const quickSelectReward = (reward) => {
    if (reward.id === 'single') {
      // 单字兑换，选择第一个字符
      setSelectedChars([collectedChars[0]]);
    } else {
      // 选择指定的字符组合
      setSelectedChars([...reward.chars]);
    }
  };

  // 兑换奖励
  const handleExchange = async () => {
    if (selectedChars.length === 0) {
      setError('请选择要兑换的字符');
      return;
    }

    setIsExchanging(true);
    setError('');

    try {
      const result = await blindBoxService.exchangeReward(selectedChars);
      onExchangeSuccess(result.data);
      setSelectedChars([]);
    } catch (error) {
      setError(error.message || '兑换失败');
    } finally {
      setIsExchanging(false);
    }
  };

  // 获取字符统计
  const getCharStats = () => {
    const stats = {};
    collectedChars.forEach(char => {
      stats[char] = (stats[char] || 0) + 1;
    });
    return stats;
  };

  const charStats = getCharStats();

  return (
    <div className="exchange-modal-overlay">
      <div className="exchange-modal">
        <div className="modal-header">
          <h2>🎁 奖励兑换</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* 我的字符 */}
          <div className="my-chars-section">
            <h3>我的字符</h3>
            <div className="chars-grid">
              {Object.entries(charStats).map(([char, count]) => (
                <div key={char} className="char-item">
                  <span className="char-text">{char}</span>
                  <span className="char-count">×{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 可兑换奖励 */}
          <div className="rewards-section">
            <h3>可兑换奖励</h3>
            <div className="rewards-list">
              {availableRewards.map(reward => (
                <div key={reward.id} className="reward-item">
                  <div className="reward-info">
                    <h4>{reward.name}</h4>
                    <p className="reward-desc">{reward.description}</p>
                    <p className="reward-amount">¥{reward.amount}</p>
                  </div>
                  <button 
                    className="quick-select-btn"
                    onClick={() => quickSelectReward(reward)}
                  >
                    快速选择
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 选择字符 */}
          <div className="selection-section">
            <h3>选择字符兑换</h3>
            <div className="chars-selection">
              {collectedChars.map((char, index) => (
                <button
                  key={index}
                  className={`char-btn ${selectedChars.includes(char) ? 'selected' : ''}`}
                  onClick={() => toggleCharSelection(char)}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>

          {/* 已选择的字符 */}
          {selectedChars.length > 0 && (
            <div className="selected-section">
              <h3>已选择 ({selectedChars.length}个)</h3>
              <div className="selected-chars">
                {selectedChars.map((char, index) => (
                  <span key={index} className="selected-char">{char}</span>
                ))}
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button 
            className="exchange-btn"
            onClick={handleExchange}
            disabled={isExchanging || selectedChars.length === 0}
          >
            {isExchanging ? '兑换中...' : '确认兑换'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeModal;
