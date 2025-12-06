// frontend/src/services/adminService.js
import api from '../config/api';

// 获取仪表盘数据
export const getDashboardData = () => api.get('/admin/dashboard');

// 👇 关键：导出名为 getUsers (不是 getAllUsers)
export const getUsers = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/users?${query}`);
};

// 编辑用户信息
export const updateUser = (userId, userData) => api.put(`/admin/users/${userId}`, userData);

// 删除用户
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);

// 调整用户积分
export const adjustUserPoints = (userId, amount, description) => 
    api.post('/admin/points/adjust', { userId, amount, description });

// 获取交易记录
export const getTransactions = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/transactions?${query}`);
};

// 🌟 关键修复：确保这个函数被正确导出
export const getAnalytics = (period) => api.get(`/admin/analytics?period=${period}`);