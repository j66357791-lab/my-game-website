// src/services/userService.js
import { api } from '../config/api';

export const userService = {
  // 获取用户完整数据
  getUserData: async (token) => {
    try {
      const response = await api.get('/auth/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 更新用户星源币
  updateStarcoin: async (starcoin, token) => {
    try {
      const response = await api.post('/user/update-starcoin', 
        { starcoin }, 
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
      const response = await api.get('/points/history', {
        headers: { Authorization: `Bearer ${token}` }}
      );
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
