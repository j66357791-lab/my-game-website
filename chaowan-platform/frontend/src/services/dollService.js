// frontend/src/services/dollService.js - 新玩法重构版
import { api } from '../config/api';

export const dollService = {
  // 抽取娃娃
  drawDoll: async (token) => {
    const response = await api.post('/dolls/draw', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 获取背包中的娃娃 (空闲状态)
  getDollInventory: async (token) => {
    const response = await api.get('/dolls/inventory', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 获取出战位的娃娃
  getDeploymentSlots: async (token) => {
    const response = await api.get('/dolls/deployment', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 派遣娃娃出战
  deployDoll: async (dollId, token) => {
    const response = await api.post('/dolls/deploy', { dollId }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 召回娃娃
  recallDoll: async (dollId, token) => {
    const response = await api.post('/dolls/recall', { dollId }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 合成娃娃
  synthesizeDoll: async (baseDollId, materialDollIds, token) => {
    const response = await api.post('/dolls/synthesize', { baseDollId, materialDollIds }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
