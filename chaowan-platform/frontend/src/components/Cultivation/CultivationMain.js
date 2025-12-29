import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import BreakthroughModal from './BreakthroughModal';
import './CultivationMain.css';

const CultivationMain = ({ user, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBreakthrough, setShowBreakthrough] = useState(false);

  // 获取数据
  const fetchData = async () => {
    try {
      const res = await api.get('/cultivation/data');
      if (res.data.success && res.data.exists) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 领取收益
  const handleClaim = async () => {
    setLoading(true);
    try {
      const res = await api.post('/cultivation/claim');
      if (res.data.success) {
        alert(`修炼完毕！获得 ${res.data.gained} 灵气`);
        if (res.data.levelUpCount > 0) {
          alert(`恭喜升级！连升 ${res.data.levelUpCount} 级`);
        }
        fetchData();
      }
    } catch (e) {
      alert('领取失败');
    } finally {
      setLoading(false);
    }
  };

  // 加点
  const handleAddPoint = async (attr) => {
    if (data.availablePoints <= 0) return;
    try {
      const res = await api.post('/cultivation/allocate', { attr });
      if (res.data.success) {
        fetchData();
      }
    } catch (e) {
      alert('加点失败');
    }
  };

  // 突破
  const handleBreakthroughConfirm = async (pill) => {
    try {
      const res = await api.post('/cultivation/breakthrough', { usePillQuality: pill ? pill.id : null });
      if (res.data.success) {
        alert(`🎉 突破成功！晋升至 ${res.data.newRealm}`);
        setShowBreakthrough(false);
        fetchData();
      } else {
        alert(`💔 ${res.data.message}`);
        setShowBreakthrough(false);
        fetchData();
      }
    } catch (e) {
      alert('突破失败');
    }
  };

  if (!data) return <div className="loading-page">加载修仙数据中...</div>;

  // 获取境界中文名
  const realmMap = {
    'MORTAL': '凡人', 'QI_REFINING': '练气', 'FOUNDATION': '筑基', 'GOLD_CORE': '金丹'
  };

  return (
    <div className="cultivation-main-page">
      <button className="back-btn" onClick={onBack}>← 返回娃娃中心</button>
      
      {/* 头部状态 */}
      <div className="cult-header">
        <div className="avatar-area">
          <div className="avatar-img">{data.gender === 'male' ? '👦' : '👧'}</div>
          <div className="realm-badge">{realmMap[data.realm] || data.realm} Lv.{data.level}</div>
        </div>
        <div className="stats-area">
          <div className="stat-item">⚔️ 战力: {data.power}</div>
          <div className="stat-item">💧 灵气: {Math.floor(data.exp)}</div>
          <div className="stat-item">🌀 灵池: Lv.{data.homePoolLevel}</div>
        </div>
      </div>

      {/* 操作区 */}
      <div className="actions-area">
        <button className="btn-cultivate" onClick={handleClaim} disabled={loading}>
          {loading ? '感悟中...' : '🧘 领取修炼收益'}
        </button>
        <button className="btn-breakthrough" onClick={() => setShowBreakthrough(true)}>
          ⚡ 境界突破
        </button>
        <button className="btn-dungeon" onClick={async () => {
             const r = await api.post('/cultivation/dungeon');
             alert(r.data.message);
             fetchData();
        }}>
          🐻 挑战狗熊
        </button>
      </div>

      {/* 属性加点 */}
      <div className="attributes-section">
        <h3>📊 属性分配 (剩余: {data.availablePoints})</h3>
        <div className="attr-grid">
          <div className="attr-row">
            <span>攻击 ({data.attributes.attack})</span>
            <button onClick={()=>handleAddPoint('attack')} disabled={!data.availablePoints}>+1</button>
          </div>
          <div className="attr-row">
            <span>生命 ({data.attributes.hp})</span>
            <button onClick={()=>handleAddPoint('hp')} disabled={!data.availablePoints}>+10</button>
          </div>
          <div className="attr-row">
            <span>防御 ({data.attributes.defense})</span>
            <button onClick={()=>handleAddPoint('defense')} disabled={!data.availablePoints}>+1</button>
          </div>
          <div className="attr-row">
            <span>资质 ({data.attributes.aptitude})</span>
            <button onClick={()=>handleAddPoint('aptitude')} disabled={!data.availablePoints}>+1/h</button>
          </div>
          <div className="attr-row">
            <span>暴击 ({data.attributes.critRate}%)</span>
            <button onClick={()=>handleAddPoint('critRate')} disabled={!data.availablePoints}>+0.1%</button>
          </div>
           <div className="attr-row">
            <span>闪避 ({data.attributes.dodgeRate}%)</span>
            <button onClick={()=>handleAddPoint('dodgeRate')} disabled={!data.availablePoints}>+0.1%</button>
          </div>
        </div>
      </div>

      {/* 突破弹窗 */}
      <BreakthroughModal 
        isVisible={showBreakthrough}
        currentRealm={realmMap[data.realm]}
        currentLevel={data.level}
        currentExp={data.exp}
        onConfirm={handleBreakthroughConfirm}
        onCancel={() => setShowBreakthrough(false)}
      />
    </div>
  );
};

export default CultivationMain;
