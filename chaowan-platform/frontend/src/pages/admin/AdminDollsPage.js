import React, { useState, useEffect } from 'react';
import './AdminDollsPage.css';

const AdminDollsPage = ({ user, onUpdateUser }) => {
  const [dolls, setDolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoll, setSelectedDoll] = useState(null);
  
  // 表单数据 - 基于常见娃娃游戏数据结构
  const [dollForm, setDollForm] = useState({
    name: '',
    description: '',
    price: 0,
    rarity: 'common',
    category: 'basic',
    image: '',
    stock: 0,
    isActive: true,
    series: '', // 系列
    size: '', // 尺寸
    material: '' // 材质
  });

  // 模拟数据 - 基于常见娃娃游戏
  const mockDolls = [
    {
      _id: '1',
      name: '可爱小熊',
      description: '经典款小熊娃娃，柔软舒适',
      price: 299,
      rarity: 'common',
      category: 'basic',
      image: 'https://via.placeholder.com/150x150?text=小熊',
      stock: 50,
      isActive: true,
      series: '经典系列',
      size: '30cm',
      material: '毛绒',
      createdAt: '2024-01-01'
    },
    {
      _id: '2',
      name: '限量版独角兽',
      description: '稀有独角兽娃娃，闪亮独角',
      price: 599,
      rarity: 'legendary',
      category: 'limited',
      image: 'https://via.placeholder.com/150x150?text=独角兽',
      stock: 10,
      isActive: true,
      series: '梦幻系列',
      size: '35cm',
      material: '高级毛绒+闪粉',
      createdAt: '2024-01-02'
    },
    {
      _id: '3',
      name: '彩虹兔子',
      description: '彩虹色兔子娃娃，色彩缤纷',
      price: 399,
      rarity: 'rare',
      category: 'special',
      image: 'https://via.placeholder.com/150x150?text=兔子',
      stock: 25,
      isActive: false,
      series: '彩虹系列',
      size: '25cm',
      material: '彩色毛绒',
      createdAt: '2024-01-03'
    },
    {
      _id: '4',
      name: '熊猫宝宝',
      description: '国宝熊猫娃娃，黑白经典',
      price: 349,
      rarity: 'common',
      category: 'basic',
      image: 'https://via.placeholder.com/150x150?text=熊猫',
      stock: 40,
      isActive: true,
      series: '动物系列',
      size: '28cm',
      material: '超柔毛绒',
      createdAt: '2024-01-04'
    },
    {
      _id: '5',
      name: '星空猫头鹰',
      description: '夜光猫头鹰，晚上会发光',
      price: 449,
      rarity: 'epic',
      category: 'special',
      image: 'https://via.placeholder.com/150x150?text=猫头鹰',
      stock: 15,
      isActive: true,
      series: '星空系列',
      size: '32cm',
      material: '夜光毛绒',
      createdAt: '2024-01-05'
    }
  ];

  // 获取娃娃列表
  const fetchDolls = async () => {
    try {
      setLoading(true);
      
      // 暂时使用模拟数据
      setTimeout(() => {
        setDolls(mockDolls);
        setLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('❌ 获取娃娃列表失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 添加娃娃
  const handleAddDoll = async () => {
    try {
      // 暂时添加到模拟数据
      const newDoll = {
        _id: Date.now().toString(),
        ...dollForm,
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setDolls([...dolls, newDoll]);
      setShowAddModal(false);
      resetForm();
      window.alert('娃娃添加成功！');
      
    } catch (error) {
      console.error('❌ 添加娃娃失败:', error);
      window.alert('网络错误，请重试');
    }
  };

  // 更新娃娃
  const handleUpdateDoll = async () => {
    if (!selectedDoll) return;
    
    try {
      // 暂时更新模拟数据
      setDolls(dolls.map(doll => 
        doll._id === selectedDoll._id 
          ? { ...doll, ...dollForm }
          : doll
      ));
      
      setShowEditModal(false);
      resetForm();
      window.alert('娃娃更新成功！');
      
    } catch (error) {
      console.error('❌ 更新娃娃失败:', error);
      window.alert('网络错误，请重试');
    }
  };

  // 删除娃娃
  const handleDeleteDoll = async (dollId, dollName) => {
    if (!window.confirm(`确定删除娃娃 "${dollName}" 吗？此操作不可恢复！`)) {
      return;
    }
    
    try {
      // 暂时删除模拟数据
      setDolls(dolls.filter(doll => doll._id !== dollId));
      window.alert(`娃娃 "${dollName}" 已删除`);
      
    } catch (error) {
      console.error('❌ 删除娃娃失败:', error);
      window.alert('网络错误，请重试');
    }
  };

  // 切换娃娃状态
  const handleToggleDollStatus = async (dollId, dollName, currentStatus) => {
    const action = currentStatus ? '下架' : '上架';
    
    try {
      // 暂时切换模拟数据
      setDolls(dolls.map(doll => 
        doll._id === dollId 
          ? { ...doll, isActive: !currentStatus }
          : doll
      ));
      
      window.alert(`娃娃 "${dollName}" 已${action}`);
      
    } catch (error) {
      console.error(`❌ ${action}娃娃失败:`, error);
      window.alert('网络错误，请重试');
    }
  };

  // 重置表单
  const resetForm = () => {
    setDollForm({
      name: '',
      description: '',
      price: 0,
      rarity: 'common',
      category: 'basic',
      image: '',
      stock: 0,
      isActive: true,
      series: '',
      size: '',
      material: ''
    });
    setSelectedDoll(null);
  };

  // 打开编辑弹窗
  const openEditModal = (doll) => {
    setSelectedDoll(doll);
    setDollForm({
      name: doll.name,
      description: doll.description,
      price: doll.price,
      rarity: doll.rarity,
      category: doll.category,
      image: doll.image,
      stock: doll.stock,
      isActive: doll.isActive,
      series: doll.series || '',
      size: doll.size || '',
      material: doll.material || ''
    });
    setShowEditModal(true);
  };

  useEffect(() => {
    fetchDolls();
  }, []);

  return (
    <div className="admin-dolls-page">
      <div className="admin-header">
        <h1>🧸 娃娃管理</h1>
        <button 
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="add-doll-btn"
        >
          ➕ 添加娃娃
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="dolls-grid">
          {dolls.map((doll) => (
            <div key={doll._id} className={`doll-card ${!doll.isActive ? 'inactive' : ''}`}>
              <div className="doll-image">
                <img src={doll.image} alt={doll.name} />
                {!doll.isActive && <div className="inactive-overlay">已下架</div>}
              </div>
              <div className="doll-info">
                <h3>{doll.name}</h3>
                <p className="doll-series">{doll.series}</p>
                <p className="doll-description">{doll.description}</p>
                <div className="doll-details">
                  <span className="price">¥{doll.price}</span>
                  <span className={`rarity ${doll.rarity}`}>
                    {doll.rarity === 'common' ? '普通' : 
                     doll.rarity === 'rare' ? '稀有' : 
                     doll.rarity === 'epic' ? '史诗' : '传说'}
                  </span>
                </div>
                <div className="doll-meta">
                  <span className="category">{doll.category}</span>
                  <span className="stock">库存: {doll.stock}</span>
                </div>
                <div className="doll-specs">
                  <span>尺寸: {doll.size}</span>
                  <span>材质: {doll.material}</span>
                </div>
                <div className="doll-actions">
                  <button
                    onClick={() => openEditModal(doll)}
                    className="edit-btn"
                    title="编辑娃娃"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleToggleDollStatus(doll._id, doll.name, doll.isActive)}
                    className={`toggle-btn ${doll.isActive ? 'disable' : 'enable'}`}
                    title={doll.isActive ? '下架娃娃' : '上架娃娃'}
                  >
                    {doll.isActive ? '🔒' : '🔓'}
                  </button>
                  <button
                    onClick={() => handleDeleteDoll(doll._id, doll.name)}
                    className="delete-btn"
                    title="删除娃娃"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加娃娃弹窗 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal doll-modal">
            <h3>➕ 添加新娃娃</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>名称:</label>
                <input
                  type="text"
                  value={dollForm.name}
                  onChange={(e) => setDollForm({...dollForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>价格:</label>
                <input
                  type="number"
                  min="0"
                  value={dollForm.price}
                  onChange={(e) => setDollForm({...dollForm, price: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>稀有度:</label>
                <select
                  value={dollForm.rarity}
                  onChange={(e) => setDollForm({...dollForm, rarity: e.target.value})}
                >
                  <option value="common">普通</option>
                  <option value="rare">稀有</option>
                  <option value="epic">史诗</option>
                  <option value="legendary">传说</option>
                </select>
              </div>
              <div className="form-group">
                <label>分类:</label>
                <select
                  value={dollForm.category}
                  onChange={(e) => setDollForm({...dollForm, category: e.target.value})}
                >
                  <option value="basic">基础款</option>
                  <option value="special">特别款</option>
                  <option value="limited">限量款</option>
                </select>
              </div>
              <div className="form-group">
                <label>库存:</label>
                <input
                  type="number"
                  min="0"
                  value={dollForm.stock}
                  onChange={(e) => setDollForm({...dollForm, stock: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>图片URL:</label>
                <input
                  type="text"
                  value={dollForm.image}
                  onChange={(e) => setDollForm({...dollForm, image: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>系列:</label>
                <input
                  type="text"
                  value={dollForm.series}
                  onChange={(e) => setDollForm({...dollForm, series: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>尺寸:</label>
                <input
                  type="text"
                  value={dollForm.size}
                  onChange={(e) => setDollForm({...dollForm, size: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>材质:</label>
                <input
                  type="text"
                  value={dollForm.material}
                  onChange={(e) => setDollForm({...dollForm, material: e.target.value})}
                />
              </div>
            </div>
            <div className="form-group full-width">
              <label>描述:</label>
              <textarea
                value={dollForm.description}
                onChange={(e) => setDollForm({...dollForm, description: e.target.value})}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={dollForm.isActive}
                  onChange={(e) => setDollForm({...dollForm, isActive: e.target.checked})}
                />
                立即上架
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={handleAddDoll} className="save-btn">添加</button>
              <button onClick={() => setShowAddModal(false)} className="cancel-btn">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑娃娃弹窗 */}
      {showEditModal && selectedDoll && (
        <div className="modal-overlay">
          <div className="modal doll-modal">
            <h3>✏️ 编辑娃娃</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>名称:</label>
                <input
                  type="text"
                  value={dollForm.name}
                  onChange={(e) => setDollForm({...dollForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>价格:</label>
                <input
                  type="number"
                  min="0"
                  value={dollForm.price}
                  onChange={(e) => setDollForm({...dollForm, price: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>稀有度:</label>
                <select
                  value={dollForm.rarity}
                  onChange={(e) => setDollForm({...dollForm, rarity: e.target.value})}
                >
                  <option value="common">普通</option>
                  <option value="rare">稀有</option>
                  <option value="epic">史诗</option>
                  <option value="legendary">传说</option>
                </select>
              </div>
              <div className="form-group">
                <label>分类:</label>
                <select
                  value={dollForm.category}
                  onChange={(e) => setDollForm({...dollForm, category: e.target.value})}
                >
                  <option value="basic">基础款</option>
                  <option value="special">特别款</option>
                  <option value="limited">限量款</option>
                </select>
              </div>
              <div className="form-group">
                <label>库存:</label>
                <input
                  type="number"
                  min="0"
                  value={dollForm.stock}
                  onChange={(e) => setDollForm({...dollForm, stock: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>图片URL:</label>
                <input
                  type="text"
                  value={dollForm.image}
                  onChange={(e) => setDollForm({...dollForm, image: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>系列:</label>
                <input
                  type="text"
                  value={dollForm.series}
                  onChange={(e) => setDollForm({...dollForm, series: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>尺寸:</label>
                <input
                  type="text"
                  value={dollForm.size}
                  onChange={(e) => setDollForm({...dollForm, size: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>材质:</label>
                <input
                  type="text"
                  value={dollForm.material}
                  onChange={(e) => setDollForm({...dollForm, material: e.target.value})}
                />
              </div>
            </div>
            <div className="form-group full-width">
              <label>描述:</label>
              <textarea
                value={dollForm.description}
                onChange={(e) => setDollForm({...dollForm, description: e.target.value})}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={dollForm.isActive}
                  onChange={(e) => setDollForm({...dollForm, isActive: e.target.checked})}
                />
                上架状态
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={handleUpdateDoll} className="save-btn">保存</button>
              <button onClick={() => setShowEditModal(false)} className="cancel-btn">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDollsPage;
