// frontend/src/services/vipService.js - 完整修复版本
import { api } from '../config/api';

export const vipService = {
  // 购买VIP卡 - api自动处理token
  purchaseVipCard: async (type) => {
    const response = await api.post('/vip-cards/purchase', { type });
    return response.data;
  },

  // 获取VIP状态 - api自动处理token
  getVipStatus: async () => {
    const response = await api.get('/vip-cards/status');
    return response.data;
  },

  // 领取每日星源币 - api自动处理token
  claimDailyStarcoin: async () => {
    const response = await api.post('/vip-cards/claim-daily-starcoin', {});
    return response.data;
  }
};
