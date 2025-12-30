// frontend/src/pages/ImmortalDollPage.js
import React, { useState, useEffect } from 'react';
import api from '../config/api';
import './ImmortalDollPage.css';
import AttributeAllocation from '../components/Immortal/AttributeAllocation';
import RealmBreakModal from '../components/Immortal/RealmBreakModal';

// ✅ 装备部位中文对照
const SLOT_MAP = {
  'weapon': '武器',
  'armor': '防具',
  'shoes': '鞋子',
  'belt': '腰带',
  'clothes': '衣服',
  'pants': '裤子'
};

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
  const [battleResult, setBattleResult] = useState(null);

  // ✅ 新增：装备相关状态
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); 
  const [inventory, setInventory] = useState([]);

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

  // 获取下一级配置
  const getNextLevelConfig = () => {
    if (!doll) return null;
    const table = REALM_CONFIG[doll.realm] || REALM_CONFIG['凡人'];
    return table.find(l => l.level === doll.level + 1);
  };
  const nextLevelConfig = getNextLevelConfig();

  const handleLevelUp = async () => {
    if (!nextLevelConfig) return;
    if (doll.spiritualEnergy < nextLevelConfig.cost) {
      alert(`灵气不足！需要 ${nextLevelConfig.cost} 灵气`); return;
    }
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/level-up');
      if (res.success) { setDoll(res.data.doll); alert(res.message); }
    } catch (error) {
      alert(error.message || '升级失败');
    } finally { setIsOperating(false); }
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

  const handleChallenge = async () => {
    if (battleResult) return;
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/dungeon/challenge');
      if (res.success) {
        setDoll(res.data.doll);
        if (syncUserData) syncUserData();
      } else {
        if (res.data.doll) setDoll(res.data.doll);
        if (res.data.userStarcoin && syncUserData) syncUserData();
      }
      setBattleResult(res);
    } catch (error) { alert(error.message || '挑战失败'); }
    finally { setIsOperating(false); }
  };

  // ✅ 新增：获取背包
  const fetchInventory = async () => {
    try {
      const res = await api.get('/immortal/equipment/inventory');
      if (res.success) setInventory(res.data.inventory);
    } catch (error) { console.error("获取背包失败", error); }
  };

  // ✅ 新增：打开背包
  const openSlotSelection = async (slotKey) => {
    setSelectedSlot(slotKey);
    fetchInventory();
    setShowInventoryModal(true);
  };

  // ✅ 新增：穿戴装备
  const handleEquip = async (equipId) => {
    setIsOperating(true);
    try {
      const res = await api.post('/immortal/equipment/equip', { equipId, targetSlot: selectedSlot });
      if (res.success) {
        setDoll(res.data.doll); // 更新doll以刷新战力和槽位显示
        setInventory(prev => prev.filter(item => item._id !== equipId)); // 从背包移除
        setShowInventoryModal(false);
      }
    } catch (error) { alert(error.message || '穿戴失败'); }
    finally { setIsOperating(false); }
  };

  if (loading) return <div className="immortal-loading"><div className="spinner"></div></div>;

  // --- 创建界面 ---
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

  const currentSpiritRate = doll.spiritPool.level + doll.baseAttributes.aptitude;
  const displayAttrs = doll.totalAttributes || doll.baseAttributes; // 优先使用总属性

  return (
    <div className="immortal-container game-screen">
      {/* 顶部信息栏 */}
      <div className="top-bar">
        <div className="avatar-section">
          <div className="avatar-circle">{doll.gender === '男' ? '👦' : '👧'}</div>
          <div className="user-info">
            <div className="realm-badge">{doll.realm} · {doll.level}级</div>
            <div className="faction-badge" style={{color: doll.faction === '魔' ? '#d63031' : '#0984e3'}}>
              {doll.faction}
            </div>
          </div>
        </div>
        <div className="power-display">
          <div className="power-label">战力</div>
          {/* 优先显示包含装备加成的战力 */}
          <div className="power-value">{doll.realCombatPower || doll.combatPower}</div>
        </div>
      </div>

      {/* 中间内容区 */}
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
              <div className="info-row"><span>灵气产出速度</span><span className="highlight">+{currentSpiritRate}/h</span></div>
              <div className="info-row"><span>其中资质加成</span><span className="highlight">+{doll.baseAttributes.aptitude}/h</span></div>
            </div>
            <div className="action-area">
              <button className="collect-btn" onClick={handleCollectSpirit} disabled={isOperating}>{isOperating ? '...' : '领 取 灵 气'}</button>
              <button className="upgrade-btn" onClick={handleUpgradePool} disabled={isOperating}>
                <div className="btn-row"><span>升级灵气池</span><span className="cost-tag">1 灵气石</span></div>
                <div className="btn-desc">速度 +1/h</div>
              </button>
            </div>
          </div>
        )}

        {/* 属性 Tab (增加详情) */}
        {activeTab === 'attrib' && (
          <div className="panel">
            <h3 style={{textAlign:'center', marginBottom:'15px', color:'#fff'}}>📊 属性详情</h3>
            <div className="attrs-detail-list">
                <div className="attr-row"><span>攻击力</span><span className="val">{displayAttrs.attack}</span></div>
                <div className="attr-row"><span>生命值</span><span className="val">{displayAttrs.health}</span></div>
                <div className="attr-row"><span>防御力</span><span className="val">{displayAttrs.defense}</span></div>
                <div className="attr-row"><span>暴击率</span><span className="val">{(displayAttrs.critRate * 100).toFixed(1)}%</span></div>
                <div className="attr-row"><span>闪避率</span><span className="val">{(displayAttrs.dodgeRate * 100).toFixed(1)}%</span></div>
            </div>
          </div>
        )}

        {/* 副本 Tab */}
        {activeTab === 'dungeon' && (
          <div className="panel">
            <div className="dungeon-card">
              <div className="dungeon-img">🐻</div>
              <h3 style={{color:'#fff', marginBottom:'5px'}}>关卡一：狗熊岭</h3>
              <p style={{color:'#95a5a6', fontSize:'12px'}}>战斗力: 200 | 血量: 50</p>
              <div style={{display:'flex', justifyContent:'space-between', margin:'15px 0', fontSize:'13px', color:'#bdc3c7'}}>
                  <span>消耗: 100 星源币</span>
                  <span>次数: 1/1 (每日)</span>
              </div>
              <button className="challenge-btn" onClick={handleChallenge} disabled={isOperating}>
                  {isOperating ? '战斗中...' : '挑 战'}
              </button>
            </div>
          </div>
        )}
        
        {/* ✅ 装备 Tab (完整功能) */}
        {activeTab === 'equip' && (
          <div className="panel equip-panel-container">
            <div className="equip-header"><span>角色装备</span></div>
            <div className="equip-grid">
              {['weapon', 'armor', 'shoes', 'belt', 'clothes', 'pants'].map(slot => {
                const equippedItem = doll.equipmentSlots && doll.equipmentSlots[slot];
                const displayName = SLOT_MAP[slot];
                return (
                  <div 
                    key={slot} 
                    className={`equip-slot ${equippedItem ? 'filled' : 'empty'}`}
                    onClick={() => openSlotSelection(slot)}
                  >
                    <div className="slot-name">{displayName}</div>
                    {equippedItem ? (
                        <div className="equip-detail">
                            <div className="equip-lv">Lv.{equippedItem.level}</div>
                            <div className="equip-stat">
                                {equippedItem.attributes.attack > 0 && <span>+{equippedItem.attributes.attack}攻</span>}
                                {equippedItem.attributes.health > 0 && <span>+{equippedItem.attributes.health}血</span>}
                                {equippedItem.attributes.defense > 0 && <span>+{equippedItem.attributes.defense}防</span>}
                                {/* 其他属性可扩展 */}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-plus">+</div>
                    )}
                  </div>
                );
              })}
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

      {/* 弹窗挂载 */}
      {showBreakModal && (
        <RealmBreakModal 
          doll={doll} 
          onDollUpdate={(newDoll) => setDoll(newDoll)} 
          onClose={() => setShowBreakModal(false)} 
        />
      )}

      {battleResult && (
        <div className="battle-modal-overlay" onClick={() => setBattleResult(null)}>
          <div className="battle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="battle-header">
                <span>{battleResult.success ? '🎉 战斗胜利' : '💀 战斗失败'}</span>
                <span style={{cursor:'pointer', fontSize:'20px'}} onClick={() => setBattleResult(null)}>✕</span>
            </div>
            {battleResult.success ? (
                <div className="rewards-area">
                    <p style={{color:'#2ecc71'}}>击败了狗熊！</p>
                    <div className="reward-item"><span>灵气:</span><span className="val">+{battleResult.data.rewards.spirit}</span></div>
                    {battleResult.data.rewards.equipments.length > 0 && (
                        <div className="reward-section">
                            <p>获得装备:</p>
                            {battleResult.data.rewards.equipments.map((eq, idx) => (
                                <div key={idx} className="equip-tag">{SLOT_MAP[eq.slot]} Lv.{eq.level}</div>
                            ))}
                        </div>
                    )}
                    {(battleResult.data.rewards.stones.refineStone > 0 || battleResult.data.rewards.stones.spiritStone > 0) && (
                        <div className="reward-section">
                            <p>特殊掉落:</p>
                            {battleResult.data.rewards.stones.refineStone > 0 && <div className="equip-tag">强化石 x{battleResult.data.rewards.stones.refineStone}</div>}
                            {battleResult.data.rewards.stones.spiritStone > 0 && <div className="equip-tag">灵气石 x{battleResult.data.rewards.stones.spiritStone}</div>}
                        </div>
                    )}
                </div>
            ) : (
                <div className="fail-area">
                    <p style={{color:'#e74c3c', marginBottom:'10px'}}>{battleResult.message}</p>
                    <p style={{color:'#95a5a6', fontSize:'12px'}}>请提升攻击力或血量后再来挑战！</p>
                </div>
            )}
            <button className="close-btn-confirm" onClick={() => setBattleResult(null)}>确定</button>
          </div>
        </div>
      )}

      {/* ✅ 背包选择弹窗 */}
      {showInventoryModal && (
        <div className="inventory-modal-overlay" onClick={() => setShowInventoryModal(false)}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inv-header">
                <span>选择 {SLOT_MAP[selectedSlot]}</span>
                <span style={{cursor:'pointer'}} onClick={() => setShowInventoryModal(false)}>✕</span>
            </div>
            <div className="inv-list">
                {inventory.length === 0 ? (
                    <div className="inv-empty">该部位暂无装备</div>
                ) : (
                    inventory.map(item => (
                        <div key={item._id} className="inv-item" onClick={() => handleEquip(item._id)}>
                            <div className="inv-icon">⚔️</div>
                            <div className="inv-info">
                                <div className="inv-name">{SLOT_MAP[item.slot]} Lv.{item.level}</div>
                                <div className="inv-attrs">
                                    {item.attributes.attack > 0 && <span>攻+{item.attributes.attack}</span>}
                                    {item.attributes.health > 0 && <span>血+{item.attributes.health}</span>}
                                    {item.attributes.defense > 0 && <span>防+{item.attributes.defense}</span>}
                                </div>
                            </div>
                            <div className="inv-action">穿戴</div>
                        </div>
                    ))
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImmortalDollPage;
