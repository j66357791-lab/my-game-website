import api from '../config/api';

// 获取仪表盘数据
export const getDashboardData = () => api.get('/admin/dashboard');

// 获取用户列表
export const getUsers = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/users?${query}`);
};

// 🔧 新增：更新用户信息
export const updateUser = (userId, userData) => api.put(`/admin/users/${userId}`, userData);

// 🔧 新增：修改用户密码
export const updateUserPassword = (userId, newPassword) => 
    api.put(`/admin/users/${userId}/password`, { newPassword });

// 🔧 新增：切换用户状态
export const toggleUserStatus = (userId) => 
    api.put(`/admin/users/${userId}/toggle-status`);

// 删除用户
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);

// 调整用户积分
export const adjustUserPoints = (userId, amount, description) => 
    api.post('/admin/points/adjust', { userId, amount, description });

// 🔧 新增：调整用户余额
export const adjustUserCash = (userId, amount, description) => 
    api.post('/admin/cash/adjust', { userId, amount, description });

// 获取交易记录
export const getTransactions = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/transactions?${query}`);
};

// 🔧 新增：获取提现申请
export const getWithdrawals = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/withdrawals?${query}`);
};

// 🔧 新增：处理提现申请
export const processWithdrawal = (withdrawalId, action, remark) => 
    api.put(`/admin/withdrawals/${withdrawalId}/process`, { action, remark });

// 🔧 新增：批量处理提现申请
export const batchProcessWithdrawals = (withdrawalIds, action, remark) => 
    api.post('/admin/withdrawals/batch-process', { withdrawalIds, action, remark });

// 获取分析数据
export const getAnalytics = (period) => api.get(`/admin/analytics?period=${period}`);
