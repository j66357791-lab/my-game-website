// frontend/src/pages/ImmortalDollPage.js
import React, { useState, useEffect } from 'react';
import api from '../config/api';
import './ImmortalDollPage.css';
import AttributeAllocation from '../components/Immortal/AttributeAllocation';
import RealmBreakModal from '../components/Immortal/RealmBreakModal';

// ✅ 副本配置
const DUNGEON_CONFIG = [
  { 
    id: 1, name: '新手村', locked: false, 
    stages: [
      { id: 1, name: '狗熊', cost: 100, locked: false },
      { id: 2, name: '小狼', cost: 100, locked: false },
      { id: 3, name: '树妖', cost: 100, locked: false },
      { id: 4, name: '锁', cost: 0, locked: true },
      { id: 5, name: '锁', cost: 0, locked: true },
      { id: 6, name: '锁', cost: 0, locked: true },
      { id: 7, name: '锁', cost: 0, locked: true },
      { id: 8, name: '锁', cost: 0, locked: true },
    ]
  },
  { id: 2, name: '第二章', locked: true },
  { id: 3, name: '第三章', locked: true },
  { id: 4, name: '第四章', locked: true },
  { id: 5, name: '第五章', locked: true },
];

// ✅ 境界配置
const REALM_CONFIG = {
  '凡人': [
    { level: 1, cost: 1000, reward: 1 }, { level: 2, cost: 3000, reward: 1 },
    { level: 3, cost: 7000, reward: 1 }, { level: 4, cost: 12000, reward: 1 },
    { level: 5, cost: 18000, reward: 1 }, { level: 6, cost: 25000, reward: 1 },
    { level: 7, cost: 35000, reward: 2 }, { level: 8, cost: 45000, reward: 2 },
    { level: 9, cost: 55000, reward: 2 }, { level: 10, cost: 80000, reward: 3 }
  ],
  '练气': [
    { level: 1, cost: 100000, reward: 2 }, { level: 2, cost: 150000, reward: 2 },
    { level: 3, cost: 200000, reward: 2 }, { level: 4, cost: 250000, reward: 2 },
    { level: 5, cost: 350000, reward: 2 }, { level: 6, cost: 450000, reward: 3 },
    { level: 7, cost: 550000, reward: 3 }, { level: 8, cost: 650000, reward: 3 },
    { level: 9, cost: 800000, reward: 4 }, { level: 10, cost: 1000000, reward: 5 }
  ]
};

const ImmortalDollPage = ({ syncUserData }) => {
  const [doll, setDoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cultivate'); 
  const [createState, setCreateState] = useState({ faction: '', gender: '' });
  const [isOperating, setIsOperating] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);

  // ✅ 战斗动画状态
  const [battleAnimVisible, setBattleAnimVisible] = useState(false);
  const [battleLogs, setBattleLogs] = useState([]);
  const [battleResult, setBattleResult] = useState(null);

  // ✅ 首页属性展开状态
  const [showFullAttrs, setShowFullAttrs] = useState(false);

  // ✅ 装备系统状态
  const [inventory, setInventory] = useState([]); // 背包列表
  const [selectedEquipId, setSelectedEquipId] = useState(null); // 当前选中操作的装备ID

  const fetchDoll = async () => {
    try {
      const res = await api.get('/immortal/my-doll');
      if (res.success) setDoll(res.data.doll);
    } catch (error) {
      console.error("加载失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoll(); }, []);

  const handleCreateDoll = async () => {
    if (!createState.faction || !createState.gender) return alert('请先选择阵营和性别！');
    try {
      setIsOperating(true);
      const res = await api.post('/immortal/create', createState);
      if (res.success) setDoll(res.data.doll);
    } catch (error) { alert('创建失败：' + error.message); }
    finally { setIsOperating(false); }
  };

  const getNextLevelConfig = () => {
    if (!doll) return null;
    const table = REALM_CONFIG[doll.realm] || REALM_CONFIG['凡人'];
    return table.find(l => l.level === doll.level + 1);
  };
  const nextLevelConfig = getNextLevelConfig();

  const handleLevelUp = async () => {
    if (!nextLevelConfig) return;
    if (doll.spiritualEnergy < nextLevelConfig.cost) return alert(`灵气不足！需要 ${nextLevelConfig.cost} 灵气`);
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/level-up');
      if (res.success) { setDoll(res.data.doll); alert(res.message); }
    } catch (error) { alert(error.message || '升级失败'); }
    finally { setIsOperating(false); }
  };

  const handleCollectSpirit = async () => {
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/collect-spirit');
      if (res.success) setDoll(res.data.doll);
    } catch (error) { alert(error.message || '领取失败'); }
    finally { setIsOperating(false); }
  };

  const handleUpgradePool = async () => {
    const cost = 1;
    if (!window.confirm(`确认消耗 ${cost} 灵气石升级灵气池吗？`)) return;
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/upgrade-pool');
      if (res.success) {
        setDoll(res.data.doll);
        if (syncUserData) syncUserData(); 
      }
    } catch (error) { alert(error.message || '升级失败'); }
    finally { setIsOperating(false); }
  };

  const handleChallenge = async (stageId) => {
    setIsOperating(true);
    try {
      setBattleAnimVisible(true);
      setBattleLogs([{ type: 'info', text: '正在进入战场...' }]);
      setBattleResult(null);

      const res = await api.post('/immortal/dungeon/challenge', { stageId });
      
      if (res.data?.doll) setDoll(res.data.doll);
      if (res.data?.userStarcoin && syncUserData) syncUserData();

      if (res.data?.battleResult?.logs && res.success) {
        const logs = res.data.battleResult.logs;
        let step = 0;
        const interval = setInterval(() => {
          if (step >= logs.length) {
            clearInterval(interval);
            setBattleResult(res.data);
          } else {
            const log = logs[step];
            if (log) {
              setBattleLogs(prev => [...prev, log]);
            }
            step++;
          }
        }, 800);
      } else {
        setBattleAnimVisible(false);
        if (!res.success) {
          alert(res.message || '挑战失败！');
        }
      }

    } catch (error) {
      setBattleAnimVisible(false);
      console.error(error);
      alert(error.message || '挑战失败');
    } finally {
      setIsOperating(false);
    }
  };

  // ==========================================
  // ✅ 装备系统逻辑 (修复版)
  // ==========================================
  const fetchInventory = async () => {
    try {
      const res = await api.get('/immortal/equipment/inventory');
      if (res.success) setInventory(res.data.inventory);
    } catch (error) { console.error("获取背包失败", error); }
  };

  const getAllEquips = () => {
    if (!doll) return [];
    const equipped = Object.values(doll.equipmentSlots || {}).filter(e => e);
    return [...inventory, ...equipped];
  };

  const handleEquipClick = (id) => {
    setSelectedEquipId(id);
    // 自动刷新背包以获取最新列表（如果未刷新过）
    if (inventory.length === 0) fetchInventory();
  };

  // 穿戴装备
  const handleEquip = async () => {
    if (!selectedEquipId) return;
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/equipment/equip', { equipId: selectedEquipId });
      if (res.success) {
        setDoll(res.data.doll);
        fetchInventory();
      }
    } catch (e) { alert('操作失败'); }
    finally { setIsOperating(false); }
  };

  // 卸下装备
  const handleUnequip = async () => {
    if (!selectedEquipId) return;
    const equip = getAllEquips().find(e => e._id === selectedEquipId);
    if (!equip) return;

    // 检查是否穿在身上
    if (doll.equipmentSlots[equip.slot] && doll.equipmentSlots[equip.slot]._id === selectedEquipId) {
      setIsOperating(true);
      try {
        const res = await api.post('/immortal/equipment/unequip', { slot: equip.slot });
        if (res.success) {
          setDoll(res.data.doll);
          fetchInventory();
          setSelectedEquipId(null);
        }
      } catch (e) { alert('操作失败'); }
      finally { setIsOperating(false); }
    } else {
      // 本来就在背包里，不需要卸下操作
      setSelectedEquipId(null);
    }
  };

  const handleRefine = async () => {
    if (!selectedEquipId) return;
    const equip = getAllEquips().find(e => e._id === selectedEquipId);
    if (!equip) return;
    if (equip.level >= 10) return alert('已达到最高强化等级');
    
    // 自动寻找背包里第一个同部位装备作为材料（简化UI）
    const material = inventory.find(i => i.slot === equip.slot && i._id !== selectedEquipId);
    if (!material) return alert(`背包中缺少${equip.slot}作为强化材料！`);

    if (!window.confirm(`消耗1个${equip.slot}和1个强化石进行强化？`)) return;
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/equipment/refine', { equipId: selectedEquipId, materialId: material._id });
      alert(res.message);
      fetchInventory();
      fetchDoll();
    } catch (e) { alert('强化失败'); }
    finally { setIsOperating(false); }
  };

  const handleStarUp = async () => {
    if (!selectedEquipId) return;
    const equip = getAllEquips().find(e => e._id === selectedEquipId);
    if (!equip) return;
    const materials = inventory.filter(i => i.slot === equip.slot && i._id !== selectedEquipId).slice(0,5);
    if (materials.length < 5) return alert('升星需要5件同部位装备！');
    
    if (!window.confirm('消耗5件同部位装备升星？')) return;
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/equipment/star-up', { equipId: selectedEquipId, materialIds: materials.map(m=>m._id) });
      alert(res.message);
      fetchInventory();
      fetchDoll();
    } catch (e) { alert('升星失败'); }
    finally { setIsOperating(false); }
  };

  const handleDecompose = async () => {
    if (!selectedEquipId) return;
    const equip = getAllEquips().find(e => e._id === selectedEquipId);
    if (!equip) return;
    
    // 不能拆解正在穿戴的装备
    if (doll.equipmentSlots[equip.slot] && doll.equipmentSlots[equip.slot]._id === selectedEquipId) {
      return alert('请先卸下该装备！');
    }
    if (!window.confirm(`确认拆解此装备？`)) return;
    
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/equipment/decompose', { equipId: selectedEquipId });
      alert(res.message);
      setSelectedEquipId(null);
      fetchInventory();
      if (syncUserData) syncUserData();
    } catch (e) { alert('拆解失败'); }
    finally { setIsOperating(false); }
  };

  if (loading) return <div className="immortal-loading"><div className="spinner"></div></div>;

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

  const displayAttrs = doll.totalAttributes || doll.baseAttributes;
  const spiritPercent = Math.min(100, (doll.spiritualEnergy / 80000) * 100);
  const selectedEquip = getAllEquips().find(e => e._id === selectedEquipId);
  const slotMap = {weapon:'武器', armor:'防具', shoes:'鞋子', belt:'腰带', clothes:'衣服', pants:'裤子'};

  return (
    <div className="immortal-container game-screen">
      {/* 顶部 */}
      <div className="top-bar">
        <div className="avatar-section">
          <div className="avatar-circle">{doll.gender === '男' ? '👦' : '👧'}</div>
          <div className="user-info">
            <div className="realm-badge">{doll.realm} · {doll.level}级</div>
            <div className="faction-badge" style={{color: doll.faction === '魔' ? '#d63031' : '#0984e3'}}>{doll.faction}</div>
          </div>
        </div>
        <div className="power-display">
          <div className="power-label">战力</div>
          <div className="power-value">{doll.realCombatPower || doll.combatPower}</div>
        </div>
      </div>

      <div className="content-area">
        {/* 修炼 Tab */}
        {activeTab === 'cultivate' && (
          <div className="panel cultivation-panel">
            <div className="level-up-section">
              <div className="level-info">
                <span className="level-label">当前等级</span>
                <span className="level-val">{doll.realm} {doll.level}</span>
              </div>
              {nextLevelConfig ? (
                <button className="level-btn-main" onClick={handleLevelUp} disabled={isOperating}>
                  <div className="cost-row"><span>升级</span><span className="cost-tag">{nextLevelConfig.cost} 灵气</span></div>
                  <div className="reward-desc">获得 {nextLevelConfig.reward} 点属性</div>
                </button>
              ) : (
                <button className="level-btn-main full" onClick={() => setShowBreakModal(true)}><span>🚀 突破境界</span></button>
              )}
            </div>

            {/* 灵气球 */}
            <div className="spirit-ball-container">
              <div className="ball-wrapper">
                <div className="spirit-fill" style={{ height: `${spiritPercent}%` }}></div>
                <div className="particle p1"></div>
                <div className="particle p2"></div>
                <div className="particle p3"></div>
                <div className="spirit-text">{Math.floor(spiritPercent)}%</div>
              </div>
              <div className="spirit-info">
                <div className="spirit-value">{doll.spiritualEnergy}</div>
                <div className="spirit-label">当前灵气</div>
              </div>
            </div>

            {/* 精简属性展示 */}
            <div className="quick-attrs">
                <div className="attr-row-mini">
                    <span>攻击 {displayAttrs.attack}</span>
                    <span>生命 {displayAttrs.health}</span>
                    <span>防御 {displayAttrs.defense}</span>
                    <span>速度 {displayAttrs.speed}</span>
                </div>
                <div className="expand-line" onClick={() => setShowFullAttrs(!showFullAttrs)}>
                    <span>{showFullAttrs ? '收起' : '展开全部信息'}</span>
                    <span className="arrow">{showFullAttrs ? '▲' : '▼'}</span>
                </div>
                {showFullAttrs && (
                    <div className="full-attrs-detail">
                         <p>暴击率: {(displayAttrs.critRate * 100).toFixed(1)}%</p>
                         <p>闪避率: {(displayAttrs.dodgeRate * 100).toFixed(1)}%</p>
                         <p>资质: {displayAttrs.aptitude} (+{displayAttrs.aptitude}/h)</p>
                    </div>
                )}
            </div>

            <div className="production-info">
              <div className="info-row">
                <span>灵气产出速度</span>
                <span className="highlight">+{doll.spiritPool.level + (displayAttrs.aptitude||0)}/h</span>
              </div>
            </div>

            <div className="action-area">
              <button className="collect-btn" onClick={handleCollectSpirit} disabled={isOperating}>
                {isOperating ? '...' : '领 取 灵 气'}
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

        {/* 副本 Tab (章节设计) */}
        {activeTab === 'dungeon' && (
          <div className="panel dungeon-panel">
            {DUNGEON_CONFIG.map(chapter => (
                <div key={chapter.id} className="chapter-block">
                    <div className="chapter-title">
                        {chapter.locked ? '🔒 ' : ''}第{chapter.id}章 {chapter.name}
                    </div>
                    {!chapter.locked && (
                        <div className="stage-grid">
                            {chapter.stages.map(stage => (
                                <div 
                                    key={stage.id} 
                                    className={`stage-node ${stage.locked ? 'locked' : ''}`}
                                    onClick={() => !stage.locked && handleChallenge(stage.id)}
                                >
                                    <div className="stage-id">{stage.id}</div>
                                    <div className="stage-name">{stage.name}</div>
                                    {!stage.locked && <div className="stage-cost">{stage.cost}💎</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
          </div>
        )}
        
        {/* 家园 Tab (灵气池升级) */}
        {activeTab === 'home' && (
          <div className="panel home-panel">
            <h3 style={{textAlign:'center', color:'#f1c40f', marginBottom:'20px'}}>🏡 我的家园</h3>
            <div className="pool-status-card">
                <div className="pool-icon">🏊</div>
                <div className="pool-info">
                    <div className="pool-name">灵气池</div>
                    <div className="pool-lv">Lv.{doll.spiritPool.level}</div>
                    <div className="pool-rate">产出: +{doll.spiritPool.level}/h</div>
                </div>
            </div>
            <button className="upgrade-pool-big-btn" onClick={handleUpgradePool} disabled={isOperating}>
                <span>升级灵气池</span>
                <span className="cost">1 灵气石</span>
            </button>
            <p style={{color:'#7f8c8d', fontSize:'12px', textAlign:'center', marginTop:'10px'}}>
                当前境界{doll.realm}最大等级: {doll.realm === '凡人' ? '20' : '40'}
            </p>
          </div>
        )}

        {/* ✅ 装备 Tab (全新UI) */}
        {activeTab === 'equip' && (
          <div className="panel equip-new-layout">
            {/* 左侧装备栏 (武器、防具、鞋子) */}
            <div className="equip-col left-col">
              {['weapon', 'armor', 'shoes'].map(slot => {
                const equippedId = doll.equipmentSlots && doll.equipmentSlots[slot]?._id;
                const isSelected = selectedEquipId === equippedId;
                return (
                  <div key={slot} 
                    className={`equip-slot-box ${isSelected ? 'active' : ''}`}
                    onClick={() => equippedId && handleEquipClick(equippedId)}
                  >
                    <div className="slot-label">{slotMap[slot]}</div>
                    <div className="slot-content">
                      {equippedId ? (
                        <div className="equipped-star">⭐{doll.equipmentSlots[slot].star}</div>
                      ) : (
                        <div className="empty-slot">+</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* 背包中的左侧装备列表（简化展示） */}
              <div style={{borderTop:'1px dashed rgba(255,255,255,0.1)', margin:'10px 0'}} />
              {inventory.filter(i => ['weapon','armor','shoes'].includes(i.slot)).map(item => (
                <div key={item._id} 
                  className={`equip-slot-box bag-item ${selectedEquipId === item._id ? 'active' : ''}`}
                  onClick={() => handleEquipClick(item._id)}>
                  <div className="slot-label" style={{fontSize:'10px'}}>Lv.{item.level}</div>
                  <div className="slot-content">
                    <div className="equipped-star" style={{fontSize:'12px'}}>⭐{item.star}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 中间操作区 */}
            <div className="equip-col center-col">
              {selectedEquip ? (
                <div className="equip-details">
                  <h3>{selectedEquip.slot === 'weapon'?'武器':selectedEquip.slot==='armor'?'防具':selectedEquip.slot==='shoes'?'鞋子':selectedEquip.slot} - {selectedEquip.quality}</h3>
                  <div className="equip-attrs">
                    <p>等级: +{selectedEquip.level} / 10</p>
                    <p>星级: ⭐{selectedEquip.star} / 3</p>
                    <p>攻击: {selectedEquip.attributes?.attack || 0}</p>
                    <p>生命: {selectedEquip.attributes?.health || 0}</p>
                    <p>防御: {selectedEquip.attributes?.defense || 0}</p>
                  </div>
                  {selectedEquip.affixes && selectedEquip.affixes.length > 0 && (
                    <div className="affix-list">
                        <p>词条:</p>
                        {selectedEquip.affixes.map((a, i) => <span key={i} className="affix-tag">{a.name}</span>)}
                    </div>
                  )}
                  <div className="action-buttons">
                    <button onClick={handleRefine}>强化 (消耗同件)</button>
                    <button onClick={handleStarUp}>升星 (消耗5件)</button>
                    <button className="red-btn" onClick={handleDecompose}>拆解</button>
                    {(doll.equipmentSlots[selectedEquip.slot] && doll.equipmentSlots[selectedEquip.slot]._id === selectedEquipId) ? (
                        <button onClick={handleUnequip}>卸下</button>
                    ) : (
                        <button onClick={handleEquip}>穿戴</button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-center">
                    <p>点击装备查看详情</p>
                </div>
              )}
            </div>

            {/* 右侧装备栏 (腰带、衣服、裤子) */}
            <div className="equip-col right-col">
              {['belt', 'clothes', 'pants'].map(slot => {
                const equippedId = doll.equipmentSlots && doll.equipmentSlots[slot]?._id;
                const isSelected = selectedEquipId === equippedId;
                return (
                  <div key={slot} 
                    className={`equip-slot-box ${isSelected ? 'active' : ''}`}
                    onClick={() => equippedId && handleEquipClick(equippedId)}
                  >
                    <div className="slot-label">{slotMap[slot]}</div>
                    <div className="slot-content">
                      {equippedId ? (
                        <div className="equipped-star">⭐{doll.equipmentSlots[slot].star}</div>
                      ) : (
                        <div className="empty-slot">+</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* 背包中的右侧装备列表 */}
              <div style={{borderTop:'1px dashed rgba(255,255,255,0.1)', margin:'10px 0'}} />
              {inventory.filter(i => ['belt','clothes','pants'].includes(i.slot)).map(item => (
                <div key={item._id} 
                  className={`equip-slot-box bag-item ${selectedEquipId === item._id ? 'active' : ''}`}
                  onClick={() => handleEquipClick(item._id)}>
                  <div className="slot-label" style={{fontSize:'10px'}}>Lv.{item.level}</div>
                  <div className="slot-content">
                    <div className="equipped-star" style={{fontSize:'12px'}}>⭐{item.star}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* 底部 Tab 导航 */}
      <div className="game-tabs">
        <div className={`tab-item ${activeTab === 'cultivate' ? 'active' : ''}`} onClick={() => setActiveTab('cultivate')}>修炼</div>
        <div className={`tab-item ${activeTab === 'attrib' ? 'active' : ''}`} onClick={() => setActiveTab('attrib')}>属性</div>
        <div className={`tab-item ${activeTab === 'dungeon' ? 'active' : ''}`} onClick={() => setActiveTab('dungeon')}>副本</div>
        <div className={`tab-item ${activeTab === 'equip' ? 'active' : ''}`} onClick={() => setActiveTab('equip')}>装备</div>
        <div className={`tab-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>家园</div>
      </div>

      {/* 挂载其他弹窗 */}
      {showBreakModal && (
        <RealmBreakModal 
          doll={doll} 
          onDollUpdate={(newDoll) => setDoll(newDoll)} 
          onClose={() => setShowBreakModal(false)} 
        />
      )}

      {/* ✅ 战斗动画弹窗 */}
      {battleAnimVisible && (
        <div className="battle-anim-overlay">
            <div className="battle-arena">
                <div className="battle-log-container">
                    {battleLogs.filter(log => log).map((log, idx) => (
                        <div key={idx} className={`log-line ${log.type === 'player' ? 'log-player' : log.type === 'enemy' ? 'log-enemy' : ''}`}>
                            {log.text}
                        </div>
                    ))}
                </div>
                {battleResult && (
                    <div className="battle-result-modal">
                        <h2 className={battleResult.battleResult.isWin ? 'win' : 'lose'}>
                            {battleResult.battleResult.isWin ? '战斗胜利！' : '战斗失败'}
                        </h2>
                        {battleResult.battleResult.isWin && (
                            <div className="rewards">
                                <p>灵气: +{battleResult.rewards.spirit}</p>
                                {battleResult.rewards.equipments.length > 0 && <p>获得装备 {battleResult.rewards.equipments.length}件</p>}
                            </div>
                        )}
                        <button className="anim-close-btn" onClick={() => setBattleAnimVisible(false)}>返回</button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default ImmortalDollPage;
