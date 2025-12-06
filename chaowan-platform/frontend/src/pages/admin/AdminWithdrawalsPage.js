import React, { useState, useEffect } from 'react';
import './AdminWithdrawalsPage.css';

const AdminWithdrawalsPage = ({ user, onUpdateUser }) => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedWithdrawals, setSelectedWithdrawals] = useState([]);
  const [showBatchActions, setShowBatchActions] = useState(false);

  // 获取提现申请列表
  const fetchWithdrawals = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `https://tianchuang.onrender.com/api/admin/withdrawals?status=${filter}&page=${page}&limit=10`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWithdrawals(data.data.withdrawals);
        setTotalPages(data.data.pagination.totalPages);
        setCurrentPage(data.data.pagination.currentPage);
        setError('');
      } else {
        setError(data.message || '获取提现申请失败');
      }
    } catch (error) {
      console.error('❌ 获取提现申请失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 审批提现申请
  const handleProcessWithdrawal = async (withdrawalId, action, remark = '') => {
    const actionText = action === 'approve' ? '批准' : '拒绝';
    
    if (!window.confirm(`确定${actionText}这个提现申请吗？`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tianchuang.onrender.com/api/admin/withdrawals/${withdrawalId}/process`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action, // approve or reject
          remark: remark
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.alert(`提现申请已${actionText}！`);
        fetchWithdrawals(currentPage);
      } else {
        window.alert(`${actionText}失败: ` + data.message);
      }
    } catch (error) {
      console.error(`❌ ${actionText}提现申请失败:`, error);
      window.alert('网络错误，请重试');
    }
  };

  // 批量审批
  const handleBatchProcess = async (action) => {
    const actionText = action === 'approve' ? '批准' : '拒绝';
    
    if (selectedWithdrawals.length === 0) {
      window.alert('请选择要处理的申请');
      return;
    }
    
    if (!window.confirm(`确定${actionText}选中的 ${selectedWithdrawals.length} 个申请吗？`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://tianchuang.onrender.com/api/admin/withdrawals/batch-process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          withdrawalIds: selectedWithdrawals,
          action: action,
          remark: `批量${actionText}`
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.alert(`已批量${actionText} ${data.data.processedCount} 个申请！`);
        setSelectedWithdrawals([]);
        setShowBatchActions(false);
        fetchWithdrawals(currentPage);
      } else {
        window.alert(`批量${actionText}失败: ` + data.message);
      }
    } catch (error) {
      console.error(`❌ 批量${actionText}失败:`, error);
      window.alert('网络错误，请重试');
    }
  };

  // 选择/取消选择提现申请
  const toggleSelection = (withdrawalId) => {
    setSelectedWithdrawals(prev => 
      prev.includes(withdrawalId) 
        ? prev.filter(id => id !== withdrawalId)
        : [...prev, withdrawalId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    if (selectedWithdrawals.length === pendingWithdrawals.length) {
      setSelectedWithdrawals([]);
    } else {
      setSelectedWithdrawals(pendingWithdrawals.map(w => w._id));
    }
  };

  useEffect(() => {
    fetchWithdrawals(1);
  }, [filter]);

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="admin-withdrawals-page">
      <div className="admin-header">
        <h1>💰 提现审批</h1>
        <div className="header-stats">
          <span className="pending-count">
            ⏳ 待审批: {pendingCount}
          </span>
        </div>
      </div>

      <div className="filter-tabs">
        <button 
          className={`tab-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          ⏳ 待审批 ({pendingCount})
        </button>
        <button 
          className={`tab-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          ✅ 已批准
        </button>
        <button 
          className={`tab-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          ❌ 已拒绝
        </button>
        <button 
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          📋 全部
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {filter === 'pending' && pendingCount > 0 && (
        <div className="batch-actions">
          <div className="batch-selection">
            <input
              type="checkbox"
              checked={selectedWithdrawals.length === pendingCount}
              onChange={toggleSelectAll}
            />
            <span>全选 ({selectedWithdrawals.length})</span>
          </div>
          {selectedWithdrawals.length > 0 && (
            <div className="batch-buttons">
              <button 
                onClick={() => handleBatchProcess('approve')}
                className="batch-approve-btn"
              >
                ✅ 批量批准 ({selectedWithdrawals.length})
              </button>
              <button 
                onClick={() => handleBatchProcess('reject')}
                className="batch-reject-btn"
              >
                ❌ 批量拒绝 ({selectedWithdrawals.length})
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <div className="withdrawals-list">
            {withdrawals.length === 0 ? (
              <div className="empty-state">
                <p>暂无{filter === 'all' ? '' : filter === 'pending' ? '待审批' : filter === 'approved' ? '已批准' : '已拒绝'}的提现申请</p>
              </div>
            ) : (
              withdrawals.map((withdrawal) => (
                <div key={withdrawal._id} className={`withdrawal-card status-${withdrawal.status}`}>
                  {withdrawal.status === 'pending' && (
                    <div className="selection-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedWithdrawals.includes(withdrawal._id)}
                        onChange={() => toggleSelection(withdrawal._id)}
                      />
                    </div>
                  )}
                  
                  <div className="card-header">
                    <div className="user-info">
                      <h3>{withdrawal.userId.username}</h3>
                      <p>{withdrawal.userId.email}</p>
                    </div>
                    <div className="amount-info">
                      <span className="amount">¥{withdrawal.amount.toFixed(2)}</span>
                      <span className={`status-badge ${withdrawal.status}`}>
                        {withdrawal.status === 'pending' ? '⏳ 待审批' : 
                         withdrawal.status === 'approved' ? '✅ 已批准' : '❌ 已拒绝'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="label">支付宝账号:</span>
                      <span className="value">{withdrawal.alipayAccount}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">真实姓名:</span>
                      <span className="value">{withdrawal.realName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">申请时间:</span>
                      <span className="value">{new Date(withdrawal.createdAt).toLocaleString()}</span>
                    </div>
                    {withdrawal.processedAt && (
                      <>
                        <div className="detail-row">
                          <span className="label">处理时间:</span>
                          <span className="value">{new Date(withdrawal.processedAt).toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">处理人:</span>
                          <span className="value">{withdrawal.processedBy?.username || '系统'}</span>
                        </div>
                      </>
                    )}
                    {withdrawal.remark && (
                      <div className="detail-row">
                        <span className="label">备注:</span>
                        <span className="value">{withdrawal.remark}</span>
                      </div>
                    )}
                  </div>
                  
                  {withdrawal.status === 'pending' && (
                    <div className="card-actions">
                      <button
                        onClick={() => {
                          const remark = prompt('请输入备注（可选）:');
                          handleProcessWithdrawal(withdrawal._id, 'approve', remark);
                        }}
                        className="approve-btn"
                      >
                        ✅ 批准
                      </button>
                      <button
                        onClick={() => {
                          const remark = prompt('请输入拒绝理由:');
                          if (remark !== null) {
                            handleProcessWithdrawal(withdrawal._id, 'reject', remark);
                          }
                        }}
                        className="reject-btn"
                      >
                        ❌ 拒绝
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => fetchWithdrawals(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <span>
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() => fetchWithdrawals(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminWithdrawalsPage;
