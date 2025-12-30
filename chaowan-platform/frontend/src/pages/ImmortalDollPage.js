// frontend/src/pages/ImmortalDollPage.js
import React, { useState, useEffect } from 'react';
import api from '../config/api';
import './ImmortalDollPage.css';

const ImmortalDollPage = ({ syncUserData }) => {
  const [doll, setDoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cultivate'); // 默认显示修炼
  const [createState, setCreateState] = useState({ faction: '', gender: '' });
  const [isOperatng, setIsOperating] = useState(false); // 按钮防抖

  // 获取娃娃数据
  const fetchDoll = async () => {
    try {
      const res = await api.get('/immortal/my-doll');
      if (res.success) {
        setDoll(res.data.doll);
      }
    } catch (error) {
      console.error("加载失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoll();
  }, []);

  // 创建娃娃逻辑
  const handleCreateDoll = async () => {
    if (!createState.faction || !createState.gender) {
      alert('请先选择阵营和性别！');
      return;
    }
    try {
      setIsOperating(true);
      const res = await api.post('/immortal/create', createState);
      if (res.success) {
        setDoll(res.data.doll);
      }
    } catch (error) {
      alert('创建失败：' + error.message);
    } finally {
      setIsOperating(false);
    }
  };

  // --- 修炼面板逻辑 (内联) ---
  
  // 计算升级消耗 (灵气石)
  const getPoolCost = () => {
    // 对应后端: baseCost * multiplier ^ (level - 1)
    const baseCost = 50;
    const costMultiplier = 1.5;
    return Math.floor(baseCost * Math.pow(costMultiplier, doll.spiritPool.level - 1));
  };

  const handleCollectSpirit = async () => {
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/collect-spirit');
      if (res.success) {
        alert(res.message);
        setDoll(res.data.doll);
      }
    } catch (error) {
      alert(error.message || '领取失败');
    } finally {
      setIsOperating(false);
    }
  };

  const handleUpgradePool = async () => {
    const cost = getPoolCost();
    if (!window.confirm(`确认消耗 ${cost} 灵气石升级灵气池吗？`)) return;

    setIsOperating(true);
    try {
      const res = await api.post('/immortal/upgrade-pool');
      if (res.success) {
        alert(res.message);
        setDoll(res.data.doll);
        // 刷新全局用户数据(因为消耗了货币)
        if (syncUserData) syncUserData(); 
      }
    } catch (error) {
      alert(error.message || '升级失败');
    } finally {
      setIsOperating(false);
    }
  };

  if (loading) return <div className="immortal-loading"><div className="spinner"></div></div>;

  // --- 界面一：角色创建 ---
  if (!doll) {
    return (
      <div className="immortal-container create-screen">
        <h1 className="game-title">问道修仙</h1>
        <div className="creation-form">
          <div className="step-title">第一步：选择阵营</div>
          <div className="card-grid">
            {['仙', '魔', '道'].map(f => (
              <div 
                key={f} 
                className={`faction-card ${createState.faction === f ? 'selected' : ''}`}
                onClick={() => setCreateState({...createState, faction: f})}
              >
                <div className="faction-icon">{f}</div>
                <div className="faction-name">{f}门</div>
                <div className="faction-desc">
                  {f === '仙' && '攻1 血30 (平衡)'}
                  {f === '魔' && '攻3 血10 (高攻)'}
                  {f === '道' && '攻1 血10 防1 (高防)'}
                </div>
              </div>
            ))}
          </div>

          <div className="step-title" style={{marginTop: '20px'}}>第二步：选择性别</div>
          <div className="gender-selector">
            {['男', '女'].map(g => (
              <div 
                key={g}
                className={`gender-option ${createState.gender === g ? 'selected' : ''}`}
                onClick={() => setCreateState({...createState, gender: g})}
              >
                {g === '男' ? '👦' : '👧'} {g}修士
              </div>
            ))}
          </div>

          <button className="start-btn" onClick={handleCreateDoll} disabled={isOperatng}>
            {isOperatng ? '创建中...' : '开始修仙之旅'}
          </button>
        </div>
      </div>
    );
  }

  // --- 界面二：游戏主界面 ---
  return (
    <div className="immortal-container game-screen">
      {/* 1. 顶部信息栏 */}
      <div className="top-bar">
        <div className="avatar-section">
          <div className="avatar-circle">{doll.gender === '男' ? '👦' : '👧'}</div>
          <div className="user-info">
            <div className="realm-badge">{doll.realm} · {doll.level}重</div>
            <div className="faction-badge" style={{color: doll.faction === '魔' ? '#d63031' : '#0984e3'}}>
              {doll.faction}
            </div>
          </div>
        </div>
        <div className="power-display">
          <div className="power-label">战力</div>
          <div className="power-value">{doll.combatPower}</div>
        </div>
      </div>

      {/* 2. 中间内容区 */}
      <div className="content-area">
        {activeTab === 'cultivate' && (
          <div className="panel cultivation-panel">
             <div className="panel-header">
              <span className="panel-title">🧘 灵气修炼</span>
              <span className="pool-level">Lv.{doll.spiritPool.level}</span>
            </div>

            <div className="spirit-display">
              <div className="spirit-icon">☁️</div>
              <div className="spirit-info">
                <div className="spirit-value">{doll.spiritualEnergy}</div>
                <div className="spirit-label">当前灵气</div>
              </div>
            </div>

            <div className="production-info">
              <div className="info-row">
                <span>灵气池等级</span>
                <span className="highlight">Lv.{doll.spiritPool.level}</span>
              </div>
              <div className="info-row">
                <span>灵气产出</span>
                <span className="highlight">+{doll.spiritPool.productionRate}/h</span>
              </div>
            </div>

            <div className="action-area">
              <button className="collect-btn" onClick={handleCollectSpirit} disabled={isOperatng}>
                {isOperatng ? '...' : '领 取 灵 气'}
              </button>

              <button className="upgrade-btn" onClick={handleUpgradePool} disabled={isOperatng}>
                <div className="btn-row">
                  <span>升级灵气池</span>
                  <span className="cost-tag">{getPoolCost()} 灵气石</span>
                </div>
                <div className="btn-desc">产出 +{doll.spiritPool.productionRate + 1}/h</div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'attrib' && (
          <div className="panel">
            <div className="points-badge">可用属性点: {doll.availableAttributePoints}</div>
            <div className="attrs-grid">
              <div className="attr-item">
                <span>攻击力</span>
                <strong>{doll.baseAttributes.attack}</strong>
                <button className="plus-btn" onClick={() => alert('功能开发中...')}>+</button>
              </div>
              <div className="attr-item">
                <span>生命值</span>
                <strong>{doll.baseAttributes.health}</strong>
                <button className="plus-btn" onClick={() => alert('功能开发中...')}>+</button>
              </div>
              <div className="attr-item">
                <span>防御力</span>
                <strong>{doll.baseAttributes.defense}</strong>
                <button className="plus-btn" onClick={() => alert('功能开发中...')}>+</button>
              </div>
              <div className="attr-item">
                <span>资质</span>
                <strong>{doll.baseAttributes.aptitude}</strong>
                <button className="plus-btn" onClick={() => alert('功能开发中...')}>+</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dungeon' && (
          <div className="panel">
            <div className="dungeon-card">
              <div className="dungeon-img">🐻</div>
              <h4>关卡一：狗熊岭</h4>
              <p>挑战次数: 1/1</p>
              <p>推荐战力: 100</p>
              <button className="challenge-btn" onClick={() => alert('战斗系统开发中...')}>挑战</button>
            </div>
          </div>
        )}
        
        {activeTab === 'equip' && (
          <div className="panel">
            <h3 style={{textAlign:'center', marginBottom:'15px', color:'#95a5a6'}}>🛡️ 装备栏</h3>
            <div className="equip-grid">
              {['weapon', 'armor', 'shoes', 'belt', 'clothes', 'pants'].map(slot => (
                <div key={slot} className="equip-slot empty">
                  {slot}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. 底部 Tab 导航 */}
      <div className="game-tabs">
        <div 
          className={`tab-item ${activeTab === 'cultivate' ? 'active' : ''}`}
          onClick={() => setActiveTab('cultivate')}
        >
          修炼
        </div>
        <div 
          className={`tab-item ${activeTab === 'attrib' ? 'active' : ''}`}
          onClick={() => setActiveTab('attrib')}
        >
          属性
        </div>
        <div 
          className={`tab-item ${activeTab === 'dungeon' ? 'active' : ''}`}
          onClick={() => setActiveTab('dungeon')}
        >
          副本
        </div>
        <div 
          className={`tab-item ${activeTab === 'equip' ? 'active' : ''}`}
          onClick={() => setActiveTab('equip')}
        >
          装备
        </div>
      </div>
    </div>
  );
};

export default ImmortalDollPage;
