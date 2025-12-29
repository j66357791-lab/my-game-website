import React, { useState, useEffect } from 'react';
import './BreakthroughModal.css';

const BreakthroughModal = ({ isVisible, currentRealm, currentLevel, currentExp, onConfirm, onCancel }) => {
  const [selectedPill, setSelectedPill] = useState(null);

  useEffect(() => {
    if (isVisible) setSelectedPill(null);
  }, [isVisible]);

  if (!isVisible) return null;

  // 假设的丹药数据，实际应从后端获取或配置
  const pills = [
    { id: 'NORMAL', name: '普通洗髓丹', bonus: 0.05 },
    { id: 'GOOD', name: '优秀洗髓丹', bonus: 0.10 },
    { id: 'MYTH', name: '神话洗髓丹', bonus: 0.40 }
  ];

  const baseRate = 0.6;
  const bonusRate = selectedPill ? selectedPill.bonus : 0;
  const totalRate = baseRate + bonusRate;
  const successPercent = Math.min(totalRate * 100, 100).toFixed(0);

  return (
    <div className="breakthrough-modal-overlay" onClick={onCancel}>
      <div className="breakthrough-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚡ 境界突破</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="current-status">
            <div className="realm-badge current">{currentRealm}</div>
            <div className="arrow">↓</div>
            <div className="realm-badge next">飞升</div>
          </div>

          <div className="success-rate-section">
            <div className="rate-label">突破成功率</div>
            <div className="rate-bar-container">
              <div 
                className="rate-bar-fill" 
                style={{ width: `${successPercent}%` }}
              ></div>
            </div>
            <div className="rate-text">{successPercent}%</div>
          </div>

          <div className="warning-box">
            <span className="warning-icon">⚠️</span>
            <span>失败惩罚：扣除 20,000 灵气</span>
          </div>

          <div className="pills-selector">
            <h4>选择洗髓丹 (可选)</h4>
            <div className="pills-list">
              <div className={`pill-item ${!selectedPill ? 'selected' : ''}`} onClick={() => setSelectedPill(null)}>
                <div className="pill-name">无辅助</div>
                <div className="pill-bonus">+0%</div>
              </div>
              {pills.map(p => (
                <div key={p.id} className={`pill-item ${selectedPill?.id === p.id ? 'selected' : ''}`} onClick={() => setSelectedPill(p)}>
                  <div className="pill-name">{p.name}</div>
                  <div className="pill-bonus">+{p.bonus * 100}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>再修修</button>
          <button className="btn-confirm" onClick={() => onConfirm(selectedPill)}>
            确认突破
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreakthroughModal;
