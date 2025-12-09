// src/services/userService.js
import { api } from '../config/api';

export const userService = {
  // 获取用户完整数据
  getUserData: async (token) => {
    try {
      const response = await api.get('/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 更新用户积分
  updatePoints: async (points, token) => {
    try {
      const response = await api.post('/user/update-points', 
        { points }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取积分历史
  getPointsHistory: async (token) => {
    try {
      const response = await api.get('/user/points-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 更新用户等级
  updateLevel: async (level, experience, token) => {
    try {
      const response = await api.post('/user/update-level', 
        { level, experience }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
