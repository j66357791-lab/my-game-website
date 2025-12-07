import React, { useState, useEffect } from 'react';
// 🔧 正确导入API
import api from '../../config/api.js';
import './AdminUsersPage.css';

const AdminUsersPage = ({ user, onUpdateUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 弹窗状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // 编辑表单数据
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    level: 1,
    points: 0,
    cashBalance: 0,
    role: 'user',
    disabled: false
  });
  
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [cashForm, setCashForm] = useState({
    amount: '',
    description: ''
  });

  // 使用API模块获取用户列表
  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      
      // 检查API对象
      if (!api || !api.get) {
        console.error('❌ API对象不存在');
        setError('API模块加载失败，请刷新页面');
        return;
      }
      
      let endpoint = `/admin/users?page=${page}&limit=10`;
      if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }
      
      const data = await api.get(endpoint);
      
      if (data.success) {
        setUsers(data.data.users || []); // 确保是数组
        setTotalPages(data.data.pagination?.pages || 1);
        setCurrentPage(data.data.pagination?.currentPage || 1);
        setError('');
      } else {
        setError(data.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('❌ 获取用户列表失败:', error);
      setError(error.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 使用API模块更新用户信息
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      if (!api || !api.put) {
        console.error('❌ API对象不存在');
        setError('API模块加载失败，请刷新页面');
        return;
      }
      
      const data = await api.put(`/admin/users/${selectedUser._id}`, editForm);
      
      if (data.success) {
        window.alert('用户信息更新成功！');
        setShowEditModal(false);
        fetchUsers(currentPage, searchTerm);
      } else {
        window.alert('更新失败: ' + data.message);
      }
    } catch (error) {
      console.error('❌ 更新用户失败:', error);
      window.alert('网络错误，请重试');
    }
  };

  // 使用API模块修改密码
  const handleChangePassword = async () => {
    if (!selectedUser || passwordForm.newPassword !== passwordForm.confirmPassword) {
      window.alert('两次输入的密码不一致');
      return;
    }
    
    try {
      if (!api || !api.put) {
        console.error('❌ API对象不存在');
        setError('API模块加载失败，请刷新页面');
        return;
      }
      
      const data = await api.put(`/admin/users/${selectedUser._id}/password`, {
        newPassword: passwordForm.newPassword
      });
      
      if (data.success) {
        window.alert('密码修改成功！');
        setShowPasswordModal(false);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      } else {
        window.alert('修改失败: ' + data.message);
      }
    } catch (error) {
      console.error('❌ 修改密码失败:', error);
      window.alert('网络错误，请重试');
    }
  };

  // 使用API模块调整用户余额
  const handleAdjustCash = async () => {
    if (!selectedUser || !cashForm.amount) {
      window.alert('请填写调整金额');
      return;
    }
    
    try {
      if (!api || !api.post) {
        console.error('❌ API对象不存在');
        setError('API模块加载失败，请刷新页面');
        return;
      }
      
      const data = await api.post('/admin/cash/adjust', {
        userId: selectedUser._id,
        amount: parseFloat(cashForm.amount),
        description: cashForm.description || '管理员调整'
      });
      
      if (data.success) {
        window.alert(`余额调整成功！${selectedUser.username}: ¥${data.data.oldCash} → ¥${data.data.newCash}`);
        setShowCashModal(false);
        setCashForm({ amount: '', description: '' });
        fetchUsers(currentPage, searchTerm);
      } else {
        window.alert('调整失败: ' + data.message);
      }
    } catch (error) {
      console.error('❌ 调整余额失败:', error);
      window.alert('网络错误，请重试');
    }
  };

  // 使用API模块切换用户状态
  const handleToggleUserStatus = async (userId, username, currentStatus) => {
    const action = currentStatus ? '启用' : '禁用';
    if (!window.confirm(`确定${action}用户 ${username} 吗？`)) {
      return;
    }
    
    try {
      if (!api || !api.put) {
        console.error('❌ API对象不存在');
        setError('API模块加载失败，请刷新页面');
        return;
      }
      
      const data = await api.put(`/admin/users/${userId}/toggle-status`);
      
      if (data.success) {
        window.alert(`用户 ${username} 已${action}`);
        fetchUsers(currentPage, searchTerm);
      } else {
        window.alert(`${action}失败: ` + data.message);
      }
    } catch (error) {
      console.error(`❌ ${action}用户失败:`, error);
      window.alert('网络错误，请重试');
    }
  };

  // 使用API模块删除用户
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`确定删除用户 ${username} 吗？此操作不可恢复！`)) {
      return;
    }
    
    try {
      if (!api || !api.delete) {
        console.error('❌ API对象不存在');
        setError('API模块加载失败，请刷新页面');
        return;
      }
      
      const data = await api.delete(`/admin/users/${userId}`);
      
      if (data.success) {
        window.alert(`用户 ${username} 已删除`);
        fetchUsers(currentPage, searchTerm);
      } else {
        window.alert('删除失败: ' + data.message);
      }
    } catch (error) {
      console.error('❌ 删除用户失败:', error);
      window.alert('网络错误，请重试');
    }
  };

  // 打开编辑弹窗
  const openEditModal = (userItem) => {
    setSelectedUser(userItem);
    setEditForm({
      username: userItem.username,
      email: userItem.email,
      level: userItem.level,
      points: userItem.points,
      cashBalance: userItem.cashBalance || 0,
      role: userItem.role,
      disabled: userItem.disabled || false
    });
    setShowEditModal(true);
  };

  // 打开密码弹窗
  const openPasswordModal = (userItem) => {
    setSelectedUser(userItem);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  // 打开余额调整弹窗
  const openCashModal = (userItem) => {
    setSelectedUser(userItem);
    setCashForm({ amount: '', description: '' });
    setShowCashModal(true);
  };

  useEffect(() => {
    fetchUsers(1, '');
  }, []);

  return (
    <div className="admin-users-page">
      <div className="admin-header">
        <h1>👥 用户管理</h1>
        <div className="admin-actions">
          <input
            type="text"
            placeholder="搜索用户..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                fetchUsers(1, searchTerm);
              }
            }}
            className="search-input"
          />
          <button 
            onClick={() => fetchUsers(1, searchTerm)}
            className="search-btn"
          >
            🔍 搜索
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <div className="users-table">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>邮箱</th>
                    <th>等级</th>
                    <th>积分</th>
                    <th>余额</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users && users.map((userItem) => (
                    <tr key={userItem._id} className={userItem.disabled ? 'disabled-user' : ''}>
                      <td>
                        <span className="username">{userItem.username}</span>
                        {userItem.disabled && <span className="disabled-badge">已禁用</span>}
                      </td>
                      <td>{userItem.email}</td>
                      <td>Lv.{userItem.level}</td>
                      <td>{userItem.points}</td>
                      <td>¥{(userItem.cashBalance || 0).toFixed(2)}</td>
                      <td>
                        <span className={`role-badge ${userItem.role}`}>
                          {userItem.role === 'admin' ? '👑 管理员' : '👤 用户'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${userItem.disabled ? 'disabled' : 'active'}`}>
                          {userItem.disabled ? '🔒 禁用' : '✅ 正常'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => openEditModal(userItem)}
                            className="edit-btn"
                            title="编辑用户信息"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => openPasswordModal(userItem)}
                            className="password-btn"
                            title="修改密码"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => openCashModal(userItem)}
                            className="cash-btn"
                            title="调整余额"
                          >
                            💰
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(userItem._id, userItem.username, userItem.disabled)}
                            className={`toggle-btn ${userItem.disabled ? 'enable' : 'disable'}`}
                            title={userItem.disabled ? '启用账户' : '禁用账户'}
                            disabled={userItem.role === 'admin'}
                          >
                            {userItem.disabled ? '🔓' : '🔒'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userItem._id, userItem.username)}
                            className="delete-btn"
                            title="删除用户"
                            disabled={userItem.role === 'admin'}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => fetchUsers(currentPage - 1, searchTerm)}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <span>
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() => fetchUsers(currentPage + 1, searchTerm)}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* 编辑用户信息弹窗 */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal edit-modal">
            <h3>✏️ 编辑用户信息</h3>
            <div className="form-group">
              <label>用户名:</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>邮箱:</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>等级:</label>
              <input
                type="number"
                min="1"
                max="100"
                value={editForm.level}
                onChange={(e) => setEditForm({...editForm, level: parseInt(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>积分:</label>
              <input
                type="number"
                value={editForm.points}
                onChange={(e) => setEditForm({...editForm, points: parseInt(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>现金余额:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.cashBalance}
                onChange={(e) => setEditForm({...editForm, cashBalance: parseFloat(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>角色:</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                disabled={selectedUser.role === 'admin'}
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editForm.disabled}
                  onChange={(e) => setEditForm({...editForm, disabled: e.target.checked})}
                  disabled={selectedUser.role === 'admin'}
                />
                禁用账户
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={handleUpdateUser} className="save-btn">保存</button>
              <button onClick={() => setShowEditModal(false)} className="cancel-btn">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal password-modal">
            <h3>🔑 修改密码</h3>
            <p>用户: {selectedUser.username}</p>
            <div className="form-group">
              <label>新密码:</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>确认密码:</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleChangePassword} className="save-btn">修改</button>
              <button onClick={() => setShowPasswordModal(false)} className="cancel-btn">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 余额调整弹窗 */}
      {showCashModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal cash-modal">
            <h3>💰 调整余额</h3>
            <p>用户: {selectedUser.username}</p>
            <p>当前余额: ¥{(selectedUser.cashBalance || 0).toFixed(2)}</p>
            <div className="form-group">
              <label>调整金额:</label>
              <input
                type="number"
                step="0.01"
                placeholder="正数为增加，负数为减少"
                value={cashForm.amount}
                onChange={(e) => setCashForm({...cashForm, amount: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>调整原因:</label>
              <input
                type="text"
                placeholder="请输入调整原因"
                value={cashForm.description}
                onChange={(e) => setCashForm({...cashForm, description: e.target.value})}
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleAdjustCash} className="save-btn">确认调整</button>
              <button onClick={() => setShowCashModal(false)} className="cancel-btn">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
