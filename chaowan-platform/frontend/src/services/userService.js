// frontend/src/services/userService.js
import { api } from '../config/api';

export const userService = {
  // 🔧 保留并修正：获取用户完整数据
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

  // --- 新玩法核心API ---

  // 购买VIP卡
  purchaseVipCard: async (cardType, token) => {
    try {
      const response = await api.post('/vip/purchase',
        { type: cardType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 领取每日VIP奖励
  claimDailyVipReward: async (token) => {
    try {
      const response = await api.post('/vip/claim',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 抽取娃娃
  drawDoll: async (token) => {
    try {
      const response = await api.post('/dolls/draw',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取用户背包中的娃娃
  getDollInventory: async (token) => {
    try {
      const response = await api.get('/dolls/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // --- 保留的辅助API (可能仍需要) ---

  // 获取用户交易记录
  getTransactions: async (type = 'all', token) => {
    try {
      const response = await api.get(`/transactions/history${type !== 'all' ? `?type=${type}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取提现记录
  getWithdrawHistory: async (token) => {
    try {
      const response = await api.get('/withdrawal/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
