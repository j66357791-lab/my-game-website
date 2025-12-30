import React, { useState } from 'react';
import api from '../../config/api';
import './AttributeAllocation.css';

const AttributeAllocation = ({ doll, onDollUpdate }) => {
  const [loadingType, setLoadingType] = useState(null);

  // ✅ 完整属性映射，包括暴击和闪避
  const attrMap = {
    attack: { name: '攻击力', icon: '⚔️', desc: '提升战斗力' },
    health: { name: '生命值', icon: '❤️', desc: '增加生存' },
    defense: { name: '防御力', icon: '🛡️', desc: '减少伤害' },
    aptitude: { name: '资质', icon: '✨', desc: '额外加成' },
    critRate: { name: '暴击率', icon: '💥', desc: '致命一击' }, // ✅ 开启
    dodgeRate: { name: '闪避率', icon: '💨', desc: '身法敏捷' }  // ✅ 开启
  };

  const handleAddPoint = async (type) => {
    if (doll.availableAttributePoints <= 0) return;
    if (loadingType) return;

    setLoadingType(type);
    try {
      const res = await api.post('/immortal/allocate-attribute', { attributeType: type });
      if (res.success) {
        onDollUpdate(res.data.doll);
      }
    } catch (error) {
      alert(error.message || '加点失败');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="attribute-panel">
      <div className="points-info">
        <div className="points-box">
          <span className="points-count">{doll.availableAttributePoints}</span>
          <span className="points-label">可用属性点</span>
        </div>
      </div>

      <div className="attrs-grid">
        {Object.keys(attrMap).map(key => (
          <div key={key} className="attr-card">
            <div className="attr-header">
              <span className="attr-icon">{attrMap[key].icon}</span>
              <span className="attr-name">{attrMap[key].name}</span>
            </div>
            <div className="attr-value">{doll.baseAttributes[key] || 0}</div>
            
            {doll.availableAttributePoints > 0 ? (
              <button 
                className={`add-btn ${loadingType === key ? 'loading' : ''}`}
                onClick={() => handleAddPoint(key)}
                disabled={loadingType !== null}
              >
                +
              </button>
            ) : (
              <div className="add-btn disabled" style={{opacity: 0.3}}>+</div>
            )}
          </div>
        ))}
      </div>

      <div className="combat-summary">
        <span>当前战力: </span>
        <span className="power-value">{doll.combatPower}</span>
      </div>
    </div>
  );
};

export default AttributeAllocation;
