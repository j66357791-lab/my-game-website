import api from '../config/api';

const blindBoxService = {
  // 获取活动数据
  getActivityData: async () => {
    try {
      const response = await api.get('/blindBox/activity');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 单抽
  singleDraw: async () => {
    try {
      const response = await api.post('/blindBox/single-draw');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 十连抽
  tenDraw: async () => {
    try {
      const response = await api.post('/blindBox/ten-draw');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 兑换奖励
  exchangeReward: async (chars) => {
    try {
      const response = await api.post('/blindBox/exchange', { chars });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // 获取兑换记录
  getExchangeHistory: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/blindBox/exchange-history?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default blindBoxService;
