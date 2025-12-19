import { api } from '../config/api';

export const bossService = {
  // 获取Boss状态
  getBossStatus: async (token) => {
    const response = await api.get('/boss/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 挑战Boss
  challengeBoss: async (bossId, token) => {
    const response = await api.post('/boss/challenge', 
      { bossId }, 
      { headers: { Authorization: `Bearer ${token}` }}
    );
    return response.data;
  },

  // 攻击Boss
  attackBoss: async (bossId, damage, token) => {
    const response = await api.post('/boss/attack', 
      { bossId, damage }, 
      { headers: { Authorization: `Bearer ${token}` }}
    );
    return response.data;
  }
};
