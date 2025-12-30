// frontend/src/pages/ImmortalDollPage.js
import React, { useState, useEffect } from 'react';
import api from '../config/api';
import './ImmortalDollPage.css';
import AttributeAllocation from '../components/Immortal/AttributeAllocation';
import RealmBreakModal from '../components/Immortal/RealmBreakModal';

// ✅ 前端也定义一份配置表 (用于显示消耗和奖励)
const REALM_CONFIG = {
  '凡人': [
    { level: 1, cost: 1000, reward: 1 },
    { level: 2, cost: 3000, reward: 1 },
    { level: 3, cost: 7000, reward: 1 },
    { level: 4, cost: 12000, reward: 1 },
    { level: 5, cost: 18000, reward: 1 },
    { level: 6, cost: 25000, reward: 1 },
    { level: 7, cost: 35000, reward: 2 },
    { level: 8, cost: 45000, reward: 2 },
    { level: 9, cost: 55000, reward: 2 },
    { level: 10, cost: 80000, reward: 3 }
  ],
  '练气': [
    { level: 1, cost: 100000, reward: 2 },
    { level: 2, cost: 150000, reward: 2 },
    { level: 3, cost: 200000, reward: 2 },
    { level: 4, cost: 250000, reward: 2 },
    { level: 5, cost: 350000, reward: 2 },
    { level: 6, cost: 450000, reward: 3 },
    { level: 7, cost: 550000, reward: 3 },
    { level: 8, cost: 650000, reward: 3 },
    { level: 9, cost: 800000, reward: 4 },
    { level: 10, cost: 1000000, reward: 5 }
  ]
};

const ImmortalDollPage = ({ syncUserData }) => {
  const [doll, setDoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cultivate'); 
  const [createState, setCreateState] = useState({ faction: '', gender: '' });
  const [isOperating, setIsOperating] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);

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

  // 获取当前下一级的配置
  const getNextLevelConfig = () => {
    if (!doll) return null;
    const table = REALM_CONFIG[doll.realm] || REALM_CONFIG['凡人'];
    return table.find(l => l.level === doll.level + 1);
  };

  const nextLevelConfig = getNextLevelConfig();

  // --- 核心操作：升级小层级 ---
  const handleLevelUp = async () => {
    if (!nextLevelConfig) return;
    if (doll.spiritualEnergy < nextLevelConfig.cost) {
      alert(`灵气不足！需要 ${nextLevelConfig.cost} 灵气`);
      return;
    }
    
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/level-up');
      if (res.success) {
        setDoll(res.data.doll);
        alert(res.message);
      }
    } catch (error) {
      alert(error.message || '升级失败');
    } finally {
      setIsOperating(false);
    }
  };

  // --- 其他操作保持不变 ---
  const handleCollectSpirit = async () => {
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/collect-spirit');
      if (res.success) {
        setDoll(res.data.doll);
      }
    } catch (error) {
      alert(error.message || '领取失败');
    } finally {
      setIsOperating(false);
    }
  };

  const handleUpgradePool = async () => {
    const cost = 1; // 固定1灵气石
    if (!window.confirm(`确认消耗 ${cost} 灵气石升级灵气池吗？`)) return;
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/upgrade-pool');
      if (res.success) {
        setDoll(res.data.doll);
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
              <div key={f} className={`faction-card ${createState.faction === f ? 'selected' : ''}`} onClick={() => setCreateState({...createState, faction: f})}>
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
              <div key={g} className={`gender-option ${createState.gender === g ? 'selected' : ''}`} onClick={() => setCreateState({...createState, gender: g})}>
                {g === '男' ? '👦' : '👧'} {g}修士
              </div>
            ))}
          </div>
          <button className="start-btn" onClick={handleCreateDoll} disabled={isOperating}>
            {isOperating ? '创建中...' : '开始修仙之旅'}
          </button>
        </div>
      </div>
    );
  }

  // --- 界面二：游戏主界面 ---
  // 计算当前灵气获取速度 = 池子等级 + 资质
  const currentSpiritRate = doll.spiritPool.level + doll.baseAttributes.aptitude;

  return (
    <div className="immortal-container game-screen">
      {/* 1. 顶部信息栏 */}
      <div className="top-bar">
        <div className="avatar-section">
          <div className="avatar-circle">{doll.gender === '男' ? '👦' : '👧'}</div>
          <div className="user-info">
            {/* ✅ 显示：大境界 · 小层级 */}
            <div className="realm-badge">{doll.realm} · {doll.level}级</div>
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
            {/* ✅ 修改：升级小层级按钮区域 */}
            <div className="level-up-section">
              <div className="level-info">
                <span className="level-label">当前等级</span>
                <span className="level-val">{doll.realm} {doll.level}</span>
              </div>
              {nextLevelConfig ? (
                <button className="level-btn-main" onClick={handleLevelUp} disabled={isOperating}>
                  <div className="cost-row">
                    <span>升级</span>
                    <span className="cost-tag">{nextLevelConfig.cost} 灵气</span>
                  </div>
                  <div className="reward-desc">获得 {nextLevelConfig.reward} 点属性</div>
                </button>
              ) : (
                <button className="level-btn-main full" onClick={() => setShowBreakModal(true)}>
                  <span>🚀 突破境界</span>
                </button>
              )}
            </div>

            {/* 原有灵气池部分 */}
            <div className="panel-header" style={{marginTop:'15px'}}>
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
                <span>灵气产出速度</span>
                <span className="highlight">+{currentSpiritRate}/h</span>
              </div>
              <div className="info-row">
                <span>其中资质加成</span>
                <span className="highlight">+{doll.baseAttributes.aptitude}/h</span>
              </div>
            </div>

            <div className="action-area">
              <button className="collect-btn" onClick={handleCollectSpirit} disabled={isOperating}>
                {isOperating ? '...' : '领 取 灵 气'}
              </button>
              <button className="upgrade-btn" onClick={handleUpgradePool} disabled={isOperating}>
                <div className="btn-row">
                  <span>升级灵气池</span>
                  <span className="cost-tag">1 灵气石</span>
                </div>
                <div className="btn-desc">速度 +1/h</div>
              </button>
            </div>
          </div>
        )}

        {/* 属性 Tab */}
        {activeTab === 'attrib' && (
          <AttributeAllocation 
            doll={doll} 
            onDollUpdate={(newDoll) => setDoll(newDoll)} 
          />
        )}

        {/* 副本与装备暂且保持原样 */}
        {activeTab === 'dungeon' && (
          <div className="panel">
            <div className="dungeon-card">
              <div className="dungeon-img">🐻</div>
              <h4>关卡一：狗熊</h4>
              <p>门票: 100 星源币</p>
              <p>推荐战力: 200</p>
              <button className="challenge-btn" onClick={() => alert('挑战系统开发中...')}>挑战</button>
            </div>
          </div>
        )}
        
        {activeTab === 'equip' && (
          <div className="panel">
            <h3 style={{textAlign:'center', marginBottom:'15px', color:'#95a5a6'}}>🛡️ 装备栏</h3>
            <div className="equip-grid">
              {['weapon', 'armor', 'shoes', 'belt', 'clothes', 'pants'].map(slot => (
                <div key={slot} className="equip-slot empty">{slot}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. 底部 Tab 导航 */}
      <div className="game-tabs">
        <div className={`tab-item ${activeTab === 'cultivate' ? 'active' : ''}`} onClick={() => setActiveTab('cultivate')}>修炼</div>
        <div className={`tab-item ${activeTab === 'attrib' ? 'active' : ''}`} onClick={() => setActiveTab('attrib')}>属性</div>
        <div className={`tab-item ${activeTab === 'dungeon' ? 'active' : ''}`} onClick={() => setActiveTab('dungeon')}>副本</div>
        <div className={`tab-item ${activeTab === 'equip' ? 'active' : ''}`} onClick={() => setActiveTab('equip')}>装备</div>
      </div>

      {/* 挂载弹窗 */}
      {showBreakModal && (
        <RealmBreakModal 
          doll={doll} 
          onDollUpdate={(newDoll) => setDoll(newDoll)} 
          onClose={() => setShowBreakModal(false)} 
        />
      )}
    </div>
  );
};

export default ImmortalDollPage;
