// frontend/src/services/dollService.js - 完整正确版
import { api } from '../config/api';

export const dollService = {
  // 获取我的娃娃 - api自动处理token
  getMyDolls: async () => {
    try {
      const response = await api.get('/dolls/user-dolls');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 购买娃娃 - api自动处理token
  purchaseDoll: async (dollId) => {
    try {
      const response = await api.post('/dolls/purchase', { dollId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 回收娃娃 - api自动处理token
  recycleDoll: async (dollId) => {
    try {
      const response = await api.delete(`/dolls/recycle/${dollId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
