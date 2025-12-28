import api from '../config/api';

const blindBoxService = {
  getActivityData: async () => {
    try {
      const response = await api.get('/blindBox/activity');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  singleDraw: async () => {
    try {
      const response = await api.post('/blindBox/single-draw');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  tenDraw: async () => {
    try {
      const response = await api.post('/blindBox/ten-draw');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  exchangeReward: async (chars) => {
    try {
      const response = await api.post('/blindBox/exchange', { chars });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

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
