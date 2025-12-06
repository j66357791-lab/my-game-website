import React, { useState, useEffect } from 'react';
import './AdminDollsPage.css';

const AdminDollsPage = ({ user, onUpdateUser }) => {
  const [dolls, setDolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoll, setSelectedDoll] = useState(null);
  
  // 表单数据
  const [dollForm, setDollForm] = useState({
    name: '',
    description: '',
    price: 0,
    rarity: 'common',
    category: 'basic',
    image: '',
    stock: 0,
    isActive: true
  });

  // 模拟数据（等后端API完成后替换）
  const mockDolls = [
    {
      _id: '1',
      name: '可爱小熊',
      description: '经典款小熊娃娃',
      price: 299,
      rarity: 'common',
      category: 'basic',
      image: 'https://via.placeholder.com/100x100?text=小熊',
      stock: 50,
      isActive: true,
      createdAt: '2024-01-01'
    },
    {
      _id: '2',
      name: '限量版独角兽',
      description: '稀有独角兽娃娃',
      price: 599,
      rarity: 'legendary',
      category: 'limited',
      image: 'https://via.placeholder.com/100x100?text=独角兽',
      stock: 10,
      isActive: true,
      createdAt: '2024-01-02'
    },
    {
      _id: '3',
      name: '彩虹兔子',
      description: '彩虹色兔子娃娃',
      price: 399,
      rarity: 'rare',
      category: 'special',
      image: 'https://via.placeholder.com/100x100?text=兔子',
      stock: 25,
      isActive: false,
      createdAt: '2024-01-03'
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
      
      // 等后端API完成后，替换为：
      /*
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/admin/dolls', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDolls(data.data.dolls);
      } else {
        setError(data.message || '获取娃娃列表失败');
      }
      */
      
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
      
      // 等后端API完成后，替换为：
      /*
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/admin/dolls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dollForm)
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.alert('娃娃添加成功！');
        setShowAddModal(false);
        resetForm();
        fetchDolls();
      } else {
        window.alert('添加失败: ' + data.message);
      }
      */
      
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
      
      // 等后端API完成后，替换为真实的API调用
      /*
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tianchuang.onrender.com/api/admin/dolls/${selectedDoll._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dollForm)
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.alert('娃娃更新成功！');
        setShowEditModal(false);
        resetForm();
        fetchDolls();
      } else {
        window.alert('更新失败: ' + data.message);
      }
      */
      
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
      
      // 等后端API完成后，替换为：
      /*
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tianchuang.onrender.com/api/admin/dolls/${dollId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.alert(`娃娃 "${dollName}" 已删除`);
        fetchDolls();
      } else {
        window.alert('删除失败: ' + data.message);
      }
      */
      
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
      
      // 等后端API完成后替换为真实API
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
      isActive: true
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
      isActive: doll.isActive
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
