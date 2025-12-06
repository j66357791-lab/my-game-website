// frontend/src/pages/admin/AdminUsersPage.js
import React, { useState, useEffect } from 'react';
import { getUsers, adjustUserPoints } from '../../services/adminService';
import './AdminPage.css'; // 建议创建一个通用的管理员页面样式

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
        try {
            const res = await getUsers({ page, limit: 10 });
            setUsers(res.data.data.users);
            setPagination(res.data.data.pagination);
        } catch (err) {
            setError('获取用户列表失败');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustPoints = async (userId, currentPoints) => {
        const amount = prompt(`当前积分: ${currentPoints}\n请输入要调整的积分数量（正数为增加，负数为扣除）:`);
        if (amount === null || isNaN(amount)) return;

        const description = prompt('请输入调整原因（可选）:') || '管理员手动调整';

        try {
            await adjustUserPoints(userId, parseInt(amount, 10), description);
            alert('积分调整成功！');
            fetchUsers(pagination.page); // 刷新当前页
        } catch (err) {
            alert('积分调整失败');
            console.error(err);
        }
    };

    if (loading) return <div>加载中...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="admin-page-container">
            <h1>用户管理</h1>
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
                                <button onClick={() => handleAdjustPoints(user._id, user.points)}>
                                    调整积分
                                </button>
                                {/* 后续可以添加编辑、删除按钮 */}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* 分页控件 */}
            <div className="pagination-controls">
                <button 
                    onClick={() => fetchUsers(pagination.page - 1)} 
                    disabled={pagination.page <= 1}
                >
                    上一页
                </button>
                <span>第 {pagination.page} 页 / 共 {pagination.pages} 页</span>
                <button 
                    onClick={() => fetchUsers(pagination.page + 1)} 
                    disabled={pagination.page >= pagination.pages}
                >
                    下一页
                </button>
            </div>
        </div>
    );
};

export default AdminUsersPage;
