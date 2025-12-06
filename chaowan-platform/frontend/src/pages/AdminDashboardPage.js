// frontend/src/pages/AdminDashboardPage.js

import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUserPoints } from '../services/adminService';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await getAllUsers();
                setUsers(res.data);
            } catch (err) {
                setError('获取用户数据失败，请检查权限或网络');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handlePointsChange = async (userId, newPoints) => {
        if (window.confirm(`确定要将该用户积分修改为 ${newPoints} 吗？`)) {
            try {
                await updateUserPoints(userId, Number(newPoints));
                alert('积分修改成功！');
                // 重新获取用户列表以刷新显示
                const res = await getAllUsers();
                setUsers(res.data);
            } catch (err) {
                alert('积分修改失败');
                console.error(err);
            }
        }
    };

    if (loading) return <div>加载中...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="admin-dashboard" style={{ padding: '20px' }}>
            <h1>管理员仪表盘</h1>
            <h2>用户管理</h2>
            <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>用户名</th>
                        <th>邮箱</th>
                        <th>等级</th>
                        <th>当前积分</th>
                        <th>经验值</th>
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
                            <td>{user.experience}</td>
                            <td>
                                <input
                                    type="number"
                                    defaultValue={user.points}
                                    id={`points-${user._id}`}
                                    style={{ width: '80px', marginRight: '10px' }}
                                />
                                <button
                                    onClick={() => {
                                        const input = document.getElementById(`points-${user._id}`);
                                        handlePointsChange(user._id, input.value);
                                    }}
                                >
                                    修改积分
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminDashboardPage;
