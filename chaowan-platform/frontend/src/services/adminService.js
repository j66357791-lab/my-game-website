// frontend/src/services/adminService.js

import api from '../config/api'; // 假设你有一个配置好的axios实例

// 获取所有用户
export const getAllUsers = () => {
    return api.get('/admin/users');
};

// 更新用户积分
export const updateUserPoints = (userId, points) => {
    return api.put(`/admin/users/${userId}/points`, { points });
};

// 获取用户娃娃
export const getUserDolls = (userId) => {
    return api.get(`/admin/users/${userId}/dolls`);
};
