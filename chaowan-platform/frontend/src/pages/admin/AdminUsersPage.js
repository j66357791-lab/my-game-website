import React, { useState, useEffect } from 'react';
import './AdminUsersPage.css';

const AdminUsersPage = ({ user, onUpdateUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // 获取用户列表
  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `https://tianchuang.onrender.com/api/admin/users?page=${page}&limit=10`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
        setCurrentPage(data.data.pagination.currentPage);
        setError('');
      } else {
        setError(data.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('❌ 获取用户列表失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 调整用户积分
  const handleAdjustPoints = async () => {
    if (!selectedUser || !adjustAmount) {
      window.alert('请填写调整金额');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/admin/points/adjust', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          amount: parseInt(adjustAmount),
          description: adjustReason || '管理员调整'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.alert(`积分调整成功！${selectedUser.username}: ${data.data.oldPoints} → ${data.data.newPoints}`);
        setShowAdjustModal(false);
        setSelectedUser(null);
        setAdjustAmount('');
        setAdjustReason('');
        fetchUsers(currentPage, searchTerm);
      } else {
        window.alert('调整失败: ' + data.message);
      }
    } catch (error) {
      console.error('❌ 调整积分失败:', error);
      window.alert('网络错误，请重试');
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`确定删除用户 ${username} 吗？此操作不可恢复！`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tianchuang.onrender.com/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
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
            <table>
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>邮箱</th>
                  <th>积分</th>
                  <th>等级</th>
                  <th>角色</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem._id}>
                    <td>{userItem.username}</td>
                    <td>{userItem.email}</td>
                    <td>{userItem.points}</td>
                    <td>Lv.{userItem.level}</td>
                    <td>
                      <span className={`role-badge ${userItem.role}`}>
                        {userItem.role === 'admin' ? '👑 管理员' : '👤 用户'}
                      </span>
                    </td>
                    <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => {
                            setSelectedUser(userItem);
                            setShowAdjustModal(true);
                          }}
                          className="adjust-btn"
                          disabled={userItem.role === 'admin'}
                        >
                          💰 调整积分
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userItem._id, userItem.username)}
                          className="delete-btn"
                          disabled={userItem.role === 'admin'}
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* 积分调整弹窗 */}
      {showAdjustModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>调整积分</h3>
            <p>用户: {selectedUser.username}</p>
            <p>当前积分: {selectedUser.points}</p>
            <input
              type="number"
              placeholder="调整数量（正数为增加，负数为减少）"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="调整原因"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handleAdjustPoints}>确认</button>
              <button onClick={() => {
                setShowAdjustModal(false);
                setSelectedUser(null);
                setAdjustAmount('');
                setAdjustReason('');
              }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
