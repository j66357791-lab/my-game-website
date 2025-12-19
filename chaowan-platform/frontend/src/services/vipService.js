import { api } from '../config/api';

export const vipService = {
  // 购买VIP卡
  purchaseVipCard: async (type, token) => {
    const response = await api.post('/vip-cards/purchase', 
      { type }, 
      { headers: { Authorization: `Bearer ${token}` }}
    );
    return response.data;
  },

  // 获取VIP状态
  getVipStatus: async (token) => {
    const response = await api.get('/vip-cards/status', {
      headers: { Authorization: `Bearer ${token}` }}
    );
    return response.data;
  },

  // 领取每日星源币
  claimDailyStarcoin: async (token) => {
    const response = await api.post('/vip-cards/claim-daily-starcoin', 
      {}, 
      { headers: { Authorization: `Bearer ${token}` }}
    );
    return response.data;
  }
};
