// src/services/dollService.js
import { api } from '../config/api';

export const dollService = {
  // 获取我的娃娃
  getMyDolls: async (token) => {
    try {
      const response = await api.get('/dolls/my-dolls', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 购买娃娃
  purchaseDoll: async (dollId, token) => {
    try {
      const response = await api.post('/dolls/purchase', 
        { dollId }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 回收娃娃
  recycleDoll: async (dollId, token) => {
    try {
      const response = await api.post('/dolls/recycle', 
        { dollId }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 更新娃娃状态
  updateDollStatus: async (dollId, status, token) => {
    try {
      const response = await api.post('/dolls/update-status', 
        { dollId, status }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
