// frontend/src/services/bossService.js - 完整修复版本
import { api } from '../config/api';

export const bossService = {
  // 获取Boss状态 - api自动处理token
  getBossStatus: async () => {
    try {
      const response = await api.get('/boss/status');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 挑战Boss - api自动处理token
  challengeBoss: async (bossId) => {
    try {
      const response = await api.post('/boss/challenge', { bossId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 攻击Boss - api自动处理token
  attackBoss: async (bossId, damage) => {
    try {
      const response = await api.post('/boss/attack', { bossId, damage });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
