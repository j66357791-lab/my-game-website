// frontend/src/components/MysteryCard/ResultModal.js - 修复版
import React from 'react';

const ResultModal = ({ gameState, onStartNewRound }) => {
  const getWinner = () => {
    const results = {};
    // 安全检查
    if (!gameState || !gameState.generalsCards) return {};

    for (const [general, card] of Object.entries(gameState.generalsCards)) {
      if (card > gameState.lordCard) {
        results[general] = 'win';
      } else if (card === gameState.lordCard) {
        results[general] = 'draw';
      } else {
        results[general] = 'lose';
      }
    }
    return results;
  };

  return (
    <div className="result-modal">
      <div className="modal-content">
        <h2>本轮结果</h2>
        <div className="results">
          {/* 🔧 修复：使用 Object.entries 遍历对象 */}
          {Object.entries(getWinner()).map(([general, result]) => (
            <div key={general} className={`result-item ${result}`}>
              {general}: {result === 'win' ? '胜利' : result === 'draw' ? '平局' : '失败'}
            </div>
          ))}
        </div>
        <button onClick={onStartNewRound}>
          开始下一轮
        </button>
      </div>
    </div>
  );
};

export default ResultModal;
