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
  },

  // 派遣娃娃出战
  deployDoll: async (dollId) => {
    try {
      const response = await api.post('/dolls/deploy', { dollId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 召回娃娃
  recallDoll: async (dollId) => {
    try {
      const response = await api.post('/dolls/recall', { dollId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 合成娃娃
  synthesizeDoll: async (baseDollId, materialDollIds) => {
    try {
      const response = await api.post('/dolls/synthesize', {
        dollId: baseDollId,
        materialDollIds
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 幸运抽取
  luckyDraw: async (drawType) => {
    try {
      const response = await api.post('/dolls/lucky-draw', { drawType });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 领取今日收益
  claimDailyEarnings: async () => {
    try {
      const response = await api.post('/dolls/claim-daily-earnings');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
