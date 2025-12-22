// frontend/src/services/userService.js - 完整正确版
import { api } from '../config/api';

export const userService = {
  // 获取用户完整数据 - api自动处理token
  getUserData: async () => {
    try {
      const response = await api.getUser();
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 更新用户星源币 - api自动处理token
  updateStarcoin: async (starcoin) => {
    try {
      const response = await api.post('/user/update-starcoin', { starcoin });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取积分历史 - api自动处理token
  getPointsHistory: async () => {
    try {
      const response = await api.get('/points/history');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 更新用户等级 - api自动处理token
  updateLevel: async (level, experience) => {
    try {
      const response = await api.post('/user/update-level', { level, experience });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
