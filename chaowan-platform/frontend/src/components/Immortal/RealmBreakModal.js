import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './RealmBreakModal.css';

const RealmBreakModal = ({ doll, onClose, onDollUpdate }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null); // 'success' | 'fail' | null

  const handleBreakthrough = async () => {
    setIsSpinning(true);
    setResult(null);

    // 模拟 2秒 的旋转动画等待
    setTimeout(async () => {
      try {
        // 暂时不传洗髓丹，走基础 60% 概率
        const res = await api.post('/immortal/breakthrough');
        
        if (res.success) {
          setResult('success');
          setTimeout(() => {
            onDollUpdate(res.data.doll);
            if (onClose) onClose();
          }, 1500);
        } else {
          // 业务上的失败（突破失败，但接口返回200）
          setResult('fail');
          onDollUpdate(res.data.doll);
        }
      } catch (error) {
        alert(error.message || '突破异常');
        setIsSpinning(false);
      }
    }, 2000);
  };

  return (
    <div className="break-modal-overlay">
      <div className="break-modal-container">
        <div className="break-header">
          <span>境界突破</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="break-content">
          <div className={`break-circle ${isSpinning ? 'spinning' : ''}`}>
            {isSpinning ? (
              <div className="spinning-text">渡劫中...</div>
            ) : result === 'success' ? (
              <div className="result-icon success">🎉</div>
            ) : result === 'fail' ? (
              <div className="result-icon fail">💔</div>
            ) : (
              <div className="realm-arrow">
                <span className="current-realm">{doll.realm}</span>
                <span className="arrow">➔</span>
                <span className="next-realm highlight">练气</span>
              </div>
            )}
          </div>

          {!isSpinning && !result && (
            <div className="break-info">
              <p>凡人十级圆满，渡劫成功率 60%</p>
              <p>失败扣除 20000 灵气</p>
            </div>
          )}

          {result === 'success' && (
            <div className="break-message success">突破成功！境界提升！</div>
          )}
          {result === 'fail' && (
            <div className="break-message fail">突破失败，请再接再厉...</div>
          )}
        </div>

        {!isSpinning && !result && (
          <button className="break-btn-main" onClick={handleBreakthrough}>
            开始渡劫
          </button>
        )}
        
        {result === 'fail' && (
            <button className="break-btn-main" onClick={onClose}>
                关闭
            </button>
        )}
      </div>
    </div>
  );
};

export default RealmBreakModal;
