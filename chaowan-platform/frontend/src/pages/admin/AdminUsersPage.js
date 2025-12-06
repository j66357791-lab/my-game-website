// frontend/src/pages/admin/AdminUsersPage.js
import React, { useState, useEffect } from 'react';
import { getUsers, adjustUserPoints, deleteUser } from '../../services/adminService';
import './AdminPage.css';

const AdminUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            console.log('🔍 开始获取用户列表...');
            const res = await getUsers({ page, limit: 10 });
            console.log('📥 用户列表响应:', res);
            
            // 🔧 修复：检查响应数据结构
            if (res.success && res.data) {
                setUsers(res.data.users || []);
                setPagination(res.data.pagination || {});
            } else {
                throw new Error('响应数据格式错误');
            }
        } catch (err) {
            console.error('❌ 获取用户列表失败:', err);
            setError('获取用户列表失败: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustPoints = async (userId, currentPoints) => {
        const amount = prompt(`当前积分: ${currentPoints}\n请输入要调整的积分数量（正数为增加，负数为扣除）:`);
        if (amount === null || isNaN(amount)) return;
        const description = prompt('请输入调整原因（可选）:') || '管理员手动调整';
        
        try {
            console.log('💰 开始调整积分:', { userId, amount, description });
            const res = await adjustUserPoints(userId, parseInt(amount, 10), description);
            console.log('✅ 积分调整响应:', res);
            
            if (res.success) {
                alert('积分调整成功！');
                fetchUsers(pagination.page || 1);
            } else {
                throw new Error(res.message || '调整失败');
            }
        } catch (err) {
            console.error('❌ 积分调整失败:', err);
            alert('积分调整失败: ' + err.message);
        }
    };
    
    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`确定要删除用户 ${username} 吗？此操作不可恢复！`)) return;
        
        try {
            console.log('🗑️ 开始删除用户:', { userId, username });
            const res = await deleteUser(userId);
            console.log('✅ 删除用户响应:', res);
            
            if (res.success) {
                alert('用户删除成功！');
                fetchUsers(pagination.page || 1);
            } else {
                throw new Error(res.message || '删除失败');
            }
        } catch (err) {
            console.error('❌ 删除用户失败:', err);
            alert('用户删除失败: ' + err.message);
        }
    };

    if (loading) return <div>加载中...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="admin-page-container">
            <h1>用户管理</h1>
            
            {/* 调试信息 */}
            <div style={{ background: '#f0f0f0', padding: '10px', marginBottom: '20px', borderRadius: '5px' }}>
                <small>调试信息: 共 {users.length} 个用户</small>
            </div>
            
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>用户名</th>
                        <th>邮箱</th>
                        <th>等级</th>
                        <th>积分</th>
                        <th>角色</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user._id}>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>{user.level}</td>
                            <td>{user.points}</td>
                            <td>{user.role}</td>
                            <td>
                                <button 
                                    onClick={() => handleAdjustPoints(user._id, user.points)}
                                    style={{ marginRight: '5px' }}
                                >
                                    调整积分
                                </button>
                                <button 
                                    onClick={() => handleDeleteUser(user._id, user.username)}
                                    style={{ background: '#f44336', color: 'white' }}
                                >
                                    删除
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {pagination.pages > 1 && (
                <div className="pagination-controls">
                    <button 
                        onClick={() => fetchUsers((pagination.page || 1) - 1)} 
                        disabled={(pagination.page || 1) <= 1}
                    >
                        上一页
                    </button>
                    <span>第 {pagination.page || 1} 页 / 共 {pagination.pages || 1} 页</span>
                    <button 
                        onClick={() => fetchUsers((pagination.page || 1) + 1)} 
                        disabled={(pagination.page || 1) >= (pagination.pages || 1)}
                    >
                        下一页
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;
